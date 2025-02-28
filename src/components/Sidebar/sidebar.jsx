import React, { useState, useContext } from 'react';
import { FiHome, FiClipboard, FiFileText, FiTable, FiUser, FiMenu, FiX } from 'react-icons/fi';
import { assets } from '../../assets/assets';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from "react-router-dom";
import { Context } from '../../context/Context';
import './sidebar.css'

const Sidebar = () => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { darkMode, setDarkMode } = useTheme();
  const navigate = useNavigate();
  const [hoveredButton, setHoveredButton] = useState(null);
  const { setShowWhiteboard, showWhiteboard, newChat } = useContext(Context);

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
  };

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
        </div>

        {/* Bottom Section */}
        <div className="sidebar-bottom">
          <div 
            className="tooltip-container"
            onMouseEnter={() => setHoveredButton('')}
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
