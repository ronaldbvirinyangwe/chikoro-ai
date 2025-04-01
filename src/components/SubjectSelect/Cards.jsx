import React, { useState } from 'react';
import { assets } from '../../assets/assets'; // Import assets
import './cards.css';
import Greeting from '../Enrol/Greeting';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

const CardSection = ({ handleCardClick }) => {
  const [menuVisible, setMenuVisible] = useState(false);

    const cardMessages = [
    "Shona", "English", "Maths", "Science", "Physical Education(PE)",
    "Heritage", "FAREME", "Home Economics", "Agriculture", "Computer Science",
    "Music", "Art", "Biology", "Combined Science", "Chemistry",
    "Economics", "Business Studies", "Accounting", "Commerce", "Physics",
    "Geography", "Woodwork", "Metal Work", "History", "Food and Nutrition",
    "Fashion and Fabrics", "Technical Graphics"
  ];

const navigate = useNavigate();

  const cardIcons = [
    "shona", "english", "maths", "science", "pe", 
    "heritage", "fareme", "home_eco", "agriculture", "computers", 
    "music", "art", "biology", "science", "chemistry", 
    "economics", "business", "accounts", "commerce", "physics", 
    "geography", "woodwork", "metal", "history", "foods", 
    "fashion", "technical", "code_icon"
  ];

  const toggleMenu = () => {
    setMenuVisible(prevState => !prevState);
  };

  const closeMenu = () => {
    setMenuVisible(false);
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
