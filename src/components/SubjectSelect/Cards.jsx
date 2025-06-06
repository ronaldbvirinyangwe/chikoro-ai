import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { assets } from '../../assets/assets';
import './cards.css';
import Greeting from '../Enrol/Greeting';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';



const ALL_SUBJECTS_DATA = [
    { id: 'P_ZIM_SHO', name: 'Shona', iconKey: 'shona', level: 'primary', curriculum: 'zimsec' },
    { id: 'P_ZIM_ENG', name: 'English', iconKey: 'english', level: 'primary', curriculum: 'zimsec' },
    { id: 'P_ZIM_NDE', name: 'Isindebele', iconKey: 'ndebele', level: 'primary', curriculum: 'zimsec' },
    { id: 'P_ZIM_SCI', name: 'Science', iconKey: 'science', level: 'primary', curriculum: 'zimsec' },
    { id: 'P_ZIM_MTH', name: 'Maths', iconKey: 'maths', level: 'primary', curriculum: 'zimsec' },
    { id: 'P_ZIM_HER', name: 'Heritage', iconKey: 'heritage', level: 'primary', curriculum: 'zimsec' },
    { id: 'P_ZIM_FRM', name: 'FAREME', iconKey: 'fareme', level: 'primary', curriculum: 'zimsec' },
    { id: 'P_ZIM_HEC', name: 'Home Economics', iconKey: 'home_eco', level: 'primary', curriculum: 'zimsec' },
    { id: 'P_ZIM_AGR', name: 'Agriculture', iconKey: 'agriculture', level: 'primary', curriculum: 'zimsec' },
    { id: 'P_ZIM_ICT', name: 'Computer Science', iconKey: 'computers', level: 'primary', curriculum: 'zimsec' },
    { id: 'P_ZIM_MUS', name: 'Music', iconKey: 'music', level: 'primary', curriculum: 'zimsec' },
    { id: 'P_ZIM_ART', name: 'Art', iconKey: 'art', level: 'primary', curriculum: 'zimsec' },
    { id: 'P_ZIM_PED', name: 'Physical Education(PE)', iconKey: 'pe', level: 'primary', curriculum: 'zimsec' },

    // --- Primary School Subjects (Cambridge) ---

    { id: 'P_CAM_ENG', name: 'English (Cambridge)', iconKey: 'english', level: 'primary', curriculum: 'cambridge' },
    { id: 'P_CAM_SCI', name: 'Science (Cambridge)', iconKey: 'science', level: 'primary', curriculum: 'cambridge' },
    { id: 'P_CAM_MTH', name: 'Maths (Cambridge)', iconKey: 'maths', level: 'primary', curriculum: 'cambridge' },

    // --- Secondary School Subjects (Zimsec) ---
    { id: 'S_ZIM_BIO', name: 'Biology', iconKey: 'biology', level: 'secondary', curriculum: 'zimsec' },
      { id: 'S_ZIM_MTH', name: 'Mathematics', iconKey: 'maths', level: 'secondary', curriculum: 'zimsec' },
    { id: 'S_ZIM_CSC', name: 'Combined Science', iconKey: 'science', level: 'secondary', curriculum: 'zimsec' },
    { id: 'S_ZIM_CHE', name: 'Chemistry', iconKey: 'chemistry', level: 'secondary', curriculum: 'zimsec' },
    { id: 'S_ZIM_ECO', name: 'Economics', iconKey: 'economics', level: 'secondary', curriculum: 'zimsec' },
    { id: 'S_ZIM_BUS', name: 'Business Studies', iconKey: 'business', level: 'secondary', curriculum: 'zimsec' },
    { id: 'S_ZIM_ACC', name: 'Accounting', iconKey: 'accounts', level: 'secondary', curriculum: 'zimsec' },
    { id: 'S_ZIM_COM', name: 'Commerce', iconKey: 'commerce', level: 'secondary', curriculum: 'zimsec' },
    { id: 'S_ZIM_PHY', name: 'Physics', iconKey: 'physics', level: 'secondary', curriculum: 'zimsec' },
    { id: 'S_ZIM_GEO', name: 'Geography', iconKey: 'geography', level: 'secondary', curriculum: 'zimsec' },
    { id: 'S_ZIM_WDW', name: 'Woodwork', iconKey: 'woodwork', level: 'secondary', curriculum: 'zimsec' },
    { id: 'S_ZIM_MTW', name: 'Metal Work', iconKey: 'metal', level: 'secondary', curriculum: 'zimsec' },
    { id: 'S_ZIM_HIS', name: 'History', iconKey: 'history', level: 'secondary', curriculum: 'zimsec' },
    { id: 'S_ZIM_FNU', name: 'Food and Nutrition', iconKey: 'foods', level: 'secondary', curriculum: 'zimsec' },
    { id: 'S_ZIM_FAF', name: 'Fashion and Fabrics', iconKey: 'fashion', level: 'secondary', curriculum: 'zimsec' },
    { id: 'S_ZIM_TGR', name: 'Technical Graphics', iconKey: 'technical', level: 'secondary', curriculum: 'zimsec' },
     { id: 'S_ZIM_ICT', name: 'Computer Science', iconKey: 'computers', level: 'secondary', curriculum: 'zimsec' },
  

    // --- Secondary School Subjects (Cambridge) ---
     { id: 'S_CAM_BIO', name: 'Biology ', iconKey: 'biology', level: 'secondary', curriculum: 'cambridge' },
    { id: 'S_CAM_CSC', name: 'Co-ordinated Sciences ', iconKey: 'science', level: 'secondary', curriculum: 'cambridge' },
    { id: 'S_CAM_CHE', name: 'Chemistry ', iconKey: 'chemistry', level: 'secondary', curriculum: 'cambridge' },
    { id: 'S_CAM_ECO', name: 'Economics ', iconKey: 'economics', level: 'secondary', curriculum: 'cambridge' },
    { id: 'S_CAM_BUS', name: 'Business Studies ', iconKey: 'business', level: 'secondary', curriculum: 'cambridge' },
     { id: 'S_CAM_MTH', name: 'Mathematics', iconKey: 'maths', level: 'secondary', curriculum: 'cambridge' },
    { id: 'S_CAM_ACC', name: 'Accounting ', iconKey: 'accounts', level: 'secondary', curriculum: 'cambridge' },
    { id: 'S_CAM_COM', name: 'Commerce ', iconKey: 'commerce', level: 'secondary', curriculum: 'cambridge' },
    { id: 'S_CAM_PHY', name: 'Physics ', iconKey: 'physics', level: 'secondary', curriculum: 'cambridge' },
    { id: 'S_CAM_GEO', name: 'Geography ', iconKey: 'geography', level: 'secondary', curriculum: 'cambridge' },
    { id: 'S_CAM_DTW', name: 'Woodwork ', iconKey: 'woodwork', level: 'secondary', curriculum: 'cambridge' },
    { id: 'S_CAM_DTM', name: 'Metal Work ', iconKey: 'metal', level: 'secondary', curriculum: 'cambridge' },
    { id: 'S_CAM_HIS', name: 'History ', iconKey: 'history', level: 'secondary', curriculum: 'cambridge' },
    { id: 'S_CAM_FNU', name: 'Food & Nutrition', iconKey: 'foods', level: 'secondary', curriculum: 'cambridge' },
    { id: 'S_CAM_FAF', name: 'Fashion & Textiles ', iconKey: 'fashion', level: 'secondary', curriculum: 'cambridge' },
    { id: 'S_CAM_TGR', name: 'Design & Technology', iconKey: 'technical', level: 'secondary', curriculum: 'cambridge' },
     { id: 'S_CAM_ICT', name: 'Computer Science', iconKey: 'computers', level: 'secondary', curriculum: 'cambridge' }
];


const CardSection = ({ handleCardClick }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const { darkMode, setDarkMode } = useTheme();
  const navigate = useNavigate();
  // const { accessToken } = useAuth(); 

   const { logout: performUserLogout } = useAuth(); 

  // --- State for current curriculum ---
  // Initialize from localStorage, default to 'zimsec' if not found
  const [currentCurriculum, setCurrentCurriculum] = useState(
    () => localStorage.getItem('studentCurriculum') || 'zimsec'
  );

  const [displaySubjects, setDisplaySubjects] = useState([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);

  // --- Function to handle curriculum change ---
  const handleChangeCurriculum = useCallback(() => {
    const newCurriculum = currentCurriculum === 'zimsec' ? 'cambridge' : 'zimsec';
    localStorage.setItem('studentCurriculum', newCurriculum);
    setCurrentCurriculum(newCurriculum);
    closeMenu(); // Close menu if open
    console.log("Curriculum switched to:", newCurriculum);

    // --- Optional: Save curriculum preference to backend ---
    // const studentId = localStorage.getItem('studentId');
    // if (studentId && accessToken) {
    //   axios.put(
    //     `https://chikoro-ai.com/students/${studentId}/curriculum`, // Replace with your actual API base URL
    //     { curriculum: newCurriculum },
    //     { headers: { Authorization: `Bearer ${accessToken}` } }
    //   )
    //   .then(response => console.log("Curriculum preference saved to backend.", response.data))
    //   .catch(error => console.error("Error saving curriculum preference to backend:", error));
    // }
    // --- End Optional Backend Save ---

  }, [currentCurriculum /*, accessToken */]);


  useEffect(() => {
    const studentLevel = localStorage.getItem('studentAcademicLevel');
    // currentCurriculum (from state) is now the source of truth for filtering
    // It's initialized from localStorage and updated by handleChangeCurriculum

    console.log("CardSection useEffect: Student Level:", studentLevel, "Current Curriculum (from state):", currentCurriculum);

    if (studentLevel && currentCurriculum) {
      const filtered = ALL_SUBJECTS_DATA.filter(subject =>
        subject.level === studentLevel &&
        subject.curriculum === currentCurriculum // Use state variable here
      );
      setDisplaySubjects(filtered);
      console.log("CardSection useEffect: Filtered Subjects:", filtered.length, filtered);
    } else {
      console.warn("CardSection: Student academic level or current curriculum not available. Cannot filter subjects.");
      setDisplaySubjects([]);
    }
    setIsLoadingSubjects(false);
  }, [currentCurriculum]); // Re-run this effect when currentCurriculum changes

  const toggleMenu = () => setMenuVisible(prevState => !prevState);
  const closeMenu = () => setMenuVisible(false);
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    closeMenu();
  };

  const handleLogout = () => {
    if (performUserLogout) {
      performUserLogout(); // Call the actual logout function from context
      // Optionally, navigate to login page or home after logout
      // navigate('/login');
      console.log("User logged out.");
    } else {
      console.error("Logout function not available from AuthContext");
    }
    closeMenu(); // Also close menu if it's open
  };

  return (
    <div className={`home ${darkMode ? 'dark-theme-variables' : ''}`}>
      <header className="l-header">
        <nav className="nav bd-grid">
          <Link to="/subjectselect" className="nav__logo">
            <Greeting />
          </Link>
          <div className={`nav__menu ${menuVisible ? 'show' : ''}`} id="nav-menu">
            <ul className="nav__list">
              {/* <li className="nav__item">
                <a className="nav__link" onClick={() => { navigate('/discover'); closeMenu(); }}>Discover</a>
              </li> */}
              <li className="nav__item">
                <a className="nav__link" onClick={() => { navigate('/test'); closeMenu(); }}>Test</a>
              </li>
              <li className="nav__item">
                <a className="nav__link" onClick={() => { navigate('/papers'); closeMenu(); }}>Exam Papers</a>
              </li>
              <li className="nav__item">
                <a className="nav__link" onClick={() => { navigate('/reports'); closeMenu(); }}>Reports</a>
              </li>
              {/* --- Curriculum Switcher Button --- */}
              <li className="nav__item">
                <button
                  className=" curriculum-toggle" // Add a class for styling
                  onClick={handleChangeCurriculum}
                  aria-label={`Switch to ${currentCurriculum === 'zimsec' ? 'Cambridge' : 'Zimsec'} curriculum`}
                >
                  Switch to {currentCurriculum === 'zimsec' ? 'Cambridge' : 'Zimsec'}
                </button>
              </li>
              {/* --- End Curriculum Switcher Button --- */}
              <li className="nav__item">
                <button
                  id="dark-light-mode"
                  className={`nav__link theme-toggle ${darkMode ? 'dark' : 'light'}`}
                  onClick={toggleDarkMode}
                  aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  <span className="theme-toggle__icon">
                    {darkMode ? <i className="fas fa-sun"></i> : <i className="fas fa-moon"></i>}
                  </span>
                  <span className="theme-toggle__text">
                    {darkMode ? 'Light Mode' : 'Dark Mode'}
                  </span>
                </button>
              </li>
            </ul>
          </div>
          <link href='https://cdn.jsdelivr.net/npm/boxicons@2.0.5/css/boxicons.min.css' rel='stylesheet' />
          <div className="nav__toggle" id="nav-toggle" onClick={toggleMenu}>
            <i className='bx bx-menu'></i>
          </div>
        </nav>
      </header>

      <div className="cards">
        {isLoadingSubjects ? (
          <p className="info-message">Loading subjects...</p>
        ) : displaySubjects.length > 0 ? (
          displaySubjects.map((subject) => (
            <div
              key={subject.id}
              className="card"
              onClick={() => handleCardClick(subject.name)}
            >
              <p>{subject.name}</p>
              {assets[subject.iconKey] ? (
                <img
                  src={assets[subject.iconKey]}
                  alt={`${subject.name} icon`}
                />
              ) : (
                <div className="icon-placeholder">Icon not found</div>
              )}
            </div>
          ))
        ) : (
          <p className="info-message">
            No subjects available for your enrolled level and selected curriculum ({currentCurriculum}).
            {/* Use the handleLogout function for this button as well */}
            Please <button onClick={handleLogout} className="inline-link-button">logout</button> and check your enrollment details or try switching the curriculum.
          </p>
        )}
      </div>
    </div>
  );
};

export default CardSection;