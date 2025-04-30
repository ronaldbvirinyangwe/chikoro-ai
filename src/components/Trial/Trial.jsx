import React, { useContext, useEffect, useState, useRef } from 'react';
import './trial.css';
import { assets } from '../../assets/assets';
import { Context } from '../../context/Context';
import LogoutButton from '../LogoutButton/LogoutButton';
import { useNavigate } from 'react-router-dom';
import { FiUpload, FiMic, FiSend } from 'react-icons/fi';
import { motion } from 'framer-motion';

const Trial = () => {
  const { onSent, recentPrompt, showResult, loading, resultData, setInput, input } = useContext(Context);
  
  const [file, setFile] = useState(null);  // File state
  const [sendCount, setSendCount] = useState(0);  // Counter for the number of times onSent is triggered

  // Ref for the textarea
  const textareaRef = useRef(null);

  const navigate = useNavigate(); 

  // Retrieve the send count from localStorage when the component mounts
  useEffect(() => {
    const storedSendCount = localStorage.getItem('sendCount');
    if (storedSendCount) {
      setSendCount(parseInt(storedSendCount));
    }
  }, []);

  // Store the send count to localStorage whenever it changes
  useEffect(() => {
    if (sendCount > 0) {
      localStorage.setItem('sendCount', sendCount);
    }
  }, [sendCount]);

  const OpenDash = async (e) => {
    navigate("/login")
  };

  const cardMessages = [
    "Ndibatsire kuita homework",
    "Ndibatsirewo nekuverenga",
    "Ndiudze nyaya inonakidza",
  ];

  const handleCardClick = (message) => {
    setInput(message);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && input) {
      onSent(input, file); // Send the input and file here
      incrementSendCount(); // Increment the send count after each message
    }
  };

  const handleInput = (event) => {
    setInput(event.target.value);
    // Adjust the height of the textarea
    textareaRef.current.style.height = 'auto'; // Reset height
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 400)}px`;
  };

  const handleLogout = () => {
    navigate('/login');
  };

  // Handle file upload when the gallery icon is clicked
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFile(file);  // Store the selected file
    }
  };

  // Function to display file details
  const renderFileDetails = () => {
    if (file) {
      return (
        <div className="file-details">
          <p><strong>Selected file:</strong></p>
          <p>File name: {file.name}</p>
          <p>File type: {file.type}</p>
          <p>File size: {(file.size / 1024).toFixed(2)} KB</p>
        </div>
      );
    } else {
      return <p>No file selected</p>;
    }
  };

  // Function to increment the send count
  const incrementSendCount = () => {
    setSendCount((prevCount) => prevCount + 1);
  };

  // Check if send count reached 3
  const canSend = sendCount < 3;

  return (
    <div className='main'>
      <nav className="nav">
        <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="logo">Chikoro AI</motion.h1>
        <div className="nav-right">
          <div className="profile-container">
            <img src={assets.profile} alt="Profile" className="profile-pic" />
            <LogoutButton onClick={handleLogout} />
          </div>
        </div>
      </nav>

      <div className="main-container">
        <motion.p 
          className="learn-cta"
          onClick={OpenDash}
          whileHover={{ scale: 1.02 }}
        >
          Begin your learning journey today with Chikoro AI. Click here to enrol →
        </motion.p>

        {!showResult ? (
          <>
            <div className="greet">
              <h1><span>Mhoro, </span></h1>
              <p className="subtitle">Ndokubatsira nei nhasi?</p>
            </div>
            <div className="cards">
              {cardMessages.map((message, index) => (
                <motion.div 
                  key={index} 
                  className="card"
                  onClick={() => handleCardClick(message)}
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.2 }}
                >
                  <p>{message}</p>
                  <img 
                    src={assets[`${index === 0 ? 'compass_icon' : index === 1 ? 'bulb_icon' : 'message_icon'}`]} 
                    alt="" 
                    className="card-icon" 
                  />
                </motion.div>
              ))}
            </div>
          </>
        ) : (
          <div className='result'>
            <div className="result-title">
              <img src={assets.profile} alt="Profile" />
              <p>{recentPrompt}</p>
            </div>
            <div className="result-data">
              <img src="Scales Technologies Abstract Logo.png" alt="logo" className="result-logo" />
              {loading ? (
                <div className="loader">
                  <hr />
                  <hr />
                  <hr />
                </div>
              ) : (
                <div className="result-content" dangerouslySetInnerHTML={{ __html: resultData }} />
              )}
            </div>
          </div>
        )}

        <div className="main-bottom">
          <div className="input-container">
            <div className="search-box">
              <textarea
                ref={textareaRef}
                onInput={handleInput}
                value={input}
                placeholder='Nyora muvhunzo pano'
                onKeyDown={handleKeyDown}
                className="chat-input"
              />
              <div className="input-controls">
                <label htmlFor="file-upload" className="icon-button">
                  <FiUpload size={20} />
                </label>
                <button className="icon-button">
                  <FiMic size={20} />
                </button>
                {input && canSend && (
                  <motion.button 
                    className="send-button"
                    onClick={() => {
                      onSent(input, file);
                      incrementSendCount();
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FiSend size={20} />
                  </motion.button>
                )}
                {sendCount >= 3 && <p className="error-message">You can only send 3 messages.</p>}
              </div>
            </div>
          </div>

          <p className="disclaimer">
            Chikoro AI inogona kukanganisa, saka tarisa kaviri mhinduro dzayo kaviri
          </p>
        </div>
      </div>
    </div>
  );
};

export default Trial;