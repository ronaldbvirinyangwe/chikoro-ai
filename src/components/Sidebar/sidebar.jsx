import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { 
    FiHome, FiClipboard, FiFileText, FiTable, FiUser, FiMenu, FiX, 
    FiMessageSquare, FiCompass, FiChevronsLeft, FiChevronsRight, 
    FiSettings, FiLogOut, FiFolder, FiPlusSquare, 
} from 'react-icons/fi';
import { assets } from '../../assets/assets';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from "react-router-dom";
import { Context } from '../../context/Context';
import './sidebar.css';

const Sidebar = () => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(
    () => JSON.parse(localStorage.getItem('sidebarCollapsed')) || false
  );
  const [fetchedPrompts, setFetchedPrompts] = useState([]);
  const [loadingPrompts, setLoadingPrompts] = useState(false); // Renamed for clarity
  const [promptsError, setPromptsError] = useState(''); // Renamed for clarity
  
  // Get necessary functions and selectedSubject from Context
  const { 
    darkMode, // Assuming useTheme provides this, or get from your main context
    setDarkMode 
  } = useTheme(); // If theme is separate, keep this. Otherwise, get from main Context.

  const {
    newChat,
    setRecentPrompt, // To set the main chat input with the clicked prompt
    setInput,        // To set the main chat input
    setSelectedSubject, // <<--- KEY FUNCTION from Context
    showWhiteboard,
    setShowWhiteboard,
    selectedSubject: contextSelectedSubject // Get the globally selected subject
  } = useContext(Context);

  const navigate = useNavigate();
  const BASE_API_URL = 'https://atqtuew6syxese-4173.proxy.runpod.net';

  // Sync sidebar's view of selected subject with the context's or localStorage
  // This is mainly for filtering the "Recent Chats" list in the sidebar
  const [sidebarDisplaySubject, setSidebarDisplaySubject] = useState(contextSelectedSubject || localStorage.getItem('selectedSubject') || '');

  useEffect(() => {
    setSidebarDisplaySubject(contextSelectedSubject || localStorage.getItem('selectedSubject') || '');
  }, [contextSelectedSubject]);


  // Fetch the list of previous prompts for the sidebar display
  useEffect(() => {
    const fetchPreviousPrompts = async () => {
      setLoadingPrompts(true);
      setPromptsError('');
      const studentId = localStorage.getItem('studentId');
      const accessToken = localStorage.getItem('accessToken');

      if (!studentId) {
        console.log("SIDEBAR: No student ID found.");
        setLoadingPrompts(false);
        return;
      }
      if (!accessToken) {
        console.log("SIDEBAR: No auth token.");
        setLoadingPrompts(false);
        return;
      }

      console.log("SIDEBAR: Fetching previous prompts for student ID:", studentId);
      try {
        const studentResponse = await axios.get(`${BASE_API_URL}/students/${studentId}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const studentData = studentResponse.data;
        const allPrompts = [];

        if (studentData && studentData.chatHistory) {
          Object.entries(studentData.chatHistory).forEach(([subject, chats]) => {
            if (Array.isArray(chats)) {
              chats.forEach(chat => {
                // Add user messages that have actual text content
                if (chat.type === 'user' && chat.message && chat.message.trim() !== '') {
                  allPrompts.push({
                    id: chat.id || `prompt_${chat.timestamp}_${subject}`, // Ensure an ID
                    subject: subject,
                    message: chat.message, // This should be rawText
                    timestamp: chat.timestamp
                  });
                }
              });
            }
          });
        }
        // Sort by most recent first
        setFetchedPrompts(allPrompts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
        console.log("SIDEBAR: Successfully fetched previous prompts:", allPrompts.length);
      } catch (err) {
        console.error('SIDEBAR: Failed to fetch previous prompts:', err);
        if (err.response && err.response.status === 401) {
          setPromptsError('Session expired. Please log in.');
        } else {
          setPromptsError('Failed to load recent chats.');
        }
      } finally {
        setLoadingPrompts(false);
      }
    };
    fetchPreviousPrompts();
  }, []); // Fetch prompts once when the sidebar mounts

  const toggleDarkModeInSidebar = () => {
    setDarkMode(!darkMode);
    setShowProfileMenu(false);
  };

  const handleNewChatNavigation = () => {
    newChat(); // From context - should clear history, input, etc.
    setSelectedSubject(""); // Clear the global subject to show subject selection/cards
    setRecentPrompt(''); 
    setInput('');
    navigate("/"); // Navigate to main window (which should show cards if no subject)
    if (isSidebarOpen) setIsSidebarOpen(false);
  };

  const navigateToHome = () => { // This now means "go to subject selection"
    setSelectedSubject(""); // Clear current subject to trigger subject selection view
    newChat(); // Reset chat state
    navigate("/subjectselect");
    if (isSidebarOpen) setIsSidebarOpen(false);
  };

  // --- MODIFIED: loadPrompt to set context and navigate ---
  const loadPrompt = async (clickedPrompt) => {
    console.log("SIDEBAR: Clicked on prompt:", clickedPrompt);

    if (!clickedPrompt || !clickedPrompt.subject || !clickedPrompt.message) {
        console.error("SIDEBAR: Invalid prompt object clicked.", clickedPrompt);
        return;
    }

    // 1. Set the global selected subject using the function from Context.
    // This will trigger the useEffect in ContextProvider to fetch the full history.
    setSelectedSubject(clickedPrompt.subject);
    
    // 2. Set the main input field and recent prompt (optional, for UX)
    setInput(clickedPrompt.message); 
    setRecentPrompt(clickedPrompt.message);

    // 3. Navigate to the main chat window (root path).
    // Pass the timestamp (or unique ID) of the clicked message via location state.
    navigate("/", { 
      state: { 
        scrollToTimestamp: clickedPrompt.timestamp ,
        selectedSubjectOnClick: clickedPrompt.subject 
      } 
    });

    if (isSidebarOpen) setIsSidebarOpen(false); 
  };


  const getFilteredPrompts = () => {
    if (!sidebarDisplaySubject) return fetchedPrompts; // Show all if no subject filter active
    return fetchedPrompts.filter(prompt => prompt.subject === sidebarDisplaySubject);
  };
  const filteredPrompts = getFilteredPrompts();

  // --- Other Navigation Handlers ---
  // const navigateToDiscover = () => { navigate("/discover"); if (isSidebarOpen) setIsSidebarOpen(false); };
  const navigateToTests = () => { navigate("/test"); if (isSidebarOpen) setIsSidebarOpen(false); };
  const navigateToPapers = () => { navigate("/papers"); if (isSidebarOpen) setIsSidebarOpen(false); };
  const navigateToReports = () => { navigate("/reports"); if (isSidebarOpen) setIsSidebarOpen(false); };
  const navigateToMyProfile = () => { navigate("/profile"); setShowProfileMenu(false); if (isSidebarOpen) setIsSidebarOpen(false); };
  // const navigateToSettings = () => { navigate("/settings"); setShowProfileMenu(false); if (isSidebarOpen) setIsSidebarOpen(false); };

  const handleLogout = () => {
    localStorage.removeItem('studentId');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('selectedSubject');
    localStorage.removeItem('sidebarCollapsed');
    setSelectedSubject(""); // Clear context subject
    newChat(); // Clear context chat
    navigate("/login");
    setShowProfileMenu(false);
    if (isSidebarOpen) setIsSidebarOpen(false);
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  };


  return (
    <>
      <button className="mobile-toggle" onClick={toggleSidebar}>
        {isSidebarOpen ? <FiX className="icon" /> : <FiMenu className="side-icon" />}
      </button>

      <div className={`sidebar ${isSidebarOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <img src={assets.logo} alt="Logo" className="logo" />
          {!isSidebarOpen && ( // Only show desktop collapse if mobile menu is not open
            <button onClick={toggleCollapse} className="collapse-toggle-btn">
              {isCollapsed ? <FiChevronsRight /> : <FiChevronsLeft />}
            </button>
          )}
        </div>

        <div className="new-chat-section">
         <button onClick={navigateToHome} className="new-conversation-btn">
            <FiHome className="icon" />
            {!isCollapsed && <span>Home</span>}
          </button>
        </div>

        <nav className="sidebar-nav">
          {/* <button onClick={handleNewChatNavigation} className="nav-item">
            <FiPlusSquare className="icon" />
            {!isCollapsed && <span>New Chat</span>}
          </button> */}
          {/* <button onClick={navigateToDiscover} className="nav-item">
            <FiCompass className="icon" />
            {!isCollapsed && <span>Discover</span>}
          </button> */}
          <button onClick={navigateToTests} className="nav-item">
            <FiFileText className="icon" />
            {!isCollapsed && <span>Test</span>}
          </button>
           <button onClick={navigateToPapers} className="nav-item">
            <FiFolder className="icon" />
            {!isCollapsed && <span>Papers</span>}
          </button>
          <button onClick={navigateToReports} className="nav-item">
            <FiTable className="icon" />
            {!isCollapsed && <span>Reports</span>}
          </button>
        </nav>

        <div className="recent-chats-container">
          {!isCollapsed && (
            <>
              <h4 className="recent-chats-title">
                {sidebarDisplaySubject ? `${sidebarDisplaySubject} Chats` : 'All Recent Chats'}
              </h4>
              {loadingPrompts && <p className="loading-text">Loading chats...</p>}
              {promptsError && <p className="error-text">{promptsError}</p>}
              {!loadingPrompts && !promptsError && filteredPrompts.length === 0 && (
                <p className="no-prompts-text">
                  {sidebarDisplaySubject
                    ? `No chats found for ${sidebarDisplaySubject}`
                    : 'No recent chats'}
                </p>
              )}
              {!loadingPrompts && !promptsError && filteredPrompts.length > 0 && (
                <div className="recent-chats-list">
                  {filteredPrompts.slice(0, isCollapsed ? 0 : 15).map((prompt) => ( // Show limited items
                    <div
                      key={prompt.id || prompt.timestamp} // Use a stable unique key
                      className="recent-chat-item"
                      onClick={() => loadPrompt(prompt)}
                      title={prompt.message}
                    >
                      <FiMessageSquare className="message-icon" />
                      {!isCollapsed && (
                        <span className="prompt-message">
                          {prompt.message.slice(0, 25)}{prompt.message.length > 25 ? '...' : ''}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="sidebar-utility">
            <button
              onClick={() => setShowWhiteboard(prev => !prev)}
              className={`nav-item utility-btn ${showWhiteboard ? 'active' : ''}`}
            >
              <FiClipboard className="icon" />
              {!isCollapsed && <span>{showWhiteboard ? 'Close Whiteboard' : 'Open Whiteboard'}</span>}
            </button>
        </div>

        <div className="sidebar-footer">
          <div className="profile-btn-container">
            <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="profile-btn">
              <FiUser className="icon" />
            </button>
            {showProfileMenu && (
              <div className="profile-menu">
                <div className="profile-menu-item" onClick={navigateToMyProfile}>
                  <FiUser className="menu-icon" /> My Profile
                </div>
                {/* <div className="profile-menu-item" onClick={navigateToSettings}>
                  <FiSettings className="menu-icon" /> Settings
                </div> */}
                <div className="profile-menu-item" onClick={toggleDarkModeInSidebar}>
                  {darkMode ? <span className="menu-icon">☀️</span> : <span className="menu-icon">🌙</span>}
                  {darkMode ? 'Light Mode' : 'Dark Mode'}
                </div>
                 <div className="profile-menu-item logout-item" onClick={handleLogout}>
                  <FiLogOut className="menu-icon" /> Logout
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;