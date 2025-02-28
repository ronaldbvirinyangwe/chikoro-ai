import React, { useState,  useEffect } from 'react';
import Greeting from '../Enrol/Greeting';
import './exercise.css'
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

const Exercise = () => {

  const { darkMode } = useTheme();
const navigate = useNavigate();
  const [menuVisible, setMenuVisible] = useState(false);
  const toggleMenu = () => {
    setMenuVisible(prevState => !prevState);
  };

  const closeMenu = () => {
    setMenuVisible(false);
  };
  
  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.classList.add('dark');
    }
}, []);
    return(
        <div className={`home ${darkMode ? 'dark' : ''}`}>
        <header className={`l-header ${darkMode ? 'dark' : ''}`}>
          <nav className="nav bd-grid">
              <a href="/subjectselect" className="nav__logo">
                <Greeting /> {/* Display the greeting */}
              </a>
  
               <div className={`nav__menu ${menuVisible ? 'show' : ''}`} id="nav-menu">
            <ul className="nav__list">
              <li className="nav__item">
                <a className="nav__link" onClick={() => navigate('/discover')}>Discover</a> {/* Use navigate */}
              </li>
              <li className="nav__item">
                <a className="nav__link" onClick={() => navigate('/test')}>Test</a> {/* Use navigate */}
              </li>
              <li className="nav__item">
                <a className="nav__link" onClick={() => navigate('/exercise')}>Exercise</a> {/* Use navigate */}
              </li>
              <li className="nav__item">
                <a className="nav__link" onClick={() => navigate('/reports')}>Reports</a> {/* Use navigate */}
              </li>
            </ul>
          </div>
            <link href='https://cdn.jsdelivr.net/npm/boxicons@2.0.5/css/boxicons.min.css' rel='stylesheet' />
            <div className="nav__toggle" id="nav-toggle">
              <i className='bx bx-menu'></i>
            </div>
          </nav>
        </header>
        </div>
    );
};

export default Exercise;
