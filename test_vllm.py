from openai import OpenAI

# Point the client to your local vLLM server
client = OpenAI(
    base_url="http://localhost:8000/v1",
    api_key="not-needed"  # API key is not required for local server
)

# Create a chat completion request
chat_completion = client.chat.completions.create(
    model="llava-hf/llava-v1.6-mistral-7b-hf",
    messages=[
        {
            "role": "user",
            "content": "mwana wembudzi anonzi chii",
        }
    ],
    max_tokens=2000,
    temperature=0
)

# Print the result
print(chat_completion.choices[0].message.content)
