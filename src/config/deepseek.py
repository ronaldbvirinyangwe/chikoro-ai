import requests
import json
import re
import time
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

# --- CONFIGURATION ---
OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL_NAME = "chikoro-ai"

# --- NEW: TOOL IMPLEMENTATIONS ---

def search(query: str, max_results: int = 5) -> list[dict]:
    """
    Performs a web search using DuckDuckGo Lite to get a list of URLs.
    This is equivalent to the JavaScript duckduckgoSearch function.
    
    Args:
        query: The search query.
        max_results: The maximum number of results to return.
        
    Returns:
        A list of dictionaries, where each dictionary contains 'title' and 'url'.
    """
    search_url = f"https://lite.duckduckgo.com/lite?q={requests.utils.quote(query)}"
    print(f"🛠️  [TOOL] Searching for: {query}")
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'}
    
    try:
        response = requests.get(search_url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        results = []
        
        # Find the tables containing results. This is specific to lite.duckduckgo.com's structure.
        results_tables = soup.find_all('table')[2:] # The first two tables are for navigation/header

        for table in results_tables:
            for row in table.find_all('tr'):
                if len(results) >= max_results:
                    break
                
                link = row.find('a')
                if link and link.get('href'):
                    raw_url = link.get('href')
                    # Decode the URL from the 'uddg' parameter
                    decoded_url_match = re.search(r'uddg=([^&]+)', raw_url)
                    if decoded_url_match:
                        final_url = requests.utils.unquote(decoded_url_match.group(1))
                        if not final_url.startswith('https://duckduckgo.com'):
                            results.append({
                                "title": link.text.strip(),
                                "url": final_url
                            })
            if len(results) >= max_results:
                break

        print(f"✅  [TOOL] Found {len(results)} search results.")
        return results

    except requests.exceptions.RequestException as e:
        print(f"❌  [TOOL] Error fetching search results: {e}")
        return []

def scrape_and_read(url: str) -> str:
    """
    Scrapes a webpage using Playwright (Python's equivalent to Puppeteer) 
    to handle JavaScript-rendered sites and returns cleaned text content.
    
    Args:
        url: The URL to scrape.
        
    Returns:
        The cleaned text content of the page, or an error message.
    """
    print(f"🛠️  [TOOL] Scraping URL with Playwright: {url}")
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36')
            
            # Navigate to the URL, waiting for the page to be fully loaded.
            page.goto(url, wait_until='networkidle', timeout=30000)
            
            html = page.content()
            browser.close()

            # Use BeautifulSoup to parse and clean the HTML
            soup = BeautifulSoup(html, 'html.parser')
            
            # Remove irrelevant tags
            for element in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'form', '[aria-hidden="true"]']):
                element.decompose()
                
            body_text = soup.body.get_text(separator='\n', strip=True)
            cleaned_text = re.sub(r'\s{2,}', ' ', body_text) # Replace multiple spaces/newlines with a single space
            
            # Truncate to a reasonable length for the model
            max_length = 8000
            final_text = cleaned_text[:max_length] + "..." if len(cleaned_text) > max_length else cleaned_text
            print(f"✅  [TOOL] Scraped content successfully (length: {len(final_text)}).")
            return final_text

    except PlaywrightTimeoutError:
        error_msg = f"Failed to retrieve content from the URL due to a timeout. The page may be too slow or complex."
        print(f"❌  [TOOL] {error_msg}")
        return error_msg
    except Exception as e:
        error_msg = f"Failed to retrieve content. It may be protected or require a CAPTCHA. Error: {e}"
        print(f"❌  [TOOL] Error scraping URL {url}: {e}")
        return error_msg

# A dictionary to map tool names to their functions
AVAILABLE_TOOLS = {
    "search": search,
    "scrape_and_read": scrape_and_read
}

# --- AGENT LOGIC ---

def query_model(messages):
    """Sends the message history to the Ollama model and gets a response."""
    print("🤔 Querying model...")
    try:
        response = requests.post(OLLAMA_URL, json={
            "model": MODEL_NAME,
            "stream": False,
            "messages": messages
        })
        response.raise_for_status()
        data = response.json()
        return data.get("message", {}).get("content", "Error: Empty response from model.")
    except Exception as e:
        print(f"❌ Error connecting to Ollama: {e}")
        return f"Error: Could not connect to Ollama at {OLLAMA_URL}."

def parse_tool_call(response: str) -> tuple[str | None, dict | None]:
    """Parses a tool call from the model's response using regex."""
    json_match = re.search(r'\{.*"tool_call".*\}', response, re.DOTALL)
    if not json_match:
        return None, None
    
    try:
        data = json.loads(json_match.group(0))
        if "tool_call" in data:
            tool_name = data["tool_call"].get("name")
            tool_args = data["tool_call"].get("args", {})
            print(f"✅  [TOOL CALL DETECTED] Name: {tool_name}, Args: {tool_args}")
            return tool_name, tool_args
    except json.JSONDecodeError:
        return None, None
    return None, None

def run_agent():
    """Initializes and runs the main agent loop."""
    system_prompt = (
        "You are a helpful research assistant. Your goal is to answer user questions accurately by searching the web.\n\n"
        "You have access to the following tools:\n"
        "1. `search(query: str)`: Searches the web and returns a list of pages with titles and URLs.\n"
        "2. `scrape_and_read(url: str)`: Reads the full text content of a given URL.\n\n"
        "Here is your workflow:\n"
        "1. The user will ask a question. First, use the `search` tool to find relevant web pages.\n"
        "2. Review the search results. Choose the most promising URL to investigate further.\n"
        "3. Use the `scrape_and_read` tool with that URL to get the page content.\n"
        "4. Finally, answer the user's question based on the information you have gathered.\n\n"
        "To call a tool, you MUST output ONLY a JSON object in this exact format:\n"
        '{"tool_call": {"name": "tool_name", "args": {"arg_name": "value"}}}\n'
    )
    
    messages = [{"role": "system", "content": system_prompt}]
    
    user_input = input("User: ")
    messages.append({"role": "user", "content": user_input})

    while True:
        model_response = query_model(messages)
        print(f"\n🤖 Model:\n{model_response}\n")
        
        tool_name, tool_args = parse_tool_call(model_response)
        
        if tool_name and tool_name in AVAILABLE_TOOLS:
            messages.append({"role": "assistant", "content": model_response})
            
            tool_function = AVAILABLE_TOOLS[tool_name]
            # Ensure args are passed as a dictionary
            result = tool_function(**tool_args) 
            
            # Format the result nicely for the model
            tool_result_content = json.dumps({"tool_result": result}, indent=2)
            messages.append({"role": "user", "content": tool_result_content})
        else:
            # If no tool is called, the response is the final answer.
            break

if __name__ == "__main__":
    print("Upgraded Python Agent Initialized.")
    print("NOTE: The first time you run `scrape_and_read`, Playwright will download necessary browser files. This may take a moment.")
    run_agent()
