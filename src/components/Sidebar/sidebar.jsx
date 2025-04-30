import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { FiHome, FiClipboard, FiFileText, FiTable, FiUser, FiMenu, FiX, FiMessageSquare } from 'react-icons/fi';
import { assets } from '../../assets/assets';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from "react-router-dom";
import { Context } from '../../context/Context';
import './sidebar.css'


const Sidebar = () => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showRecentPrompts, setShowRecentPrompts] = useState(false);
  const [fetchedPrompts, setFetchedPrompts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const { darkMode, setDarkMode } = useTheme();
  const navigate = useNavigate();
  const [hoveredButton, setHoveredButton] = useState(null);
  const { 
    setShowWhiteboard, 
    showWhiteboard, 
    newChat,
    setRecentPrompt,
    onSent
  } = useContext(Context);

  const BASE_API_URL = 'https://chikoro-ai.com';

  // Get selected subject from localStorage
  useEffect(() => {
    const subject = localStorage.getItem('selectedSubject');
    if (subject) {
      setSelectedSubject(subject);
    }
  }, []);

  // Fetch previous prompts from API
  useEffect(() => {
    const fetchPreviousPrompts = async () => {
      setLoading(true);
      
      // Get studentId from localStorage
      const studentId = localStorage.getItem('studentId');
      
      if (!studentId) {
        console.log("No student ID found in localStorage");
        setError('Please login to view previous messages');
        setLoading(false);
        return;
      }
      
      console.log("Fetching previous prompts for student ID:", studentId);
      
      try {
        // Fetch student data containing chat history
        const studentResponse = await axios.get(`${BASE_API_URL}/students/${studentId}`);
        const studentData = studentResponse.data;
        
        // Process chat history to extract prompts
        const allPrompts = [];
        
        if (studentData.chatHistory) {
          Object.entries(studentData.chatHistory).forEach(([subject, chats]) => {
            chats.forEach(chat => {
              if (chat.message) {
                allPrompts.push({
                  subject: subject,
                  message: chat.message,
                  timestamp: chat.timestamp
                });
              }
            });
          });
        }
        
        // Sort by timestamp (newest first) and set to state
        setFetchedPrompts(allPrompts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
        console.log("Successfully fetched previous prompts");
        
      } catch (err) {
        console.error('Failed to fetch previous prompts:', err);
        setError('Failed to load previous messages');
      } finally {
        setLoading(false);
      }
    };

    fetchPreviousPrompts();
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    setShowProfileMenu(false);
  };

  const showMenu = () => {
    navigate("/subjectselect");
    newChat();
  };

  const showReports = () => {
    navigate("/reports");
  };

  const showTest = () => {
    navigate("/test");
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
    setShowProfileMenu(false);
    setShowRecentPrompts(false);
  };
  
  // Load and send a previous prompt
  const loadPrompt = async (prompt) => {
    setRecentPrompt(prompt.message);
    await onSent(prompt.message);
    setShowRecentPrompts(false);
  };

  // Filter prompts by current subject if one is selected
  const getFilteredPrompts = () => {
    if (!selectedSubject) {
      return fetchedPrompts;
    }
    return fetchedPrompts.filter(prompt => prompt.subject === selectedSubject);
  };

  const filteredPrompts = getFilteredPrompts();

  return (
    <>
      <button 
        className="mobile-toggle"
        onClick={toggleSidebar}
      >
        {isSidebarOpen ? <FiX className="icon" /> : <FiMenu className="side-icon" />}
      </button>

      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        {/* Top Section */}
        <div className="sidebar-top">
          <div className="logo-container">
            <img src={assets.logo} alt="Logo" className="logo" />
          </div>
          <div 
            className="tooltip-container"
            onMouseEnter={() => setHoveredButton('whiteboard')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <button 
              onClick={() => setShowWhiteboard(prev => !prev)} 
              className={`nav-btn ${showWhiteboard ? 'active' : ''}`}
            > 
              <FiClipboard className="icon" />
            </button>
            {hoveredButton === 'whiteboard' && (
              <span className="tooltip">
                {showWhiteboard ? 'Close Whiteboard' : 'Open Whiteboard'}
              </span>
            )}
          </div>
        </div>

        {/* Middle Section */}
        <div className="sidebar-middle">
          <div 
            className="tooltip-container"
            onMouseEnter={() => setHoveredButton('home')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <button onClick={showMenu} className="nav-btn">
              <FiHome className="icon" />
            </button>
            {hoveredButton === 'home' && <span className="tooltip">Home</span>}
          </div>

          <div 
            className="tooltip-container"
            onMouseEnter={() => setHoveredButton('test')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <button onClick={showTest} className="nav-btn">
              <FiFileText className="icon" />
            </button>
            {hoveredButton === 'test' && <span className="tooltip">Test</span>}
          </div>

          <div 
            className="tooltip-container"
            onMouseEnter={() => setHoveredButton('reports')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <button className="nav-btn" onClick={showReports}>
              <FiTable className="icon" />
            </button>
            {hoveredButton === 'reports' && <span className="tooltip">Reports</span>}
          </div>
          
          {filteredPrompts.length > 0 && (
            <div 
              className="tooltip-container"
              onMouseEnter={() => setHoveredButton('recent')}
              onMouseLeave={() => setHoveredButton(null)}
            >
              <button 
                className={`nav-btn ${showRecentPrompts ? 'active' : ''}`}
                onClick={() => setShowRecentPrompts(prev => !prev)}
              >
                <FiMessageSquare className="icon" />
              </button>
              {hoveredButton === 'recent' && <span className="tooltip">Recent Prompts</span>}
            </div>
          )}
        </div>

        {/* Recent Prompts Panel */}
        {showRecentPrompts && (
          <div className="recent-prompts-panel">
            <h4>{selectedSubject ? `${selectedSubject} Prompts` : 'Recent Prompts'}</h4>
            {loading && <p className="loading-text">Loading...</p>}
            {error && <p className="error-text">{error}</p>}
            
            {!loading && filteredPrompts.length === 0 && (
              <p className="no-prompts-text">
                {selectedSubject 
                  ? `No prompts found for ${selectedSubject}`
                  : 'No recent prompts found'}
              </p>
            )}
            
            <div className="recent-prompts-list">
              {filteredPrompts.map((prompt, index) => (
                <div 
                  key={index} 
                  className="recent-prompt-item"
                  onClick={() => loadPrompt(prompt)}
                >
                  <FiMessageSquare className="message-icon" />
                  <div className="prompt-content">
                    <p className="prompt-message">
                      {prompt.message.slice(0, 30)}{prompt.message.length > 30 ? '...' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Section */}
        <div className="sidebar-bottom">
          <div 
            className="tooltip-container"
            onMouseEnter={() => setHoveredButton('profile')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)} 
              className="profile-btn"
            >
              <FiUser className="icon" />
            </button>
            {hoveredButton === 'profile' && <span className="tooltip">Profile</span>}
          </div>
          {showProfileMenu && (
            <div className="profile-menu">
              <div 
                className="profile-menu-item"
                onClick={toggleDarkMode}
              >
                {darkMode ? 'Light Mode' : 'Dark Mode'}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;