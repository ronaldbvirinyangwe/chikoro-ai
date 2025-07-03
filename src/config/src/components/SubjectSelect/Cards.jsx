import React, { useState, useEffect, useCallback,useContext } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import Greeting from '../Enrol/Greeting';
import Sidebar from '../Sidebar/sidebar'; 
import './cards.css';
import { assets } from '../../assets/assets';
import { Context } from '../../context/Context';

const BASE_API_URL = '/api/v1';
const Icon = ({ className }) => <i className={className}></i>;

const CardSection = ({ handleCardClick }) => {
    const { darkMode } = useTheme();
    const navigate = useNavigate();
    const { user, accessToken, logout, loading: authLoading } = useAuth();
    
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
        () => JSON.parse(localStorage.getItem('sidebarCollapsed')) || false
    );
    const [student, setStudent] = useState(null);
    const [displaySubjects, setDisplaySubjects] = useState([]);
    const [allSubjects, setAllSubjects] = useState([]); // Added this to fix dependency array warning
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentCurriculum, setCurrentCurriculum] = useState(
        () => localStorage.getItem('studentCurriculum') || 'zimsec'
    );
        const [testReports, setTestReports] = useState([]);
    const [lastStudied, setLastStudied] = useState(null);
    const { selectedSubject, setSelectedSubject } = useContext(Context);
    
    // --- MOVED HOOK TO THE TOP ---
    const handleChangeCurriculum = useCallback(() => {
        const newCurriculum = currentCurriculum === 'zimsec' ? 'cambridge' : 'zimsec';
        setCurrentCurriculum(newCurriculum);
        localStorage.setItem('studentCurriculum', newCurriculum);
    
        // Optional backend save logic can be added here
        
    }, [currentCurriculum]);


    // --- Effect for syncing sidebar state ---
    useEffect(() => {
        const checkSidebarState = () => {
            const collapsedState = JSON.parse(localStorage.getItem('sidebarCollapsed')) || false;
            setIsSidebarCollapsed(collapsedState);
        };
        const interval = setInterval(checkSidebarState, 500);
        return () => clearInterval(interval);
    }, []);

    // --- Effect for fetching initial data ---
     useEffect(() => {
        const fetchInitialData = async () => {
            if (authLoading || !accessToken || !user?.email) return;

            setLoading(true);
            setError('');

            try {
                // Use Promise.all to fetch student, subjects, and reports concurrently
                const [studentRes, subjectsRes] = await Promise.all([
                    axios.get(`${BASE_API_URL}/students/by-email/${user.email}`, { headers: { Authorization: `Bearer ${accessToken}` } }),
                    axios.get(`${BASE_API_URL}/subjects`, { headers: { Authorization: `Bearer ${accessToken}` } }),
                ]);

                const studentData = studentRes.data;
                setStudent(studentData);
                setAllSubjects(subjectsRes.data);
                setTestReports(subjectsRes.data.testResults || []); // Store test results

                const effectiveCurriculum = studentData.curriculum || 'zimsec';
                setCurrentCurriculum(effectiveCurriculum);
                localStorage.setItem('studentCurriculum', effectiveCurriculum);

                const lastStudiedSubjectName = subjectsRes.data.SubjectSelect;
                setSelectedSubject(selectedSubject);


            } catch (err) {
                console.error("CardSection.jsx: Error fetching initial data:", err);
                setError("An error occurred while loading your dashboard.");
                // Add more specific error handling as before if needed
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [user, accessToken, authLoading]);

     const calculateTestPerformance = useCallback(() => {
        if (!testReports || testReports.length === 0) return {};

        const performanceBySubject = testReports.reduce((acc, report) => {
            if (!acc[report.subject]) {
                acc[report.subject] = { totalScore: 0, count: 0 };
            }
            acc[report.subject].totalScore += report.score;
            acc[report.subject].count += 1;
            return acc;
        }, {});

        const averages = {};
        for (const subject in performanceBySubject) {
            averages[subject] = performanceBySubject[subject].totalScore / performanceBySubject[subject].count;
        }
        return averages;
    }, [testReports]);

    useEffect(() => {
        if (selectedSubject) {
            localStorage.setItem('selectedSubject', selectedSubject);
        }
    }, [selectedSubject]);
    
    // --- Effect to Update lastStudied and Filtered Subjects ---
    useEffect(() => {
        if (!student || allSubjects.length === 0) return;
        
        // Filter subjects for display
        const filtered = allSubjects.filter(subject =>
            subject.level === student.academicLevel &&
            subject.curriculum === currentCurriculum
        );
        setDisplaySubjects(filtered);

        // Determine the last studied subject and set its data
        const lastStudiedSubjectName = localStorage.getItem('selectedSubject') || (filtered.length > 0 ? filtered[0].name : null);
        
               if (lastStudiedSubjectName) {
                   const subjectDetails = allSubjects.find(s => s.name === lastStudiedSubjectName);
                   const performance = calculateTestPerformance();
                   const progress = performance[lastStudiedSubjectName] || 0;
       
                   setLastStudied({
                       name: subjectDetails?.name || lastStudiedSubjectName,
                       icon: subjectDetails?.iconKey ? assets[subjectDetails.iconKey] : null,
                       progress: Math.round(progress)
                   });
               }
           // Dependency array now includes selectedSubject
           }, [currentCurriculum, allSubjects, student, calculateTestPerformance, selectedSubject]);

    
    // --- Effect for filtering subjects when data changes ---
    useEffect(() => {
        if (!student || allSubjects.length === 0) {
            setDisplaySubjects([]); // Clear subjects if no student or subject data
            return;
        };

        const filtered = allSubjects.filter(subject =>
            subject.level === student.academicLevel &&
            subject.curriculum === currentCurriculum
        );
        setDisplaySubjects(filtered);
    }, [currentCurriculum, allSubjects, student]); // This runs when student, allSubjects, or curriculum changes


    // --- Conditional return is now AFTER all hook calls ---
    if (loading || authLoading) {
        return (
            <div className={`dashboard-wrapper ${darkMode ? 'dark-theme' : ''}`}>
                <div className="loading-container full-page">
                    <div className="loading-spinner"></div>
                    <p className="loading-text">Loading your subjects...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`dashboard-wrapper ${darkMode ? 'dark-theme' : ''}`}>
            {/* Your Sidebar is rendered here */}
            <Sidebar />

            {/* The main content dynamically adjusts its margin based on the sidebar's state */}
            <main className={`main-content ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                <header className="main-header">
                    <div className="greeting-container">
                        <h1><Greeting /></h1>
                        <p>Ready to learn something new today? Let's get started.</p>
                    </div>
                     <div className="curriculum-switcher" onClick={handleChangeCurriculum}>
                           <Icon className="fas fa-exchange-alt" />
                            <span>Switch to {currentCurriculum === 'zimsec' ? 'Cambridge' : 'ZIMSEC'}</span>
                        </div>
                </header>
                
                {error && <div className="error-banner">{error}</div>}

            {/* <section className="launchpad-grid">
                    {lastStudied && (
                         <div className="card large-card">
                            <h3>Jump Back In</h3>
                            <div className="jump-back-in-content">
                                {lastStudied.icon ? 
                                    <img src={lastStudied.icon} alt={lastStudied.name} className="subject-icon-large-img" /> : 
                                    <Icon className="fas fa-book subject-icon-large" />
                                }
                                <div className="subject-info">
                                    <h2>{lastStudied.name}</h2>
                                    <p>Your average test score</p>
                                </div>
                            </div>
                            <div className="progress-bar-container">
                                <div className="progress-bar" style={{ width: `${lastStudied.progress}%` }}></div>
                            </div>
                            <span className="progress-label">{lastStudied.progress}% Mastery</span>
                        </div>
                    )}

                    <div className="card large-card">
                        <h4>Test Performance Summary</h4>
                        <div className="performance-bars">
                            {Object.keys(calculateTestPerformance()).length > 0 ? (
                                Object.entries(calculateTestPerformance()).map(([subject, average]) => (
                                    <div key={subject} className="performance-bar">
                                        <span className="subject-name">{subject}</span>
                                        <div className="bar-container">
                                            <div
                                                className="bar-fill"
                                                style={{ width: `${average}%` }}
                                            ></div>
                                            <span className="bar-text">{Math.round(average)}%</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="no-data-message">No test results yet. Take a test to see your performance!</p>
                            )}
                        </div>
                    </div>
                </section> */}

                
                <section className="tools-section">
                     <div className="section-header">
                        <h2>Quick Tools</h2>
                    </div>
                    <div className="tools-grid">
                        <div className="card tool-card"onClick={() => navigate('/test')}><Icon className="fas fa-pencil-ruler"/><span>Start a Test</span></div>
                        <div className="card tool-card"onClick={() => navigate('/reports')}><Icon className="far fa-lightbulb"/><span>Review Your Progress</span></div>
                        <div className="card tool-card" onClick={() => navigate('/papers')}><Icon className="fas fa-book-open"/><span>Find Exam Papers</span></div>
                        {/* <div className="card tool-card"><Icon className="fas fa-question-circle"/><span>Ask a Question</span></div> */}
                    </div>
                </section>

                <section className="subjects-section">
                    <div className="section-header">
                        <h2>Your Enrolled Subjects</h2>
                         <p>Select a subject to dive into lessons, practice exercises, and more.</p>
                    </div>
                    <div className="cards-grid">
                        {displaySubjects.length > 0 ? (
                           displaySubjects.map((subject) => (
        // The main card now uses the '.subject-card' class in addition to '.card'
        <div
            key={subject.id}
            className="card subject-card"
            onClick={() => handleCardClick(subject.name)}
            
        >
            {/* 1. Content Wrapper for Text */}
            <div className="subject-card-content"onClick={() => setSelectedSubject(subject.name)}>
                <h3 className="subject-card-name">{subject.name}</h3>
                <p className="subject-card-subtitle">{subject.level} {subject.curriculum.toUpperCase()}</p>
            </div>

            {/* 2. Image Wrapper for better control */}
            <div className="subject-card-image-wrapper"onClick={() => setSelectedSubject(subject.name)}>
                {assets[subject.iconKey] ? (
                    <img
                        className="subject-card-image"
                        src={assets[subject.iconKey]}
                        alt={`${subject.name} icon`}
                    />
                ) : (
                    // A placeholder for when the image isn't available
                    <div className="icon-placeholder">
                        <i className="fas fa-book"></i>
                    </div>
                )}
            </div>
        </div>
    ))
                        ) : (
                             <div className="card info-card">
                                 <Icon className="fas fa-folder-open info-icon" />
                                <h4>No Subjects Found for {currentCurriculum.toUpperCase()}</h4>
                                <p>Please switch your curriculum or <Link to="/profile" className="inline-link">update your profile</Link> to see your subjects here.</p>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default CardSection;