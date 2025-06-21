import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { FaUserGraduate, FaEnvelope, FaBirthdayCake, FaGraduationCap, FaGlobe, FaStar } from 'react-icons/fa';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import './profile.css';
import Sidebar from '../Sidebar/sidebar';

// ✅ FIX: Use the relative path to go through the Vite proxy
const BASE_API_URL = '/api/v1';

function Profile() {
    const { darkMode } = useTheme();
    const { user, isAuthenticated, accessToken, loading: authLoading, logout } = useAuth();
    const navigate = useNavigate();

      const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
            () => JSON.parse(localStorage.getItem('sidebarCollapsed')) || false
        );
  useEffect(() => {
      const checkSidebarState = () => {
          const collapsedState = JSON.parse(localStorage.getItem('sidebarCollapsed')) || false;
          setIsSidebarCollapsed(collapsedState);
      };
      // Note: An interval is inefficient for this. A better solution would be to
      // use a custom hook that listens to 'storage' events. But for a direct fix,
      // this maintains the original logic.
      const interval = setInterval(checkSidebarState, 500);
      return () => clearInterval(interval);
  }, []);

    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUserProfile = async () => {
            if (authLoading) return;

            if (!isAuthenticated || !user?.email) {
                setError("You must be logged in to view this profile.");
                setLoading(false);
                return;
            }

            const userEmail = user.email.toLowerCase();
            setLoading(true);
            setError(null);

            try {
                console.log(`Profile.jsx: Attempting to fetch profile for: ${userEmail}`);
                const response = await axios.get(`${BASE_API_URL}/students/by-email/${userEmail}`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (response.data) {
                    setStudent(response.data);
                } else {
                    setError("No student data found for this user.");
                }
            } catch (err) {
                console.error("Profile.jsx: Error fetching student profile:", err);
                if (err.response) {
                    if (err.response.status === 404) {
                        setError("Student profile not found. Have you enrolled yet?");
                        navigate('/enrol'); // Guide user to the enrollment page
                    } else if (err.response.status === 401 || err.response.status === 403) {
                        setError("Session expired or unauthorized. Please log in again.");
                        logout();
                    } else {
                        setError(err.response.data.error || `Server error: ${err.response.status}`);
                    }
                } else {
                    setError("Network error: Could not connect to the server.");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, [authLoading, isAuthenticated, user, accessToken, navigate, logout]);

    const [menuVisible, setMenuVisible] = useState(false);
    const toggleMenu = useCallback(() => setMenuVisible(prev => !prev), []);
    const closeMenu = useCallback(() => setMenuVisible(false), []);

    if (authLoading || loading) {
        return (
            <div className="page-container">
                <div className="profile-card loading-message">
                    <p className="loading-text animate-pulse">Loading Student Profile...</p>
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
                        <button onClick={() => navigate('/login')} className="modern-button">Go to Login</button>
                    )}
                </div>
            </div>
        );
    }

    if (!student) {
        // This case is now handled by the 404 redirect, but kept as a fallback.
        return (
            <div className="page-container">
                <div className="alert-box info">
                    <strong className="alert-title">Profile Not Found</strong>
                    <span className="alert-message">We couldn't find an enrolled profile for your account.</span>
                    <button onClick={() => navigate('/enrol')} className="modern-button">Enroll Now</button>
                </div>
            </div>
        );
    }

    return (
       <div className={`page-container ${darkMode ? 'dark' : ''}`}>

       <Sidebar />

              <main className={`profile-card ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                <div className="profile-items-container">
                    <div className="profile-item"><FaUserGraduate /><div className="label-group"><label>Name:</label><p>{student.name}</p></div></div>
                    <div className="profile-item"><FaEnvelope /><div className="label-group"><label>Email:</label><p>{student.email}</p></div></div>
                    {student.age && <div className="profile-item"><FaBirthdayCake /><div className="label-group"><label>Age:</label><p>{student.age}</p></div></div>}
                    {student.academicLevel && <div className="profile-item"><FaGraduationCap /><div className="label-group"><label>Academic Level:</label><p>{student.academicLevel}</p></div></div>}
                    {student.curriculum && <div className="profile-item"><FaGlobe /><div className="label-group"><label>Curriculum:</label><p>{student.curriculum}</p></div></div>}
                    {student.grade && <div className="profile-item"><FaStar /><div className="label-group"><label>Grade:</label><p>{student.grade}</p></div></div>}
                </div>
                </main>
            </div>

    );
}

export default Profile;
