import { createContext, useState, useEffect, useRef } from "react";
import runMulti from "../config/image_understand";
import hljs from 'highlight.js';
import katex from 'katex';

hljs.configure({
  languages: ['javascript', 'python', 'java', 'c', 'cpp', 'sql', 'bash', 'json'],
  ignoreUnescapedHTML: true
});

// Global styles injection
const injectStyles = () => {
  const style = document.createElement('style');
  style.textContent = `
  .ai-response {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 
      'Open Sans', 'Helvetica Neue', sans-serif;
    line-height: 1.6;
    max-width: 100%;
    overflow-x: auto;
    padding: 1rem;
    color: #333;
  }

  pre code.hljs {
    padding: 1.5rem;
    border-radius: 8px;
    background: #1e1e1e !important;
    color: #d4d4d4;
    tab-size: 2;
    margin: 1.5rem 0;
    font-family: 'Fira Code', monospace;
    font-size: 1em;
    overflow-x: auto;
    display: block;
    min-height: 3rem;
    max-width: 100%;
    white-space: pre-wrap;
    word-wrap: break-word;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    border: 1px solid #333;
  }
  @media (max-width: 768px) {
    pre code.hljs {
      padding: 1.2rem;
      font-size: 0.9em;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .ai-response {
      padding: 0;
    }
    .message{
      padding: 2px;
    }
    .bot-message{
      margin: 0;
    }
  }
    code:not(pre code) {
      background: #f3f3f3;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: 'Fira Code', monospace;
    }
    .code-container {
      position: relative;
      margin: 1.5rem 0;
      scrollbar-width: thin;
      scrollbar-color: #4a4a4a #1e1e1e;
    }
    .code-container::-webkit-scrollbar {
      height: 8px;
    }
    
    .code-container::-webkit-scrollbar-track {
      background: #1e1e1e;
      border-radius: 0 0 8px 8px;
    }
    
    .code-container::-webkit-scrollbar-thumb {
      background: #4a4a4a;
      border-radius: 4px;
    }
    
    .code-container pre {
      margin: 0;
    }
    .copy-button {
      position: absolute;
      top: 0.5rem;
      left: 0.5rem;
      background: #333;
      color: white;
      border: none;
      padding: 0.3rem 0.6rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
      z-index: 10;
    }
    table {
      border-collapse: collapse;
      margin: 1.5rem 0;
      width: 100%;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      background: white;
    }
    th, td {
      padding: 1rem;
      border: 1px solid #e0e0e0;
      text-align: left;
      vertical-align: top;
    }
    th {
      background-color: #f8f9fa;
      font-weight: 600;
      color: #2c3e50;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .katex {
      font-size: 1.1em;
      padding: 0 0.3em;
    }
    .katex-display {
      margin: 1.5rem 0;
      padding: 1.2rem;
      background: #f8f9fa;
      border-radius: 6px;
      overflow-x: auto;
      text-align: center;
    }
    ul, ol {
      margin: 1.2rem 0;
      padding-left: 2.5rem;
    }
    li {
      margin: 0.7rem 0;
      line-height: 1.5;
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      margin: 1.2rem 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    blockquote {
      border-left: 4px solid #2ecc71;
      margin: 1.5rem 0;
      padding: 1rem 1.5rem;
      color: #34495e;
      background: #f8fff8;
      border-radius: 0 4px 4px 0;
    }
    .bold-text {
      font-weight: 600;
      color: #2c3e50;
      margin: 0.5rem 0;
    }
    @media (max-width: 768px) {
      table {
        display: block;
        overflow-x: auto;
        white-space: nowrap;
        -webkit-overflow-scrolling: touch;
      }
    }
  `;
  document.head.appendChild(style);
};

export const Context = createContext();

const ContextProvider = (props) => {
  const [input, setInput] = useState("");
  const [recentPrompt, setRecentPrompt] = useState("");
  const [prevPrompts, setPrevPrompts] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] = useState("");
  const [file, setFile] = useState(null);
  const [previousResponse, setPreviousResponse] = useState("");
  const [showWhiteboard, setShowWhiteboard] = useState(false); 
  
  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    injectStyles();
    hljs.highlightAll();
    window.addEventListener('resize', scrollToBottom);
    return () => window.removeEventListener('resize', scrollToBottom);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [resultData, loading, recentPrompt]);

  useEffect(() => {
    window.copyToClipboard = (button) => {
      const codeContainer = button.parentElement;
      const codeElement = codeContainer.querySelector('code');
      if (codeElement) {
        const text = codeElement.textContent;
        navigator.clipboard.writeText(text).then(() => {
          button.textContent = 'Copied!';
          setTimeout(() => {
            button.textContent = 'Copy';
          }, 2000);
        }).catch((err) => {
          console.error('Failed to copy:', err);
          button.textContent = 'Failed to copy';
        });
      }
    };
  }, []);

  const delayPara = (index, nextWord) => {
    setTimeout(() => {
      setResultData(prev => prev + nextWord);
    }, 75 * index);
  };

  const safeStringReplace = (str, regex, replacement) => {
    try {
      if (typeof str !== "string") return str;
      return str.replace(regex, replacement);
    } catch (e) {
      console.warn("Regex replacement error:", e);
      return str;
    }
  };

  const processContent = (content) => {
    let processed = content;
    
    // Convert markdown tables
    processed = processed.replace(/\|(.+)\|/g, (match) => {
      const rows = match.split('\n').filter(r => r.trim());
      return `<div class="table-container"><table>${
        rows.map(row => 
          `<tr>${
            row.split('|').map(cell => 
              cell.trim() ? `<td>${cell.trim()}</td>` : ''
            ).join('')
          }</tr>`
        ).join('')
      }</table></div>`;
    });
  
    // Convert code blocks with copy button
    processed = processed.replace(/```(\w+)?\s*([\s\S]*?)```/gs, (_, lang, code) => {
      const validLang = hljs.getLanguage(lang) ? lang : 'plaintext';
      const highlighted = hljs.highlight(code.trim(), { language: validLang }).value;
      return `<div class="code-container">
                <button class="copy-button" onclick="copyToClipboard(this)" title="Copy code to clipboard">Copy</button>
                <pre><code class="hljs ${validLang}">${highlighted}</code></pre>
              </div>`;
    });
  
    // Convert math equations
    processed = processed
      .replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => 
        katex.renderToString(math.trim(), { displayMode: true }))
      .replace(/\$([\s\S]*?)\$/g, (_, math) => 
        katex.renderToString(math.trim(), { displayMode: false }));
  
    // Convert markdown elements
    const markdownReplacements = [
      [/^# (.*$)/gm, "<h1>$1</h1>"],
      [/^## (.*$)/gm, "<h2>$1</h2>"],
      [/^### (.*$)/gm, "<h3>$1</h3>"],
      [/\*\*(.*?)\*\*/g, "<strong>$1</strong>"],
      [/\*(.*?)\*/g, "<em>$1</em>"],
      [/~~(.*?)~~/g, "<del>$1</del>"],
      [/^-\s+(.*)/gm, "<li>$1</li>"],
      [/(<li>.*<\/li>)/gs, "<ul>$1</ul>"],
      [/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>'],
      [/!\[([^\]]+)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />'],
      [/^>\s+(.*)/gm, "<blockquote>$1</blockquote>"],
      [/:(\w+):/g, (match) => emojiMap[match] || match]
    ];

    processed = processed.replace(/(\|.*\|)(\n\|.*\|)+/g, (match) => {
      const rows = match.split('\n').filter(r => r.trim());
      return `<div class="table-container"><table>${
        rows.map(row => `<tr>${
          row.split('|').slice(1, -1).map(cell => 
            `<td>${cell.trim()}</td>`
          ).join('')
        }</tr>`).join('')
      }</table></div>`;
    });
    
    markdownReplacements.forEach(([regex, replacement]) => {
      processed = processed.replace(regex, replacement);
    });
  
    return `<div class="ai-response">${processed}</div>`;
  };

  const onSent = async (prompt, file = null) => {
    try {
      const finalPrompt = prompt?.trim() || input?.trim();
      if (!finalPrompt) {
        console.error("Empty prompt");
        setLoading(false);
        return;
      }

      setResultData("");
      setLoading(true);
      setShowResult(true);
      setRecentPrompt(finalPrompt);

      let apiResponse = "";
      try {
        apiResponse = file
          ? await runMulti(finalPrompt, file)
          : await runMulti(finalPrompt);
      } catch (apiError) {
        console.error("API call failed:", apiError);
        apiResponse = "Sorry, I encountered an error processing your request.";
      }

      const responseText = typeof apiResponse === "string" 
        ? apiResponse 
        : JSON.stringify(apiResponse, null, 2);

      const processedContent = processContent(responseText);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = processedContent;
      const textContent = tempDiv.textContent || "";

      const words = [];
      let currentWord = "";
      let inTag = false;

      for (let char of processedContent) {
        if (char === '<') inTag = true;
        if (char === '>') {
          inTag = false;
          currentWord += char;
          words.push(currentWord);
          currentWord = "";
          continue;
        }

        if (inTag) {
          currentWord += char;
        } else {
          if (char === ' ' || char === '\n') {
            if (currentWord.length > 0) {
              words.push(currentWord);
              currentWord = "";
            }
            words.push(char === ' ' ? ' ' : '<br>');
          } else {
            currentWord += char;
          }
        }
      }

      if (currentWord.length > 0) words.push(currentWord);

      let currentContent = "";
      words.forEach((word, index) => {
        setTimeout(() => {
          currentContent += word;
          setResultData(currentContent);
        }, 35 * index);
      });

      setLoading(false);
      setPrevPrompts(prev => [...prev, finalPrompt]);
      setInput("");
      setPreviousResponse(responseText); 

    } catch (error) {
      console.error("Error in onSent:", error);
      setLoading(false);
      setResultData("An error occurred while processing your request.");
    }
  };

  const contextValue = {
    prevPrompts,
    setPrevPrompts,
    onSent,
    setRecentPrompt,
    recentPrompt,
    showResult,
    loading,
    resultData,
    input,
    setInput,
    newChat: () => {
      setLoading(false);
      setShowResult(false);
      setPreviousResponse("");
    },
    file,
    setFile,
    previousResponse,
    chatContainerRef,
    showWhiteboard,
    setShowWhiteboard
  };

  return (
    <Context.Provider value={contextValue}>
      {props.children}
    </Context.Provider>
  );
};

export default ContextProvider;