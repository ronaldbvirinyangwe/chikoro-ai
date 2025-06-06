import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // Using global axios instance
import './enrol.css';
import { FaUserGraduate, FaCalendarAlt, FaBookOpen, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

// Ensure this is the correct backend URL
const BASE_API_URL = 'https://atqtuew6syxese-4173.proxy.runpod.net';

const Enrol = () => {
  const { darkMode } = useTheme();
  const { user, isAuthenticated, accessToken, loading: authLoading, error: authError, logout } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    academicLevel: '', // This field is crucial
    curriculum: '',
    grade: ''
  });

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true); // Local loading for this component's async ops

  const navigate = useNavigate();

  // --- Effect to Check Existing Student ---
  useEffect(() => {
    if (authLoading === false) { // Only run once auth state is loaded
      setIsLoading(false); // Stop component's initial loading once auth is ready

      if (!isAuthenticated || !user || !user.email) {
        console.log("Enrol.jsx useEffect: Auth state loaded, but user not authenticated or email missing.");
        // If user is not authenticated after auth state loads, consider redirecting
        // navigate('/login'); // Uncomment if enrollment strictly requires login
        return;
      }

      const existingStudentId = localStorage.getItem('studentId');
      if (existingStudentId) {
        console.log("Enrol.jsx useEffect: studentId already found in localStorage:", existingStudentId);
        // Potentially refresh other localStorage items like lastPromotionDate if needed,
        // but for now, we assume they were set correctly when studentId was set.
        navigate('/subjectselect');
        return;
      }

      const userEmail = user.email;
      console.log("Enrol.jsx useEffect: Auth state loaded, user authenticated. Checking for student with email:", userEmail);

      const checkStudent = async () => {
        try {
          const response = await axios.get(`${BASE_API_URL}/students/by-email/${userEmail}`, {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          });

          if (response.data && response.data._id) {
            console.log("Enrol.jsx useEffect: Found existing student in database:", response.data.name, "ID:", response.data._id);

            localStorage.setItem('studentId', response.data._id);
            localStorage.setItem('studentName', response.data.name);
            localStorage.setItem('studentGrade', response.data.grade || '');
            localStorage.setItem('studentCurriculum', response.data.curriculum || '');
            localStorage.setItem('studentAcademicLevel', response.data.academicLevel || '');
            localStorage.setItem('lastPromotionDate', response.data.lastPromotionDate || response.data.enrollmentDate || new Date(response.data.createdAt).toISOString());

            console.log("Enrol.jsx useEffect: studentId and related info set in localStorage for existing student.");
            navigate('/subjectselect');
          } else {
            console.log("Enrol.jsx useEffect: No student found with this email. Proceeding with new enrollment.");
            // Form will be displayed for new registration
          }
        } catch (error) {
          console.error("Enrol.jsx useEffect: Error checking for student:", error.response?.data || error.message);
          if (error.response?.status === 404) {
            console.log("Enrol.jsx useEffect: Student not found (404), new user.");
          } else if (error.response?.status === 401 || error.response?.status === 403) {
            console.error("Enrol.jsx useEffect: Auth error checking student. Logging out.");
            setError("Session expired or unauthorized. Please log in again.");
            logout();
            // navigate('/login');
          } else {
            setError('Error connecting to server while checking for student. Please try again.');
          }
        }
      };

      checkStudent();
    }
  }, [authLoading, isAuthenticated, user, accessToken, navigate, logout]);

  // --- Handle Form Input Changes ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value
    }));
  };

  // --- Handle Academic Level Change (resets Grade) ---
  const handleAcademicLevelChange = (e) => {
    const { value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      academicLevel: value,
      grade: '', // Reset grade when academic level changes
    }));
  };

  // --- Handle Form Submission ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isAuthenticated || !user || !user.email) {
      setError("User not authenticated or email missing. Please log in again.");
      console.warn("Enrol.jsx handleSubmit: User not authenticated or email missing.");
      logout();
      // navigate('/login');
      return;
    }
    if (!accessToken) {
      setError("Authentication token missing. Please log in again.");
      console.warn("Enrol.jsx handleSubmit: Access token missing.");
      logout();
      // navigate('/login');
      return;
    }

    const userEmail = user.email;
    const currentDateISO = new Date().toISOString(); // For new enrollment's promotion date

    try {
      // Data to be sent to the backend
      const studentDataToSubmit = {
        ...formData, // Includes name, age, academicLevel, curriculum, grade
        email: userEmail,
  
        lastPromotionDate: currentDateISO,
      };

      console.log("Enrol.jsx handleSubmit: Submitting student data:", studentDataToSubmit);

      const headers = { Authorization: `Bearer ${accessToken}` };
      const response = await axios.post(`${BASE_API_URL}/students`, studentDataToSubmit, { headers });

      console.log("Enrol.jsx handleSubmit: POST /students successful. Response data:", response.data);

      // Store student info in localStorage from response or submitted data
      const newStudentId = response.data._id || response.data.student?._id; // Backend might return student nested or flat
      localStorage.setItem('studentId', newStudentId);
      localStorage.setItem('studentName', studentDataToSubmit.name); // Use form data as source of truth for name just submitted
      localStorage.setItem('studentGrade', studentDataToSubmit.grade);
      localStorage.setItem('studentCurriculum', studentDataToSubmit.curriculum);
      localStorage.setItem('studentAcademicLevel', studentDataToSubmit.academicLevel);
      localStorage.setItem('lastPromotionDate', currentDateISO);

      console.log("Enrol.jsx handleSubmit: studentId and related info set in localStorage for new student.");
      navigate('/subjectselect');

    } catch (error) {
      console.error("Enrol.jsx handleSubmit: Error saving student:", error.response?.data || error.message);
      if (error.response?.status === 409) {
        setError(error.response.data.error || 'Student record already exists for this user.');
        if (error.response.data.student && error.response.data.student._id) {
          const existingStudent = error.response.data.student;
          console.log("Enrol.jsx handleSubmit: Received existing student data from 409 response:", existingStudent);
          localStorage.setItem('studentId', existingStudent._id);
          localStorage.setItem('studentName', existingStudent.name || '');
          localStorage.setItem('studentGrade', existingStudent.grade || '');
          localStorage.setItem('studentCurriculum', existingStudent.curriculum || '');
          localStorage.setItem('studentAcademicLevel', existingStudent.academicLevel || '');
          localStorage.setItem('lastPromotionDate', existingStudent.lastPromotionDate || existingStudent.enrollmentDate || new Date(existingStudent.createdAt).toISOString());
          navigate('/subjectselect');
        }
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        setError("Authentication failed during enrollment. Please log in again.");
        console.warn("Enrol.jsx handleSubmit: Auth error for POST /students. Logging out.");
        logout();
        // navigate('/login');
      } else {
        setError(error.response?.data?.error || error.response?.data?.message || 'Error saving student. Please try again.');
      }
    }
  };

  const gradeOptions = {
    primary: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7'],
    secondary: ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6'],
    // tertiary: ['First Year', 'Second Year', 'Third Year', 'Fourth Year'], // Uncomment if using
  };

  if (authLoading || isLoading) {
    return <div className="loading-container">Loading enrollment information...</div>;
  }

  if (authError && !isAuthenticated) {
    return <div className="error-container">Authentication Error: {authError}. Please try logging in again.</div>;
  }

  if (isAuthenticated && (!user || !user.email)) {
    // This case should ideally be handled by the useEffect redirect or logout
    return <div className="error-container">User data incomplete after authentication. Please log in again.</div>;
  }

  return (
    <div className={`container ${darkMode ? 'dark' : ''}`}>
      <div className="form-container">
        <div className="form-header">
          <h1><FaUserGraduate /> Student Registration</h1>
          <p>Start your learning journey by creating your profile</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <div className="input-icon"><FaUserGraduate /></div>
            <div className="input-content">
              <label htmlFor="name">Student's Name</label>
              <input type="text" id="name" name="name" value={formData.name} onChange={handleInputChange} required className="modern-input" />
            </div>
          </div>

          <div className="input-group">
            <div className="input-icon"><FaCalendarAlt /></div>
            <div className="input-content">
              <label htmlFor="age">Age</label>
              <input type="number" id="age" name="age" value={formData.age} onChange={handleInputChange} required className="modern-input" />
            </div>
          </div>

          <div className="input-group">
            <div className="input-icon"><FaBookOpen /></div>
            <div className="input-content">
              <label htmlFor="academicLevel">Academic Level</label>
              <div className="select-wrapper">
                <select id="academicLevel" name="academicLevel" value={formData.academicLevel} onChange={handleAcademicLevelChange} required className="modern-select">
                  <option value="">Select Academic Level</option>
                  <option value="primary">Primary School</option>
                  <option value="secondary">Secondary School</option>
                  {/* <option value="tertiary">Tertiary Education</option> */}
                </select>
                <FaChevronDown className="select-arrow" />
              </div>
            </div>
          </div>

          <div className="input-group">
            <div className="input-icon"><FaBookOpen /></div>
            <div className="input-content">
              <label htmlFor="curriculum">Curriculum</label>
              <div className="select-wrapper">
                <select id="curriculum" name="curriculum" value={formData.curriculum} onChange={handleInputChange} required className="modern-select">
                  <option value="">Select Curriculum</option>
                  <option value="zimsec">Zimsec</option>
                  <option value="cambridge">Cambridge</option>
                </select>
                <FaChevronDown className="select-arrow" />
              </div>
            </div>
          </div>

          {formData.academicLevel && (
            <div className="input-group">
              <div className="input-icon"><FaBookOpen /></div>
              <div className="input-content">
                <label htmlFor="grade">Grade/Year</label>
                <div className="select-wrapper">
                  <select id="grade" name="grade" value={formData.grade} onChange={handleInputChange} required className="modern-select">
                    <option value="">Select Grade/Year</option>
                    {gradeOptions[formData.academicLevel]?.map((grade, index) => (
                      <option key={index} value={grade}>{grade}</option>
                    ))}
                  </select>
                  <FaChevronDown className="select-arrow" />
                </div>
              </div>
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={isLoading || authLoading}> {/* Disable button while loading */}
            Continue to Learning <FaChevronRight />
          </button>
        </form>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default Enrol;