import React, { useState } from 'react';
import { assets } from '../../assets/assets'; // Import assets
import './cards.css';
import Greeting from '../Enrol/Greeting';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const CardSection = ({ handleCardClick }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const { darkMode, setDarkMode } = useTheme();

    const cardMessages = [
    "Shona", "English", "Isindebele", "Science", "Maths",
    "Heritage", "FAREME", "Home Economics", "Agriculture", "Computer Science",
    "Music", "Art", "Biology", "Combined Science", "Chemistry",
    "Economics", "Business Studies", "Accounting", "Commerce", "Physics",
    "Geography", "Woodwork", "Metal Work", "History", "Food and Nutrition",
    "Fashion and Fabrics", "Technical Graphics", "Physical Education(PE)"
  ];

const navigate = useNavigate();

  const cardIcons = [
    "shona", "english", "ndebele", "science", "maths", 
    "heritage", "fareme", "home_eco", "agriculture", "computers", 
    "music", "art", "biology", "science", "chemistry", 
    "economics", "business", "accounts", "commerce", "physics", 
    "geography", "woodwork", "metal", "history", "foods", 
    "fashion", "technical", "pe"
  ];

  const toggleMenu = () => {
    setMenuVisible(prevState => !prevState);
  };

  const closeMenu = () => {
    setMenuVisible(false);
  };
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    closeMenu();
  };

  return (
    <div className="home">
      <header className="l-header">
        <nav className="nav bd-grid">
          <Link to="/subjectselect" className="nav__logo">
  <Greeting /> {/* Display the greeting */}
</Link>

          {/* Apply the 'show' class based on the 'menuVisible' state */}
           <div className={`nav__menu ${menuVisible ? 'show' : ''}`} id="nav-menu">
            <ul className="nav__list">
              <li className="nav__item">
                <a className="nav__link" onClick={() => navigate('/discover')}>Discover</a> {/* Use navigate */}
              </li>
              <li className="nav__item">
                <a className="nav__link" onClick={() => navigate('/test')}>Test</a> {/* Use navigate */}
              </li>
             <li className="nav__item">
                <a className="nav__link" onClick={() => navigate('/papers')}>Exam Papers</a> {/* Use navigate */}
              </li>
              <li className="nav__item">
                <a className="nav__link" onClick={() => navigate('/reports')}>Reports</a> {/* Use navigate */}
              </li>
              <li className="nav__item">
                <a className="nav__link" onClick={() => navigate('/reports')}>Switch to zimsec</a> {/* Use navigate */}
              </li>
              <li className="nav__item">
  <button 
  id="dark-light-mode"
    className={`nav__link theme-toggle ${darkMode ? 'dark' : 'light'}`}
    onClick={toggleDarkMode}
    aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
  >
    <span className="theme-toggle__icon">
      {darkMode ? (
        // Sun icon for light mode
        <i className="fas fa-sun"></i>
      ) : (
        // Moon icon for dark mode
        <i className="fas fa-moon"></i>
      )}
    </span>
    <span className="theme-toggle__text">
      {darkMode ? 'Light Mode' : 'Dark Mode'}
    </span>
  </button>
</li>
            </ul>
          </div>

          {/* Boxicon Menu Toggle */}
          <link href='https://cdn.jsdelivr.net/npm/boxicons@2.0.5/css/boxicons.min.css' rel='stylesheet' />
          <div className="nav__toggle" id="nav-toggle" onClick={toggleMenu}>
            <i className='bx bx-menu'></i>
          </div>
        </nav>
      </header>

      {/* Cards Section */}
      <div className="cards">
        {cardMessages.map((message, index) => (
          <div 
            key={index} 
            className="card" 
            onClick={() => handleCardClick(message)} // Pass the subject to handleCardClick
          >
            <p>{message}</p>
            <img 
              src={assets[cardIcons[index]]}  // Use the predefined icons array
              alt={`${message} icon`}  // More descriptive alt text
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CardSection;