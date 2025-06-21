import React, { createContext, useState, useEffect, useRef, useCallback } from "react";
import hljs from 'highlight.js';
import katex from 'katex';
import 'katex/dist/katex.min.css';
// Assuming these are your helper functions for specific backend interactions
import { handlePDFRequest } from "../config/pdfparse"; 
import { updateConversationHistory, fetchHistory, analyzeMathDrawing } from "../config/image_understand"; 

// --- highlight.js Configuration ---
hljs.configure({
  languages: ['javascript', 'python', 'java', 'c', 'cpp', 'sql', 'bash', 'json', 'typescript', 'html', 'css'],
  ignoreUnescapedHTMLa: true
});

// --- Style Injection ---
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
      word-break: break-word;
      white-space: pre-wrap;
    }
    pre code.hljs {
      padding: 1.5rem; border-radius: 8px; background: #1e1e1e !important; color: #d4d4d4;
      tab-size: 2; margin: 1.5rem 0; font-family: 'Fira Code', monospace; font-size: 1em;
      overflow-x: auto; display: block; min-height: 3rem; max-width: 100%; white-space: pre-wrap;
      word-wrap: break-word; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #333;
    }
    @media (max-width: 768px) {
      pre code.hljs { padding: 1.2rem; font-size: 0.9em; white-space: pre-wrap; word-break: break-word; }
      .ai-response { padding: 0; }
      .message{ padding: 2px; }
      .bot-message{ margin: 0; }
    }
    code:not(pre code) {
      padding: 0.2em 0.4em; border-radius: 3px; font-family: 'Fira Code', monospace; white-space: nowrap;
      overflow-x: auto; display: inline-block; vertical-align: middle;
    }
    .code-container { position: relative; margin: 1.5rem 0; scrollbar-width: thin; scrollbar-color: #4a4a4a #1e1e1e; }
    .code-container::-webkit-scrollbar { height: 8px; }
    .code-container::-webkit-scrollbar-track { background: #1e1e1e; border-radius: 0 0 8px 8px; }
    .code-container::-webkit-scrollbar-thumb { background: #4a4a4a; border-radius: 4px; }
    .code-container pre { margin: 0; }
    .copy-button { position: absolute; top: 0.5rem; right: 0.5rem; background: #333; color: white; border: none; padding: 0.3rem 0.6rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem; z-index: 10; transition: background 0.2s ease; }
    .copy-button:hover { background: #555; }
    table { border-collapse: collapse; margin: 1.5rem 0; width: 100%; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; }
    th, td { padding: 1rem; text-align: left; vertical-align: top; }
    th { font-weight: 600; }
    .katex { font-size: 1.1em; padding: 0 0.3em; }
    .katex-display { margin: 1.5rem 0; padding: 1.2rem; border-radius: 6px; overflow-x: auto; text-align: center; }
    ul, ol { margin: 1.2rem 0; padding-left: 2.5rem; }
    li { margin: 0.7rem 0; line-height: 1.5; }
    img { max-width: 100%; height: auto; border-radius: 6px; margin: 1.2rem 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    blockquote { border-left: 4px solid #2ecc71; margin: 1.5rem 0; padding: 1rem 1.5rem; border-radius: 0 4px 4px 0; }
    .bold-text { font-weight: 600; margin: 0.5rem 0; }
    @media (max-width: 768px) {
      table { display: block; overflow-x: auto; white-space: nowrap; -webkit-overflow-scrolling: touch; }
    }
    `;
    document.head.appendChild(style);
};

// --- Context Creation ---
export const Context = createContext();

// --- Centralized API Helper ---
async function streamChatCompletion(payload, onChunk, onDone, onError) {
    try {
        const token = localStorage.getItem('accessToken'); // Ensure this matches your login logic ('authToken' or 'accessToken')
        const response = await fetch('/api/v1/chat/conversation', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            if (response.status === 403 || response.status === 401) {
                console.error("Authentication failed. Redirecting to login.");
                localStorage.removeItem('authToken');
                window.location.href = '/login'; 
                throw new Error("Authentication failed. Redirecting to login.");
            }
            const errorData = await response.json().catch(() => ({error: "An unknown server error occurred."}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
            for (const line of lines) {
                const jsonStr = line.replace(/^data: /, '');
                try {
                    const parsed = JSON.parse(jsonStr);
                    if (parsed.event === 'done') {
                        if (onDone) onDone();
                        return;
                    }
                    if (parsed.text) { onChunk(parsed.text); }
                } catch (e) { console.warn("Could not parse stream chunk:", jsonStr); }
            }
        }
        if (onDone) onDone();
    } catch (error) {
        console.error("Streaming API call failed:", error);
        if (onError) onError(error.message);
    }
}

// --- Context Provider Component ---
const ContextProvider = (props) => {
    // --- State Definitions ---
    const [input, setInput] = useState("");
    const [recentPrompt, setRecentPrompt] = useState("");
    const [showResult, setShowResult] = useState(false);
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [whiteboardDrawing, setWhiteboardDrawing] = useState(null);
    const [error, setError] = useState(null);
    const [showWhiteboard, setShowWhiteboard] = useState(false);
    const [selectedSubject, _setSelectedSubject] = useState(localStorage.getItem('selectedSubject') || "");
    const [chatHistory, setChatHistory] = useState([]);
    const chatContainerRef = useRef(null);

    const setSelectedSubject = (subject) => {
        localStorage.setItem('selectedSubject', subject);
        _setSelectedSubject(subject);
    };

    useEffect(() => { 
        injectStyles(); 
        window.copyToClipboard = (button) => {
            const codeContainer = button.closest('.code-container');
            if (codeContainer) {
                const codeElement = codeContainer.querySelector('code');
                if (codeElement) {
                    navigator.clipboard.writeText(codeElement.textContent)
                        .then(() => {
                            button.textContent = 'Copied!';
                            setTimeout(() => { button.textContent = 'Copy'; }, 2000);
                        });
                }
            }
        };
    }, []);

    const safeStringReplace = useCallback((str, regex, replacement) => {
        try {
            if (typeof str !== "string") return str;
            return str.replace(regex, replacement);
        } catch (e) {
            console.warn("Regex replacement error:", e, "Input string:", str);
            return str;
        }
    }, []);

    const processContent = useCallback((content) => {
        if (typeof content !== 'string') return '';
        let processed = content;
        
        const markdownReplacements = [
            [/^# (.*$)/gm, "<h1>$1</h1>"],
            [/^## (.*$)/gm, "<h2>$1</h2>"],
            [/^### (.*$)/gm, "<h3>$1</h3>"],
            [/\*\*(.*?)\*\*/g, "<strong>$1</strong>"],
            [/__(.*?)__/g, "<strong>$1</strong>"],
            [/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, "<em>$1</em>"],
            [/_(.*?)_/g, "<em>$1</em>"],
            [/~~(.*?)~~/g, "<del>$1</del>"],
            [/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1"/>'],
            [/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'],
            [/^>\s+(.*)/gm, (m, g1) => `<blockquote>${g1.replace(/^>\s*/gm, '')}</blockquote>`],
        ];

        processed = safeStringReplace(processed, /```(\w+)?\s*([\s\S]*?)```/gs, (_, lang, code) => `<div class="code-container"><button class="copy-button" onclick="copyToClipboard(this)">Copy</button><pre><code class="hljs ${lang || 'plaintext'}">${hljs.highlight(code.trim(), { language: lang || 'plaintext', ignoreIllegals: true }).value}</code></pre></div>`);
        
        markdownReplacements.forEach(([regex, replacement]) => {
            processed = safeStringReplace(processed, regex, replacement);
        });

        processed = safeStringReplace(processed, /(?:^|\n)((?:(?:[-*+]|\d+\.) [^\n]*(?:\n|$))+)/g, (match) => {
            const lines = match.trim().split('\n');
            if (lines.length === 0) return match;
            const isOrdered = /^\d+\./.test(lines[0].trim());
            let listHtml = isOrdered ? '<ol>' : '<ul>';
            lines.forEach(line => {
                const itemContent = line.replace(/^(?:[-*+]|\d+\.)\s*/, '').trim();
                if (itemContent) { listHtml += `<li>${itemContent}</li>`; }
            });
            listHtml += isOrdered ? '</ol>' : '</ul>';
            return listHtml;
        });

        try {
            processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => katex.renderToString(math.trim(), { displayMode: true, throwOnError: false, trust: true }));
            processed = processed.replace(/(?<!\\)\$([\s\S]*?)(?<!\\)\$/g, (_, math) => katex.renderToString(math.trim(), { displayMode: false, throwOnError: false, trust: true }));
        } catch (e) { console.warn("Katex rendering error", e); }

        return `<div class="ai-response">${processed}</div>`;
    }, [safeStringReplace]);

    useEffect(() => {
        if (selectedSubject) {
            setLoading(true);
            fetchHistory(selectedSubject)
                .then(historyItems => {
                    const formattedHistory = historyItems.map((item) => ({
                        id: item._id || `hist_${item.timestamp || Date.now()}_${Math.random()}`,
                        type: item.type === 'model' ? 'bot' : 'user',
                        rawText: item.message,
                        htmlText: item.type === 'model' ? processContent(item.message) : `<p>${item.message}</p>`,
                        timestamp: item.timestamp,
                    }));
                    setChatHistory(formattedHistory);
                    setShowResult(formattedHistory.length > 0);
                })
                .catch(err => setError(err.message || "Failed to load chat history."))
                .finally(() => setLoading(false));
        } else {
            setChatHistory([]);
            setShowResult(false);
        }
    }, [selectedSubject, processContent]);
    
    const onSent = async (prompt, fileAttachment, drawingAsDataUrl) => {
        if (!prompt?.trim() && !fileAttachment && !drawingAsDataUrl) {
            return;
        }
        
        setLoading(true);
        setError(null);
        setShowResult(true);

        let analysisResult = null;
        if (drawingAsDataUrl) {
            try {
                analysisResult = await analyzeMathDrawing(drawingAsDataUrl);
            } catch (err) {
                setError("Failed to analyze drawing.");
                setLoading(false);
                return;
            }
        }
        
        let userMessageText = analysisResult ? `[Drawing Analyzed] ${prompt}` : prompt;
        if(fileAttachment) userMessageText = `[File: ${fileAttachment.name}] ${prompt}`;
        
        const userMessage = {
            id: `user_${Date.now()}`,
            type: "user",
            rawText: userMessageText,
            timestamp: new Date().toISOString(),
            attachment: fileAttachment ? { url: URL.createObjectURL(fileAttachment), fileName: fileAttachment.name } : (drawingAsDataUrl ? { url: drawingAsDataUrl, fileName: "whiteboard.png" } : null)
        };

        const currentHistory = [...chatHistory, userMessage];
        setChatHistory(currentHistory);
        if (prompt) setRecentPrompt(prompt);
        
        let finalPromptForApi = analysisResult ? `Context from drawing analysis: "${analysisResult}". User's question: "${prompt}"` : prompt;
        
        try {
            if (fileAttachment && fileAttachment.type === 'application/pdf') {
                const historyForPdfApi = currentHistory.map(msg => ({ role: msg.type === 'bot' ? 'model' : 'user', parts: [{ text: msg.rawText }] }));
                const pdfResult = await handlePDFRequest(fileAttachment, prompt, historyForPdfApi);
                const botResponse = { id: `bot_${Date.now()}`, type: "bot", rawText: pdfResult.response, htmlText: processContent(pdfResult.response), timestamp: new Date().toISOString() };
                setChatHistory(prev => [...prev, botResponse]);
                await updateConversationHistory(selectedSubject, userMessage, pdfResult.response);
            } else {
                const payload = {
                    prompt: finalPromptForApi,
                    history: currentHistory.slice(-21, -1).map(m => ({type: m.type, rawText: m.rawText})),
                    curriculum: selectedSubject || "ZIMSEC"
                };

                const botMessageId = `bot_${Date.now()}`;
                setChatHistory(prev => [...prev, { id: botMessageId, type: "bot", rawText: "", htmlText: "", isTyping: true }]);
                
                let accumulatedRawText = "";
                await streamChatCompletion(payload,
                    (chunk) => { // onChunk
                        accumulatedRawText += chunk;
                        setChatHistory(prev => prev.map(msg => msg.id === botMessageId ? { ...msg, htmlText: processContent(accumulatedRawText) } : msg));
                    },
                    async () => { // onDone
                        setChatHistory(prev => prev.map(msg => msg.id === botMessageId ? { ...msg, isTyping: false, rawText: accumulatedRawText } : msg));
                        setTimeout(() => document.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el)), 50);
                        await updateConversationHistory(selectedSubject, userMessage, accumulatedRawText);
                    },
                    (errorMessage) => { // onError
                        setChatHistory(prev => prev.map(msg => msg.id === botMessageId ? { ...msg, isTyping: false, rawText: errorMessage, htmlText: `<div class="ai-response" style="color:red;">${errorMessage}</div>` } : msg));
                    }
                );
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const newChat = () => {
        setLoading(false);
        setShowResult(!!selectedSubject);
        setChatHistory([]);
        setRecentPrompt("");
        setInput("");
        setFile(null);
        setFilePreview(null);
        setWhiteboardDrawing(null);
        setError(null);
    };

    const contextValue = {
        input, setInput, recentPrompt, 
        // ✅ FIXED: Added setShowResult to the context value
        showResult, setShowResult, 
        loading, setLoading, file, setFile, filePreview, setFilePreview,
        whiteboardDrawing, setWhiteboardDrawing, chatHistory, setChatHistory, error, setError,
        selectedSubject, setSelectedSubject, showWhiteboard, setShowWhiteboard, chatContainerRef,
        onSent, newChat
    };

    return (
        <Context.Provider value={contextValue}>
            {props.children}
        </Context.Provider>
    );
};

export default ContextProvider;
