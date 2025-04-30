import React, { useContext, useState, useRef, useEffect } from 'react';
import './mainwindow.css';
import { assets } from '../../assets/assets';
import { Context } from '../../context/Context';
import { useNavigate } from "react-router-dom";
import { fetchDynamicCards } from '../../config/image_understand';
import { FiUpload, FiMic, FiSend, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import MathWhiteboard from '../MathWhiteboard/MathWhiteboard';
import { submitDrawing, analyzeMathDrawing } from '../../config/image_understand';
import { handlePDFRequest } from '../../config/pdfparse';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const MainWindow = () => {
    const { onSent: originalOnSent, recentPrompt, showResult, loading, resultData, setInput, input } = useContext(Context);
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [dynamicCards, setDynamicCards] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(localStorage.getItem('selectedSubject') || '');
    const { newChat } = useContext(Context);
    const textareaRef = useRef(null);
    const [cardsLoaded, setCardsLoaded] = useState(false);
    const { chatContainerRef } = useContext(Context);
    const location = useLocation();
    const [initialized, setInitialized] = useState(false);
    
    // New state to store whiteboard drawing
    const [whiteboardDrawing, setWhiteboardDrawing] = useState(null);

    const { 
        hasActiveSubscription, 
        freeTrialMessages, 
        incrementTrialMessage,
        subscriptionStatus,
        SUBSCRIPTION_STATUS,
        FREE_TRIAL_LIMIT
    } = useAuth();

    // Create a wrapped version of onSent that handles free trial logic
    const onSent = (input, file, analysisData = null) => {
        if (hasActiveSubscription) {
            // For paid users, just call the original function without incrementing trial counter
            originalOnSent(input, file, analysisData);
            return;
        }
        
        // For free trial users, check limits before sending
        if (freeTrialMessages < FREE_TRIAL_LIMIT) {
            incrementTrialMessage();
            originalOnSent(input, file, analysisData);
        } else {
            navigate('/payment');
        }
    };

    useEffect(() => {
        if (location.state && !initialized) {
            const { paperFile } = location.state;
            if (paperFile) {
                // Set the file state and preview without sending automatically
                setFile(paperFile);
                setFilePreview(URL.createObjectURL(paperFile));
                setInitialized(true);
            }
        }
    }, [location.state, initialized]);

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { darkMode, setDarkMode } = useTheme();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const {setShowWhiteboard, showWhiteboard } = useContext(Context);

    const handleWhiteboardSubmit = async (imageData, studentId, subject) => {
        // Store the whiteboard drawing
        setWhiteboardDrawing(imageData);
        
        // Close the whiteboard
        setShowWhiteboard(false);
        
        // Set the file and preview to show the drawing in the input area
        const drawingBlob = await fetch(imageData).then(res => res.blob());
        const file = new File([drawingBlob], "whiteboard-drawing.png", { type: "image/png" });
        setFile(file);
        setFilePreview(imageData);
        
        // Focus the textarea for user to add their prompt about the drawing
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
            }
        }, 100);
    };

    const handlePDFUpload = async (file, prompt) => {
        try {
            const result = await handlePDFRequest(
                file,
                prompt,
                // Pass current conversation history if needed
                []
            );
            
            // Update state with result.updatedHistory and result.response
        } catch (error) {
            // Handle error
        }
    };
      
    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
        setShowProfileMenu(false);
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.profile-container')) {
                setShowProfileMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            const isAtBottom = chatContainerRef.current.scrollHeight - chatContainerRef.current.scrollTop === chatContainerRef.current.clientHeight;
            if (isAtBottom) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
        }
    };
    
    useEffect(() => {
        scrollToBottom();
    }, [resultData, loading, recentPrompt]);

    useEffect(() => {
        if (localStorage.getItem('theme') === 'dark') {
            document.documentElement.classList.add('dark');
        }
    }, []);
    
    useEffect(() => {
        if (selectedSubject && !cardsLoaded) {
            const fetchCards = async () => {
                try {
                    const suggestions = await fetchDynamicCards(selectedSubject);
                    setDynamicCards(suggestions);
                    setCardsLoaded(true);
                } catch (error) {
                    console.error('Error fetching dynamic cards:', error);
                }
            };
            
            let isMounted = true;
            if (isMounted) fetchCards();
            return () => { isMounted = false; };
        }
    }, [selectedSubject, cardsLoaded]);

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey && input) {
            event.preventDefault();
            handleSend();
        }
    };

    const handleInput = (event) => {
        setInput(event.target.value);
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 400)}px`;
    };

    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            if (selectedFile.type.startsWith('image/')) {
                setFilePreview(URL.createObjectURL(selectedFile));
            } else if (selectedFile.type === 'application/pdf') {
                setFilePreview(assets.pdf); 
            }
        }
    };

    const handlePreviewClick = () => {
        setFilePreview(null);
        setFile(null);
        setWhiteboardDrawing(null);
        // Reset file input
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
                        <React.Fragment>
                            <img src={filePreview} alt="Preview" />
                            {whiteboardDrawing && (
                                <div className="whiteboard-indicator">
                                    <FiX className="remove-icon" />
                                </div>
                            )}
                        </React.Fragment>
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
        if (input.trim() || whiteboardDrawing) {
            // Pass the whiteboard drawing as a file for analysis
            if (whiteboardDrawing) {
                analyzeMathDrawing(whiteboardDrawing)
                    .then(analysis => {
                        onSent(input, file, analysis);
                        setInput('');
                        setWhiteboardDrawing(null);
                    })
                    .catch(err => {
                        console.error("Error analyzing drawing:", err);
                        onSent(input, file); // Fall back to regular send
                    });
            } else {
                onSent(input, file);
                setInput('');
            }
            
            requestAnimationFrame(() => {
                if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto';
                }
            });
        }
    };

    // Determine if we should show subscription info
    const showSubscriptionInfo = () => {
        // Only show subscription info for free trial users
        if (!hasActiveSubscription) {
            return (
                <div className="trial-counter">
                    Free messages remaining: {Math.max(0, FREE_TRIAL_LIMIT - freeTrialMessages)}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="mainwindow">
            {/* Only render trial counter for non-subscribers */}
            {/* {showSubscriptionInfo()} */}
            
            <div className="mains-container">
                {showWhiteboard ? (
                    <MathWhiteboard 
                        onSubmitDrawing={handleWhiteboardSubmit}
                        studentId={localStorage.getItem('studentId')}
                        subject={selectedSubject}
                    />
                ) : (
                    <>
                        {!showResult ? (
                            <>
                                <motion.div 
                                    className="greet"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    <p className="subtitle">Sarudza card rimwe utange kudzidza</p>
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
                        ) : (
                            <motion.div 
                                className="result"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <div className="chat-container" ref={chatContainerRef}>
                                    <div className="message user-message">
                                        <div className="message-content">
                                            {whiteboardDrawing && <img src={whiteboardDrawing} alt="Whiteboard Drawing" className="whiteboard-in-message" />}
                                            <p>{recentPrompt}</p>
                                        </div>
                                    </div>
                                    <div className="message bot-message">
                                    <img src={assets.logo} alt="logo" className="bot-avatar" />
                                        <div className="message-content">
                                            {loading ? (
                                                <div className="loader">
                                                  <hr />
                                                  <hr />
                                                  <hr />
                                                </div>
                                            ) : (
                                                <div className="response-content" dangerouslySetInnerHTML={{ __html: resultData }} />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

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
                                        placeholder={whiteboardDrawing ? "Ask a question about your drawing..." : "Nyora mubvunzo wako pano..."}
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
                                        {/* <button className="icon-button">
                                            <FiMic />
                                        </button>*/}
                                        {(input.trim() || whiteboardDrawing) && (
                                            <motion.button
                                                className="send-button"
                                                onClick={handleSend}
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.95 }}
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
                    </>
                )}
            </div>
        </div>
    );
};

export default MainWindow;