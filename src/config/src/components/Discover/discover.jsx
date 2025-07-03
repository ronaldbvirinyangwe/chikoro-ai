import Greeting from '../Enrol/Greeting';
import './discover.css'
import { useNavigate, Link } from 'react-router-dom';
import React, {useState} from 'react'

const Discover = () => {

 const [menuVisible, setMenuVisible] = useState(false);

  const navigate = useNavigate(); 
 const toggleMenu = () => {
    setMenuVisible(prevState => !prevState);
  };

  const closeMenu = () => {
    setMenuVisible(false);
  };
    return(
        <div className="home">
        <header className="l-header">
          <nav className="nav bd-grid">
              <Link to="/subjectselect" className="nav__logo">
                          <Greeting />
                        </Link>
  
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

            <link href='https://cdn.jsdelivr.net/npm/boxicons@2.0.5/css/boxicons.min.css' rel='stylesheet' />
            <div className="nav__toggle" id="nav-toggle"onClick={toggleMenu}>
              <i className='bx bx-menu'></i>
            </div>
          </nav>
        </header>

        <div className="video-section">
        <iframe
          src="https://www.youtube.com/embed/7v0YwyU0274?start=7"  // Replace with your video URL or ID
          title="Infomercial Video"
          frameBorder="0"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
        <iframe
          src="https://www.youtube.com/embed/7v0YwyU0274?start=7" 
          title="Infomercial Video"
          frameBorder="0"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
        <iframe
          src="https://www.youtube.com/embed/7v0YwyU0274?start=7" 
          title="Infomercial Video"
          frameBorder="0"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
        <iframe
          src="https://www.youtube.com/embed/7v0YwyU0274?start=7" 
          title="Infomercial Video"
          frameBorder="0"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
        <iframe
          src="https://www.youtube.com/embed/7v0YwyU0274?start=7" 
          title="Infomercial Video"
          frameBorder="0"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
        <iframe
          src="https://www.youtube.com/embed/7v0YwyU0274?start=7" 
          title="Infomercial Video"
          frameBorder="0"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
        <iframe
          src="https://www.youtube.com/embed/7v0YwyU0274?start=7" 
          title="Infomercial Video"
          frameBorder="0"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
        <iframe
          src="https://www.youtube.com/embed/7v0YwyU0274?start=7" 
          title="Infomercial Video"
          frameBorder="0"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
        <iframe
          src="https://www.youtube.com/embed/7v0YwyU0274?start=7" 
          title="Infomercial Video"
          frameBorder="0"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
        <iframe
          src="https://www.youtube.com/embed/7v0YwyU0274?start=7" 
          title="Infomercial Video"
          frameBorder="0"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
        <iframe
          src="https://www.youtube.com/embed/7v0YwyU0274?start=7" 
          title="Infomercial Video"
          frameBorder="0"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
        <iframe
          src="https://www.youtube.com/embed/7v0YwyU0274?start=7" 
          title="Infomercial Video"
          frameBorder="0"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
        <iframe
          src="https://www.youtube.com/embed/7v0YwyU0274?start=7" 
          title="Infomercial Video"
          frameBorder="0"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>

        </div>
    );
};

export default Discover;