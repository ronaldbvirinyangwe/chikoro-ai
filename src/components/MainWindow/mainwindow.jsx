import React, { useContext, useState, useRef, useEffect, useCallback } from 'react';
import './mainwindow.css';
import { assets } from '../../assets/assets';
import { Context } from '../../context/Context';
import { useNavigate, Link, useLocation } from "react-router-dom";
import { fetchDynamicCards, analyzeMathDrawing } from '../../config/image_understand';
import { FiUpload, FiMic, FiSend, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import MathWhiteboard from '../MathWhiteboard/MathWhiteboard';
import PomodoroTimer from './PomodoroTimer';
import axios from 'axios'; // Import axios


const MainWindow = () => {
    const {
        onSent,
        recentPrompt,
        showResult,
        loading,
        setInput,
        input,
        newChat,
        chatContainerRef,
        setShowWhiteboard,
        showWhiteboard,
        file,
        setFile,
        filePreview,
        setFilePreview,
        whiteboardDrawing,
        setWhiteboardDrawing,
        chatHistory,
        setChatHistory,
        setError,
        setLoading,
        setShowResult // <--- Now correctly destructured
    } = useContext(Context);

    const navigate = useNavigate();
    const [dynamicCards, setDynamicCards] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(localStorage.getItem('selectedSubject') || '');
    const textareaRef = useRef(null);
    const [cardsLoaded, setCardsLoaded] = useState(false);
    const location = useLocation();
    const [initialized, setInitialized] = useState(false);
    // fetchedPrompts state is no longer strictly necessary if we update chatHistory directly
    // const [fetchedPrompts, setFetchedPrompts] = useState([]);

    useEffect(() => {
        if (location.state && location.state.paperFile && !initialized) {
            const { paperFile } = location.state;
            setFile(paperFile);
            if (paperFile.type.startsWith('image/')) {
                setFilePreview(URL.createObjectURL(paperFile));
            } else if (paperFile.type === 'application/pdf') {
                setFilePreview(assets.pdf);
            }
            setInitialized(true);
            window.history.replaceState({}, document.title);
        }
    }, [location.state, initialized, setFile, setFilePreview]);


    useEffect(() => {
    if (chatHistory.length > 0 && location.state?.scrollToTimestamp) {
      const targetTimestamp = location.state.scrollToTimestamp;
      console.log("MAIN_WINDOW: Attempting to scroll to timestamp:", targetTimestamp);

      // Find the message element by its ID (which should include the timestamp or be the timestamp)
      // This assumes your message objects in chatHistory have an 'id' property that can be matched
      // or you can find by timestamp directly if timestamps are unique enough for this purpose.
      // For robust scrolling, each message div should have an id attribute like `message-${message.id}`
      
      let targetElement = null;
      // Option 1: If you have refs for each message
      // targetElement = messageRefs.current[targetTimestamp]; // Or messageRefs.current[message.id]

      // Option 2: Find element by data-attribute or ID set during render
      // (You'd need to add these attributes in your .map() when rendering chatHistory)
      // For example: <div id={`message-${message.timestamp}`} ... > or data-timestamp={message.timestamp}
      targetElement = document.getElementById(`message-${targetTimestamp}`); 
      // Or if you used unique IDs in chatHistory:
      // const targetMessage = chatHistory.find(msg => msg.timestamp === targetTimestamp);
      // if (targetMessage) targetElement = document.getElementById(`message-${targetMessage.id}`);


      if (targetElement && chatContainerRef.current) {
        console.log("MAIN_WINDOW: Scrolling to element:", targetElement);
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Clear the scrollToTimestamp from location.state to prevent re-scrolling on other updates
        // This requires you to be able to modify history state or that the location state is temporary
        window.history.replaceState({ ...location.state, scrollToTimestamp: null }, ''); 

      } else if (chatContainerRef.current) {
          console.log("MAIN_WINDOW: Target message for scroll not found, scrolling to bottom.");
          // Fallback: Scroll to bottom if specific message isn't found (e.g., after new messages are added)
          chatContainerRef.current.scrollTo({
              top: chatContainerRef.current.scrollHeight,
              behavior: 'smooth'
          });
      }
    }
  }, [chatHistory, location.state, chatContainerRef]);

    const handleWhiteboardSubmit = async (imageDataUrl) => {
        setWhiteboardDrawing(imageDataUrl);
        setShowWhiteboard(false);

        try {
            const response = await fetch(imageDataUrl);
            const drawingBlob = await response.blob();
            const file = new File([drawingBlob], "whiteboard-drawing.png", { type: "image/png" });
            setFile(file);
            setFilePreview(imageDataUrl);

            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                }
            }, 100);
        } catch (error) {
            console.error("Error converting drawing to file:", error);
            setWhiteboardDrawing(null);
            setFile(null);
            setFilePreview(null);
        }
    };

   const scrollToBottom = () => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: 'smooth' // Use smooth scroll for a better UX
        });
    }
};

    useEffect(() => {
        const handler = setTimeout(() => {
           scrollToBottom();
        }, 100);
        return () => clearTimeout(handler);
    }, [chatHistory, loading]);

    useEffect(() => {
    const currentSubject = localStorage.getItem('selectedSubject') || '';
    setSelectedSubject(currentSubject); // Keep local state in sync

    // Only fetch cards if we have a subject AND we are currently *not* showing results
    if (currentSubject && !showResult) { 
        const fetchCards = async () => {
            try {
                const suggestions = await fetchDynamicCards(currentSubject);
                setDynamicCards(suggestions);
            } catch (error) {
                console.error('Error fetching dynamic cards:', error);
                setDynamicCards(["Error fetching suggestions."]);
            }
        };
        fetchCards();
    } else {
        setDynamicCards([]); // Clear cards if no subject or if showing results
    }
}, [selectedSubject, showResult]); // Re-run when subject changes or when we hide/show results.


    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey && (input.trim() || file || whiteboardDrawing)) {
            event.preventDefault();
            handleSend();
        }
    };

    const handleInput = (event) => {
        setInput(event.target.value);
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    };

    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            if (selectedFile.type.startsWith('image/')) {
                setFilePreview(URL.createObjectURL(selectedFile));
                setWhiteboardDrawing(null);
            } else if (selectedFile.type === 'application/pdf') {
                setFilePreview(assets.pdf);
                setWhiteboardDrawing(null);
            } else {
                console.warn("Unsupported file type selected:", selectedFile.type);
                setFile(null);
                setFilePreview(null);
                setWhiteboardDrawing(null);
            }
            event.target.value = '';
        }
    };

    const handlePreviewClick = () => {
        if (filePreview && file?.type?.startsWith('image/') && !whiteboardDrawing) {
             URL.revokeObjectURL(filePreview);
        }
        setFilePreview(null);
        setFile(null);
        setWhiteboardDrawing(null);
        const fileInput = document.getElementById('file-upload');
        if (fileInput) fileInput.value = '';
    };

    const renderFilePreview = () => {
        if (filePreview) {
            return (
                <div className="file-preview" onClick={handlePreviewClick}>
                    {file?.type === 'application/pdf' ? (
                        <div className="pdf-preview">
                            <img src={assets.pdf} alt="PDF Preview" />
                            <span>{file.name}</span>
                        </div>
                    ) : (
                        <div className="image-preview-container">
                             <img src={filePreview} alt="Preview" />
                             <FiX className="remove-icon" />
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    const showMenu = () => {
         navigate("/chat");
         newChat();
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    const handleSend = () => {
        if (input.trim() || file || whiteboardDrawing) {
            // When user sends a new message, immediately show the result area
            setShowResult(true); // This is important to ensure the chat history is visible

            const sendOperation = whiteboardDrawing
                ? analyzeMathDrawing(whiteboardDrawing)
                    .then(analysis => ({ input: input, file: file, analysisData: analysis }))
                    .catch(err => {
                        console.error("Error analyzing drawing:", err);
                        return { input: input, file: file, analysisData: null };
                    })
                : Promise.resolve({ input: input, file: file, analysisData: null });

            sendOperation.then(({ input: sendInput, file: sendFile, analysisData: sendAnalysis }) => {
                onSent(sendInput, sendFile, sendAnalysis);

                setInput('');
                const fileInput = document.getElementById('file-upload');
                if (fileInput) fileInput.value = '';

                requestAnimationFrame(() => {
                    if (textareaRef.current) {
                        textareaRef.current.style.height = 'auto';
                    }
                });
            });
        }
    };

    const handlePomodoroFocusEnd = useCallback(({ task, cycles }) => {
        console.log(`Pomodoro Focus session ended! Task: "${task}", Cycles: ${cycles}. Time to review or take a break.`);
    }, []);

    const handlePomodoroBreakEnd = useCallback(() => {
        console.log('Pomodoro Break session ended! Time to get back to work.');
    }, []);

    return (
      <div className="mainwindow">
        {!showWhiteboard && (
          <div className="pomodoro-container-fixed">
            <PomodoroTimer
              onFocusSessionEnd={handlePomodoroFocusEnd}
              onBreakSessionEnd={handlePomodoroBreakEnd}
            />
          </div>
        )}

        <div className="mains-container">
          {showWhiteboard ? (
            <MathWhiteboard onSubmitDrawing={handleWhiteboardSubmit} />
          ) : (
            <>
              {/* Conditional rendering based on showResult */}
              {!showResult ? ( // This branch is for showing dynamic cards
                <>
                  <motion.div
                    className="greet"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {selectedSubject && (
                      <p className="subtitle">
                        Sarudza card rimwe utange kudzidza {selectedSubject}:
                      </p>
                    )}
                    {!selectedSubject && (
                      <p className="subtitle">Sarudza card rimwe utange kudzidza</p>
                    )}
                  </motion.div>
                  <motion.div
                    className="cards-grid"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <AnimatePresence>
                      {dynamicCards.map((suggestion, index) => (
                        <motion.div
                          key={index}
                          className="card"
                          variants={cardVariants}
                          initial="hidden"
                          animate="visible"
                          exit="hidden"
                          transition={{ delay: index * 0.1 }}
                          onClick={() => setInput(suggestion)}
                          whileHover={{ scale: 1.02 }}
                        >
                          <p>{suggestion}</p>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                </>
              ) : ( // This branch is for showing chat results/history
                <motion.div
                  className="result"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="chat-container" ref={chatContainerRef}>
                    {chatHistory.map((message) => (
                      <div
                        key={message.id}
                        id={`message-${message.timestamp}`} 
                        className={`message ${message.type}-message`}
                      >
                        {message.type === "user" ? (
                          <>
                            {message.attachment?.type === "drawing" && (
                              <img
                                src={message.attachment.url}
                                alt="User drawing"
                                className=" image-attachment-preview"
                              />
                            )}
                            {message.attachment?.type === "file" &&
                              message.attachment.fileType.startsWith("image/") && (
                                <img
                                  src={message.attachment.url}
                                  alt="User image"
                                  className=" image-attachment-preview"
                                />
                              )}
                            {message.attachment?.type === "file" &&
                              message.attachment.fileType === "application/pdf" && (
                                <div className=" file-attachment-preview pdf-icon-container">
                                  <img src={assets.pdf} alt="PDF icon" />
                                </div>
                              )}
                          </>
                        ) : (
                          <img
                            src={assets.logo}
                            alt="bot logo"
                            className="bot-avatar"
                          />
                        )}

                       <div className="message-content">
    {message.type === "user" ? (
        <p>{message.rawText || message.htmlText}</p> 
    ) : (
        // Bot message branch - Use htmlText for both typing and final
        <div
            className={`response-content ${message.isTyping ? 'typing-text' : ''}`}
            dangerouslySetInnerHTML={{ __html: message.htmlText }}
        />
    )}
</div>
                      </div>
                    ))}
                    {/* Loader for active bot response */}
                    {loading && chatHistory.length > 0 && chatHistory[chatHistory.length -1]?.type !== 'bot' && (
                        <div className="message bot-message">
                            <img src={assets.logo} alt="bot logo" className="bot-avatar" />
                            <div className="message-content">
                                <div className="loader">
                                    <hr />
                                    <hr />
                                    <hr />
                                </div>
                            </div>
                        </div>
                    )}
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>

        {!showWhiteboard && (
          <div className="input-section">
            <motion.div
              className="search-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {renderFilePreview()}
              <div className="input-wrapper">
                <textarea
                  ref={textareaRef}
                  className="chat-input"
                  placeholder={
                    whiteboardDrawing
                      ? "Nyora mubvunzo pamusoro pemufananudzo wako.."
                      : file
                      ? `Vhunza nezve ${file.name}...`
                      : selectedSubject
                      ? `Nyora mubvunzo wako we${selectedSubject}...`
                      : "Nyora mubvunzo wako pano..."
                  }
                  value={input}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  rows="1"
                />
                <div className="input-controls">
                  <label className="icon-button upload-button">
                    <FiUpload />
                    <input
                      type="file"
                      id="file-upload"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      hidden
                    />
                  </label>
                  <button
                    className="icon-button"
                    onClick={() => setShowWhiteboard(true)}
                    disabled={loading}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 19l7-7 3-3a5 5 0 0 0-3-3l-3 3-7 7-4 1 1-4z"></path>
                      <path d="M18.5 13.5l-1.5-1.5"></path>
                    </svg>
                  </button>
                  {(input.trim() || file || whiteboardDrawing) && (
                    <motion.button
                      className="send-button"
                      onClick={handleSend}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      disabled={loading}
                    >
                      <FiSend />
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
            <p className="disclaimer">
              Chikoro AI inogona kuratidza ruzivo rusina chokwadi...
            </p>
           
          </div>
        )}
      </div>
    );
};

export default MainWindow;