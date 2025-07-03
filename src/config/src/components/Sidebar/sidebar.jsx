import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { 
    FiHome, FiClipboard, FiFileText, FiTable, FiUser, FiMenu, FiX, 
    FiMessageSquare, FiChevronsLeft, FiChevronsRight, 
    FiLogOut, FiFolder
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
    const [loadingPrompts, setLoadingPrompts] = useState(false);
    const [promptsError, setPromptsError] = useState('');
    
    const { 
        darkMode, 
        setDarkMode 
    } = useTheme();

    const {
        newChat,
        setRecentPrompt,
        setInput,
        setSelectedSubject,
        showWhiteboard,
        setShowWhiteboard,
        selectedSubject: contextSelectedSubject
    } = useContext(Context);

    const navigate = useNavigate();
    const BASE_API_URL = '/api/v1';

    const [sidebarDisplaySubject, setSidebarDisplaySubject] = useState(contextSelectedSubject || localStorage.getItem('selectedSubject') || '');

    useEffect(() => {
        setSidebarDisplaySubject(contextSelectedSubject || localStorage.getItem('selectedSubject') || '');
    }, [contextSelectedSubject]);

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => JSON.parse(localStorage.getItem('sidebarCollapsed')) || false
  );

  // This useEffect you already have is perfect for keeping the state in sync
  useEffect(() => {
      const checkSidebarState = () => {
          const collapsedState = JSON.parse(localStorage.getItem('sidebarCollapsed')) || false;
          setIsSidebarCollapsed(collapsedState);
      };
      // Check periodically in case it's changed in another tab (optional but good practice)
      const interval = setInterval(checkSidebarState, 500); 
      return () => clearInterval(interval);
  }, []);


    useEffect(() => {
        const fetchPreviousPrompts = async () => {
            setLoadingPrompts(true);
            setPromptsError('');
            const profileId = localStorage.getItem('profileId');
            const accessToken = localStorage.getItem('accessToken');

            if (!profileId || !accessToken) {
                setLoadingPrompts(false);
                return;
            }

            try {
                // Fetch the entire student document to get all chat histories
                const studentResponse = await axios.get(`${BASE_API_URL}/students/${profileId}`, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });

                const studentData = studentResponse.data;
                const allPrompts = [];

                if (studentData && studentData.chatHistory) {
                    Object.entries(studentData.chatHistory).forEach(([subject, chats]) => {
                        if (Array.isArray(chats)) {
                            chats.forEach(chat => {
                                if (chat.type === 'user' && chat.message && chat.message.trim() !== '') {
                                    allPrompts.push({
                                        id: chat._id || `prompt_${chat.timestamp}_${subject}`,
                                        subject: subject,
                                        message: chat.message,
                                        timestamp: chat.timestamp
                                    });
                                }
                            });
                        }
                    });
                }
                
                // Sort by most recent first
                setFetchedPrompts(allPrompts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
                
            } catch (err) {
                console.error('SIDEBAR: Failed to fetch previous prompts:', err);
                setPromptsError('Failed to load recent chats.');
            } finally {
                setLoadingPrompts(false);
            }
        };

        fetchPreviousPrompts();
    }, []); // Fetch only when the component first mounts.

    const toggleDarkModeInSidebar = () => {
        setDarkMode(!darkMode);
        setShowProfileMenu(false);
    };

    const navigateToHome = () => {
        setSelectedSubject("");
        newChat();
        navigate("/subjectselect");
        if (isSidebarOpen) setIsSidebarOpen(false);
    };

    const loadPrompt = async (clickedPrompt) => {
        if (!clickedPrompt || !clickedPrompt.subject || !clickedPrompt.message) {
            return;
        }
        setSelectedSubject(clickedPrompt.subject);
        setInput(clickedPrompt.message); 
        setRecentPrompt(clickedPrompt.message);
        navigate("/", { 
            state: { 
                scrollToTimestamp: clickedPrompt.timestamp,
                selectedSubjectOnClick: clickedPrompt.subject 
            } 
        });
        if (isSidebarOpen) setIsSidebarOpen(false); 
    };

    const getFilteredPrompts = () => {
        if (!sidebarDisplaySubject) return fetchedPrompts;
        return fetchedPrompts.filter(prompt => prompt.subject === sidebarDisplaySubject);
    };
    const filteredPrompts = getFilteredPrompts();

    const navigateToTests = () => { navigate("/test"); if (isSidebarOpen) setIsSidebarOpen(false); };
    const navigateToPapers = () => { navigate("/papers"); if (isSidebarOpen) setIsSidebarOpen(false); };
    const navigateToReports = () => { navigate("/reports"); if (isSidebarOpen) setIsSidebarOpen(false); };
    const navigateToMyProfile = () => { navigate("/profile"); setShowProfileMenu(false); if (isSidebarOpen) setIsSidebarOpen(false); };

    const handleLogout = () => {
        localStorage.clear();
        setSelectedSubject("");
        newChat();
        navigate("/login");
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

            <div className={`sidebar ${darkMode ? 'dark-theme' : ''} ${isSidebarOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-header">
                    <img src={assets.logo} alt="Logo" className="logo" />
                    {!isSidebarOpen && (
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
                                    {filteredPrompts.slice(0, 15).map((prompt) => (
                                        <div
                                            key={prompt.id || prompt.timestamp}
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
