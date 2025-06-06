import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaUserGraduate, FaEnvelope, FaBirthdayCake, FaGraduationCap, FaGlobe, FaStar } from 'react-icons/fa';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import './profile.css'; 
import Greeting from '../Enrol/Greeting';
import { Link } from 'react-router-dom';


const BASE_API_URL = 'https://atqtuew6syxese-4173.proxy.runpod.net';

/**
 * Profile Component
 * Fetches and displays the profile information for the currently authenticated user.
 * Relies entirely on external CSS for styling.
 */
function Profile() {
  const { darkMode } = useTheme(); // This context should manage adding/removing the 'dark' class on <body> or a root div
  const { user, isAuthenticated, accessToken, loading: authLoading, error: authError, logout } = useAuth();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      // Wait for authentication state to be determined
      if (authLoading) {
        return;
      }

      // If not authenticated or user data is missing (especially email), handle accordingly
      if (!isAuthenticated || !user || !user.email) {
        console.warn("Profile.jsx: User not authenticated or email missing. Redirecting to login.");
        setError("You must be logged in to view this profile.");
        setLoading(false);
        return;
      }

      const userEmail = user.email.toLowerCase(); // Ensure email is lowercased for lookup

      setLoading(true); // Start loading for data fetch
      setError(null);   // Clear previous errors

      try {
        console.log(`Profile.jsx: Attempting to fetch profile for: ${userEmail}`);
        const response = await axios.get(`${BASE_API_URL}/students/by-email/${userEmail}`, {
          headers: {
            Authorization: `Bearer ${accessToken}` // Include the access token for authorization
          }
        });

        if (response.data) {
          console.log("Profile.jsx: Student found:", response.data.name);
          setStudent(response.data);
        } else {
          console.log("Profile.jsx: No student data received.");
          setError("No student data found for this user.");
          setStudent(null);
        }
      } catch (err) {
        console.error("Profile.jsx: Error fetching student profile:", err);
        if (err.response) {
          if (err.response.status === 404) {
            setError("Student profile not found. Please ensure you are enrolled.");
            setStudent(null);
          } else if (err.response.status === 401 || err.response.status === 403) {
            setError("Session expired or unauthorized. Please log in again.");
            console.warn("Profile.jsx: Authentication error fetching profile. Logging out.");
            logout();
          } else {
            setError(err.response.data.error || `Server error: ${err.response.status}`);
          }
        } else if (err.request) {
          setError("Network error: Could not connect to the server. Please check your internet connection.");
        } else {
          setError("An unexpected error occurred. Please try again.");
        }
      } finally {
        setLoading(false); // Data fetch attempt completed
      }
    };

    fetchUserProfile();

    // Dependencies: Re-run when auth state or user/token changes
  }, [authLoading, isAuthenticated, user, accessToken, navigate, logout]);

  const [menuVisible, setMenuVisible] = React.useState(false); 
    const toggleMenu = useCallback(() => setMenuVisible(prev => !prev), []);
    const closeMenu = useCallback(() => setMenuVisible(false), []);
  // --- Conditional Rendering ---
  if (authLoading || loading) {
    return (
      <div className="page-container">
        <div className="profile-card loading-message">
          <p className="loading-text animate-pulse">Loading student profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="alert-box error">
          <strong className="alert-title">Error!</strong>
          <span className="alert-message"> {error}</span>
          {error.includes("logged in") && (
              <button
                onClick={() => navigate('/login')}
                className="modern-button"
              >
                Go to Login
              </button>
          )}
        </div>
      </div>
    );
  }

  // If student is null and no error, it means user is authenticated but no profile found.
  // This can happen if they need to enrol first.
  if (!student) {
    return (
      <div className="page-container">
        <div className="alert-box info">
          <strong className="alert-title">Information!</strong>
          <span className="alert-message"> No student profile found for your account. Please enroll first.</span>
          <button
            onClick={() => navigate('/enrol')}
            className="modern-button"
          >
            Go to Enrollment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
         <header className={`l-header ${darkMode ? 'dark' : ''}`}>
                  <nav className="nav bd-grid">
                  <Link to="/subjectselect" className="nav__logo">
                    <Greeting />
                  </Link>
        
                       {/* Navigation Menu */}
                       {/* Use onClick with navigate for internal links and close menu */}
                       <div className={`nav__menu ${menuVisible ? 'show' : ''}`} id="nav-menu">
                    <ul className="nav__list">
                      {/* <li className="nav__item"><a className="nav__link" onClick={() => { navigate('/discover'); closeMenu(); }}>Discover</a></li> */}
                      <li className="nav__item"><a className="nav__link" onClick={() => { navigate('/test'); closeMenu(); }}>Test</a></li>
                      <li className="nav__item"><a className="nav__link" onClick={() => { navigate('/papers'); closeMenu(); }}>Exam Papers</a></li>
                      <li className="nav__item"><a className="nav__link" onClick={() => { navigate('/reports'); closeMenu(); }}>Reports</a></li>
                    </ul>
                  </div>
                    {/* Boxicons for menu toggle */}
                    <link href='https://cdn.jsdelivr.net/npm/boxicons@2.0.5/css/boxicons.min.css' rel='stylesheet' />
                    {/* Menu toggle button */}
                    <div className="nav__toggle" id="nav-toggle" onClick={toggleMenu} role="button" aria-label="Toggle navigation menu" aria-expanded={menuVisible}>
                      <i className='bx bx-menu'></i>
                    </div>
                  </nav>
                </header>
      <div className="profile-card">
        <div className="profile-items-container">
          <div className="profile-item">
            <FaUserGraduate />
            <div className="label-group">
              <label>Name:</label>
              <p>{student.name}</p>
            </div>
          </div>

          <div className="profile-item">
            <FaEnvelope />
            <div className="label-group">
              <label>Email:</label>
              <p>{student.email}</p>
            </div>
          </div>

          {student.age && (
            <div className="profile-item">
              <FaBirthdayCake />
              <div className="label-group">
                <label>Age:</label>
                <p>{student.age}</p>
              </div>
            </div>
          )}

          {student.academicLevel && (
            <div className="profile-item">
              <FaGraduationCap />
              <div className="label-group">
                <label>Academic Level:</label>
                <p>{student.academicLevel}</p>
              </div>
            </div>
          )}

          {student.curriculum && (
            <div className="profile-item">
              <FaGlobe />
              <div className="label-group">
                <label>Curriculum:</label>
                <p>{student.curriculum}</p>
              </div>
            </div>
          )}

          {student.grade && (
            <div className="profile-item">
              <FaStar />
              <div className="label-group">
                <label>Grade:</label>
                <p>{student.grade}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;