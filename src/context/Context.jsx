import React, { createContext, useState, useEffect, useRef, useCallback } from "react";
import runMulti, { updateConversationHistory, fetchHistory } from "../config/image_understand";
import hljs from 'highlight.js';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { handlePDFRequest } from "../config/pdfparse";

// --- highlight.js Configuration ---
hljs.configure({
  languages: ['javascript', 'python', 'java', 'c', 'cpp', 'sql', 'bash', 'json', 'typescript', 'html', 'css'],
  ignoreUnescapedHTML: true
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
    /* color: #333; Dark mode adjustment might be needed here or via CSS variables */
    word-break: break-word;
    white-space: pre-wrap;
  }

  pre code.hljs {
    padding: 1.5rem;
    border-radius: 8px;
    background: #1e1e1e !important; /* Ensure this background is desired for light mode too, or use theme variables */
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
    border: 1px solid #333; /* Consider theming for border color */
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
      /* background: #f3f3f3; Consider theming */
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: 'Fira Code', monospace;
      white-space: nowrap;
      overflow-x: auto;
      display: inline-block;
      vertical-align: middle;
    }
    .code-container {
      position: relative;
      margin: 1.5rem 0;
      scrollbar-width: thin;
      scrollbar-color: #4a4a4a #1e1e1e; /* Consider theming */
    }
    .code-container::-webkit-scrollbar {
      height: 8px;
    }

    .code-container::-webkit-scrollbar-track {
      background: #1e1e1e; /* Consider theming */
      border-radius: 0 0 8px 8px;
    }

    .code-container::-webkit-scrollbar-thumb {
      background: #4a4a4a; /* Consider theming */
      border-radius: 4px;
    }

    .code-container pre {
      margin: 0;
    }
    .copy-button {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      background: #333; /* Consider theming */
      color: white;
      border: none;
      padding: 0.3rem 0.6rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
      z-index: 10;
      transition: background 0.2s ease;
    }
    .copy-button:hover {
        background: #555; /* Consider theming */
    }
    table {
      border-collapse: collapse;
      margin: 1.5rem 0;
      width: 100%;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      /* background: white; Consider theming */
      border-radius: 8px;
      overflow: hidden;
    }
    th, td {
      padding: 1rem;
      /* border: 1px solid #e0e0e0; Consider theming */
      text-align: left;
      vertical-align: top;
    }
    th {
      /* background-color: #f8f9fa; Consider theming */
      font-weight: 600;
      /* color: #2c3e50; Consider theming */
    }
    tr:nth-child(even) {
      /* background-color: #f9f9f9; Consider theming */
    }
    .katex {
      font-size: 1.1em;
      padding: 0 0.3em;
    }
    .katex-display {
      margin: 1.5rem 0;
      padding: 1.2rem;
      /* background: #f8f9fa; Consider theming */
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
    img { /* Already good for general use */
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      margin: 1.2rem 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    blockquote {
      /* border-left: 4px solid #2ecc71; Consider theming */
      margin: 1.5rem 0;
      padding: 1rem 1.5rem;
      /* color: #34495e; Consider theming */
      /* background: #f8fff8; Consider theming */
      border-radius: 0 4px 4px 0;
    }
    .bold-text {
      font-weight: 600;
      /* color: #2c3e50; Consider theming */
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

// --- Context Creation ---
export const Context = createContext();

// --- Context Provider Component ---
const ContextProvider = (props) => {
  // --- State Definitions ---
  const [input, setInput] = useState("");
  const [recentPrompt, setRecentPrompt] = useState("");
  const [prevPrompts, setPrevPrompts] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [whiteboardDrawing, setWhiteboardDrawing] = useState(null);
  const [error, setError] = useState(null);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [selectedSubject, _setSelectedSubject] = useState(localStorage.getItem('selectedSubject') || "");
  const [chatHistory, setChatHistory] = useState([]);
  const chatContainerRef = useRef(null);

  // --- Function to update Subject ---
  const setSelectedSubject = (subject) => {
    localStorage.setItem('selectedSubject', subject);
    _setSelectedSubject(subject);
  };

  // --- useEffect Hooks ---
  useEffect(() => {
    injectStyles();
  }, []);

  useEffect(() => {
    window.copyToClipboard = (button) => {
        const codeContainer = button.parentElement;
        const codeElement = codeContainer.querySelector('code');
        if (codeElement) {
            navigator.clipboard.writeText(codeElement.textContent)
                .then(() => {
                    button.textContent = 'Copied!';
                    setTimeout(() => { button.textContent = 'Copy'; }, 2000);
                })
                .catch(err => console.error('Failed to copy:', err));
        }
    };
  }, []);

  // --- Stable `emojiMap` (empty object, but stable reference) ---
  const emojiMap = useRef({}).current;

  // --- Memoized `safeStringReplace` (defined outside `processContent`) ---
  const safeStringReplace = useCallback((str, regex, replacement) => {
    try {
      if (typeof str !== "string") return str; // Return original if not a string
      return str.replace(regex, replacement);
    } catch (e) {
      console.warn("Regex replacement error:", e, "Input string:", str);
      return str; // Return original string on error
    }
  }, []);

  // --- Memoized `processContent` ---
  const processContent = useCallback((content) => {
    if (typeof content !== 'string') {
        console.warn("processContent received non-string input:", content);
        return ''; // Return empty string or some default for non-string content
    }
    let processed = content;

    // Table processing
    processed = safeStringReplace(processed, /\|(.+)\|(\n\|[\s:-]+\|)((\n\|.*\|)+)/g, (match) => {
        const lines = match.trim().split('\n');
        if (lines.length < 3) return match;
        let tableHtml = '<table>';
        const headerCells = lines[0].split('|').slice(1, -1).map(cell => cell.trim());
        if (headerCells.length > 0) {
            tableHtml += '<thead><tr>';
            headerCells.forEach(cell => { tableHtml += `<th>${cell}</th>`; });
            tableHtml += '</tr></thead>';
        }
        tableHtml += '<tbody>';
        lines.slice(2).forEach(rowStr => {
            const bodyCells = rowStr.split('|').slice(1, -1).map(cell => cell.trim());
            if (bodyCells.length > 0 && bodyCells.some(cell => cell)) {
                 tableHtml += '<tr>';
                 bodyCells.forEach(cell => { tableHtml += `<td>${cell}</td>`; });
                 tableHtml += '</tr>';
            }
        });
        tableHtml += '</tbody></table>';
        return `<div class="table-container">${tableHtml}</div>`;
    });

    // Code block processing
    processed = safeStringReplace(processed, /```(\w+)?\s*([\s\S]*?)```/gs, (_, lang, code) => {
        const validLang = hljs.getLanguage(lang) ? lang : 'plaintext';
        const highlighted = hljs.highlight(code.trim(), { language: validLang, ignoreIllegals: true }).value;
        return `<div class="code-container"><button class="copy-button" onclick="copyToClipboard(this)">Copy</button><pre><code class="hljs ${validLang}">${highlighted}</code></pre></div>`;
    });

    // KaTeX processing
    try {
        processed = safeStringReplace(processed, /\$\$([\s\S]*?)\$\$/g, (_, math) => katex.renderToString(math.trim(), { displayMode: true, throwOnError: false, trust: true }));
        processed = safeStringReplace(processed, /(?<!\\)\$([\s\S]*?)(?<!\\)\$/g, (_, math) => { // Avoid single $ within $$...$$ and escaped \$
            if (math.trim().startsWith('$') || math.trim().endsWith('$') || math.includes('$$')) {
                return `$${math}$`;
            }
            return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false, trust: true });
        });
    } catch (e) { console.warn("Katex rendering error", e); }

    // Markdown processing
    const markdownReplacements = [
      [/^# (.*$)/gm, "<h1>$1</h1>"],
      [/^## (.*$)/gm, "<h2>$1</h2>"],
      [/^### (.*$)/gm, "<h3>$1</h3>"],
      [/\*\*(.*?)\*\*/g, "<strong>$1</strong>"],
      [/__(.*?)__/g, "<strong>$1</strong>"],
      [/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, "<em>$1</em>"], // More precise italic to avoid conflict with bold
      [/_(.*?)_/g, "<em>$1</em>"],
      [/~~(.*?)~~/g, "<del>$1</del>"],
      [/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; border-radius: 6px; margin: 1.2rem 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />'],
      [/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'],
      [/^>\s+(.*)/gm, (m, g1) => `<blockquote>${g1.replace(/^>\s*/gm, '')}</blockquote>`],
      // /:(\w+):/g, (match) => emojiMap[match] || match // Uncomment if emojiMap is populated
    ];
    markdownReplacements.forEach(([regex, replacement]) => {
        processed = safeStringReplace(processed, regex, replacement);
    });

    // List processing
    processed = safeStringReplace(processed, /(?:^|\n)((?:(?:[-*+]|\d+\.) [^\n]*(?:\n|$))+)/g, (match) => {
        const lines = match.trim().split('\n');
        if (lines.length === 0) return match;
        const isOrdered = /^\d+\./.test(lines[0].trim());
        let listHtml = isOrdered ? '<ol>' : '<ul>';
        lines.forEach(line => {
            const itemContent = line.replace(/^(?:[-*+]|\d+\.)\s*/, '').trim();
            if (itemContent) {
                listHtml += `<li>${itemContent}</li>`;
            }
        });
        listHtml += isOrdered ? '</ol>' : '</ul>';
        return listHtml;
    });

    return `<div class="ai-response">${processed}</div>`;
  }, [safeStringReplace, emojiMap]); // emojiMap is now stable

  // --- useEffect to Fetch History on Subject Change ---
  useEffect(() => {
    if (selectedSubject) {
        console.log(`CONTEXT_EFFECT: Subject changed to '${selectedSubject}', fetching history...`);
        setLoading(true);
        setChatHistory([]);
        setError(null);

        fetchHistory(selectedSubject)
            .then(historyItems => {
                const formattedHistory = historyItems.map((item, index) => ({
                    id: item.id || `hist_${item.timestamp}_${index}`,
                    type: item.type,
                    rawText: item.message,
                    htmlText: item.type === 'bot' ? processContent(item.message) : item.message,
                    timestamp: item.timestamp,
                    isTyping: false,
                    attachment: item.attachment || null,
                }));
                console.log("CONTEXT_EFFECT: Fetched and formatted history:", formattedHistory.length, "items");
                setChatHistory(formattedHistory);
setShowResult(formattedHistory.length > 0);
            })
            .catch(err => {
                console.error("CONTEXT_EFFECT: Fetch history failed:", err);
                setError(err.message || "Failed to load chat history.");
                setChatHistory([]);
                setShowResult(false);
            })
            .finally(() => {
                setLoading(false);
            });
    } else {
        console.log("CONTEXT_EFFECT: No subject selected, clearing history.");
        setChatHistory([]);
        setShowResult(false);
        setError(null);
    }
  }, [selectedSubject, processContent]); // processContent is now stable

  // --- Memoized Typing Effect ---
  const delayPara = useCallback(async (fullHtml, messageId) => {
    return new Promise(resolve => {
        const words = typeof fullHtml === 'string' ? fullHtml.split(/(\s+)/).filter(Boolean) : [];
        let currentText = "";
        let i = 0;
        const interval = setInterval(() => {
            if (i < words.length) {
                currentText += words[i];
                setChatHistory(prevHistory =>
                    prevHistory.map(msg =>
                        msg.id === messageId ? { ...msg, htmlText: currentText } : msg
                    )
                );
                i++;
            } else {
                clearInterval(interval);
                resolve();
            }
        }, 15);
    });
  }, []); // setChatHistory from useState is stable

  // --- Memoized Add Bot Message ---
  const addBotMessageWithTypingEffect = useCallback(async (rawResponse) => {
    const processedHtmlContent = processContent(rawResponse); // Uses memoized processContent
    console.log("PROCESS_CONTENT_OUTPUT: Processed HTML:", processedHtmlContent);
    const messageId = `bot_${Date.now()}`;

    const newBotMessage = {
        id: messageId,
        type: "bot",
        rawText: "", // Will be filled after typing effect
        htmlText: "",
        timestamp: new Date().toISOString(),
        isTyping: true
    };
    setChatHistory(prev => [...prev, newBotMessage]);

    await delayPara(processedHtmlContent, messageId); // Uses memoized delayPara

    setChatHistory(prev =>
        prev.map(msg =>
            msg.id === messageId
            ? { ...msg, rawText: rawResponse, htmlText: processedHtmlContent, isTyping: false }
            : msg
        )
    );
    setTimeout(() => {
        if (typeof hljs.highlightAll === 'function') {
            hljs.highlightAll();
        } else if (typeof hljs.highlightElement === 'function') { // Fallback for older versions or specific needs
            document.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        }
    }, 50);
  }, [processContent, delayPara]); // Dependencies are stable

  // --- Send Message Handler (Not typically memoized due to broad dependencies) ---
  const onSent = async (prompt, fileAttachment = null, analysisData = null) => {
    console.log("ON_SENT: Called. Prompt:", typeof prompt === 'string' ? prompt.substring(0,50) : "N/A", "File:", fileAttachment?.name, "Analysis:", !!analysisData);
    let finalPrompt = "";

    try {
        finalPrompt = typeof prompt === 'string' ? prompt.trim() : (typeof input === 'string' ? input.trim() : "");

        if (!finalPrompt && !fileAttachment && !whiteboardDrawing) { // ensure whiteboardDrawing is checked if it implies analysisData
            console.log("ON_SENT: Exiting - nothing to send.");
            return;
        }

        setLoading(true);
        setError(null);
        setShowResult(true);

        const historyForApi = [...chatHistory];
        let attachmentData = null;
        let userMessageText = finalPrompt;

        if (fileAttachment) {
            attachmentData = { type: 'file', fileType: fileAttachment.type, fileName: fileAttachment.name };
            userMessageText = `[User uploaded ${fileAttachment.name}] ${finalPrompt}`;
        } else if (whiteboardDrawing && analysisData) { // analysisData might be the drawing data itself or metadata
             attachmentData = { type: 'drawing', fileName: 'whiteboard.png', fileType: 'image/png' }; // Or derive from analysisData
             userMessageText = `[User sent a drawing] ${finalPrompt}`;
        }

        const userMessage = {
            id: `user_${Date.now()}`, type: "user", rawText: userMessageText, htmlText: userMessageText,
            timestamp: new Date().toISOString(), isTyping: false, attachment: attachmentData
        };
        setChatHistory(prev => [...prev, userMessage]);
        if (typeof finalPrompt === 'string' && finalPrompt) setRecentPrompt(finalPrompt);


        let apiResponse = "";
        const subject = localStorage.getItem('selectedSubject');
        console.log("ON_SENT: File type:", fileAttachment?.type, "Subject:", subject, "Whiteboard used:", !!(whiteboardDrawing && analysisData));

        if (fileAttachment && fileAttachment.type === 'application/pdf') {
            const googleAIHistory = historyForApi.map(msg => ({ role: msg.type === 'bot' ? 'model' : 'user', parts: [{ text: msg.rawText }] }));
            const pdfResult = await handlePDFRequest(fileAttachment, finalPrompt, googleAIHistory);
            apiResponse = pdfResult.response;
        } else {
            // If whiteboardDrawing is the actual data for analysisData, pass it directly.
            const currentAnalysisData = whiteboardDrawing && analysisData ? whiteboardDrawing : analysisData;
            apiResponse = await runMulti(finalPrompt, fileAttachment, currentAnalysisData, historyForApi);
        }
        const responseText = typeof apiResponse === "string" ? apiResponse : JSON.stringify(apiResponse);

        if (subject) {
            await updateConversationHistory(subject, userMessage, responseText);
        } else {
            console.warn("ON_SENT: No subject selected, history not saved to DB.");
        }
        await addBotMessageWithTypingEffect(responseText);

    } catch (err) {
        console.error("ON_SENT: Error caught:", err);
        const errorMessage = err.message || "Apologies, I encountered an error processing your request. Please try again.";
        setError(errorMessage);
        setChatHistory(prev => [...prev, {
            id: `error_${Date.now()}`, type: "bot", rawText: errorMessage,
            htmlText: processContent(errorMessage), // Uses memoized processContent
            timestamp: new Date().toISOString(), isTyping: false
        }]);
    } finally {
        setLoading(false);
        setInput("");
        setFile(null);
        setFilePreview(null);
        setWhiteboardDrawing(null);
        if (finalPrompt) {
            setPrevPrompts(prev => [...prev, finalPrompt]);
        }
    }
  };

  // --- New Chat Handler (Not typically memoized) ---
  const newChat = () => {
    console.log("Starting new chat (clearing history, but keeping subject)");
    setLoading(false);
    setShowResult(selectedSubject ? true : false);
    setChatHistory([]);
    setRecentPrompt("");
    setInput("");
    setFile(null);
    setFilePreview(null);
    setWhiteboardDrawing(null);
    setError(null);
  };

  // --- Context Value ---
  const contextValue = {
    prevPrompts, setPrevPrompts,
    onSent,
    setRecentPrompt, recentPrompt,
    showResult, setShowResult,
    loading, setLoading,
    resultData, setResultData,
    input, setInput,
    newChat,
    file, setFile,
    filePreview, setFilePreview,
    whiteboardDrawing, setWhiteboardDrawing,
    chatContainerRef,
    showWhiteboard, setShowWhiteboard,
    chatHistory, setChatHistory,
    error, setError,
    selectedSubject, setSelectedSubject,
    // Provide memoized functions if they are intended to be stable for consumers
    // processContent, // If consumers need to call it directly
    // addBotMessageWithTypingEffect, // If used by consumers
  };

  // --- Provider Return ---
  return (
    <Context.Provider value={contextValue}>
      {props.children}
    </Context.Provider>
  );
};

export default ContextProvider;