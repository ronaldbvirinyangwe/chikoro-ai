import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './enrol.css';
import { FaUserGraduate, FaCalendarAlt, FaBookOpen, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { useTheme } from '../../context/ThemeContext';

const Enrol = () => {
  const { darkMode } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    academicLevel: '',
    curriculum: '',
    grade: ''
  });

  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value
    }));
  };

const BASE_API_URL = 'https://chikoro-ai.com';

useEffect(() => {
  const checkExistingStudent = async () => {
    // Get user info from localStorage
    const userString = localStorage.getItem('user');
    let userEmail = null;
    
    if (userString) {
      try {
        const userObject = JSON.parse(userString);
        userEmail = userObject.email;
        console.log("Found user email:", userEmail);
      } catch (parseError) {
        console.error("Error parsing user data:", parseError);
        setError('Error retrieving user information. Please log in again.');
        return;
      }
    }
    
    if (!userEmail) {
      console.log("No user email found in localStorage");
      return; // Exit if no email found
    }
    
    try {
      // Check if student exists with this email
      console.log("Checking for student with email:", userEmail);
      const response = await axios.get(`${BASE_API_URL}/students/by-email/${userEmail}`);
      
      if (response.data && response.data._id) {
        console.log("Found student in database:", response.data.name);
        
        // Store student info in localStorage
        localStorage.setItem('studentId', response.data._id);
        localStorage.setItem('studentName', response.data.name);
        localStorage.setItem('studentGrade', response.data.grade || '');
        
        // Navigate to subject selection
        navigate('/subjectselect');
      } else {
        console.log("No student found with this email");
      }
    } catch (error) {
      console.error("Error checking for student:", error);
      
      if (error.response?.status === 404) {
        console.log("Student not found with this email");
        // This is fine - will let them register
      } else {
        setError('Error connecting to server. Please try again.');
      }
    }
  };

  checkExistingStudent();
}, [navigate]);

  const handleAcademicLevelChange = (e) => {
    const { value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      academicLevel: value,
      grade: '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userString = localStorage.getItem('user'); 
      let userEmail = null;
  
      if (userString) {
        try {
          const userObject = JSON.parse(userString);
          userEmail = userObject.email;         
        } catch (parseError) {
          console.error("Error parsing user data from localStorage:", parseError);
          setError("Error retrieving user information. Please log in again.");
          return;
        }
      }
  
      if (!userEmail) {
        setError("User email not found in session. Please log in again."); // Handle case where email is missing
        return;
      }
  
      const formDataWithEmail = {
        ...formData,
        email: userEmail, 
      };
  
      const response = await axios.post(`${BASE_API_URL}/students`, formDataWithEmail);
  
      // Handle success -  (keep your existing success handling code here: localStorage, navigate etc.)
      localStorage.setItem('studentId', response.data._id);
      localStorage.setItem('studentName', response.data.name);
      localStorage.setItem('studentGrade', formData.grade);
      navigate('/subjectselect');
  
  
    } catch (error) {
      // Handle error - (keep your existing error handling code here: setError messages)
      if (error.response?.status === 409) {
        setError(error.response.data.error);
      } else {
        setError('Error saving student. Please try again.');
      }
    }
  };

  const gradeOptions = {
    primary: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7'],
    secondary: ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6'],
    tertiary: ['First Year', 'Second Year', 'Third Year', 'Fourth Year'],
  };

  return (
    <div className="container">
      <div className="form-container">
        <div className="form-header">
          <h1><FaUserGraduate /> Student Registration</h1>
          <p>Start your learning journey by creating your profile</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name and Age fields remain the same */}
          <div className="input-group">
            <div className="input-icon">
              <FaUserGraduate />
            </div>
            <div className="input-content">
              <label htmlFor="name">Student's Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="modern-input"
              />
            </div>
          </div>

          <div className="input-group">
            <div className="input-icon">
              <FaCalendarAlt />
            </div>
            <div className="input-content">
              <label htmlFor="age">Age</label>
              <input
                type="number"
                id="age"
                name="age"
                value={formData.age}
                onChange={handleInputChange}
                required
                className="modern-input"
              />
            </div>
          </div>

          {/* Academic Level */}
          <div className="input-group">
            <div className="input-icon">
              <FaBookOpen />
            </div>
            <div className="input-content">
              <label>Academic Level</label>
              <div className="select-wrapper">
                <select
                  id="academicLevel"
                  name="academicLevel"
                  value={formData.academicLevel}
                  onChange={handleAcademicLevelChange}
                  required
                  className="modern-select"
                >
                  <option value="">Select Academic Level</option>
                  <option value="primary">Primary School</option>
                  <option value="secondary">Secondary School</option>
                  <option value="tertiary">Tertiary Education</option>
                </select>
                <FaChevronDown className="select-arrow" />
              </div>
            </div>
          </div>

          {/* Curriculum */}
          <div className="input-group">
            <div className="input-icon">
              <FaBookOpen />
            </div>
            <div className="input-content">
              <label>Curriculum</label>
              <div className="select-wrapper">
                <select
                  id="curriculum"
                  name="curriculum"
                  value={formData.curriculum}
                  onChange={handleInputChange}
                  required
                  className="modern-select"
                >
                  <option value="">Select Curriculum</option>
                  <option value="zimsec">Zimsec</option>
                  <option value="cambridge">Cambridge</option>
                </select>
                <FaChevronDown className="select-arrow" />
              </div>
            </div>
          </div>

          {/* Grade/Year */}
          {formData.academicLevel && (
            <div className="input-group">
              <div className="input-icon">
                <FaBookOpen />
              </div>
              <div className="input-content">
                <label>Grade/Year</label>
                <div className="select-wrapper">
                  <select
                    id="grade"
                    name="grade"
                    value={formData.grade}
                    onChange={handleInputChange}
                    required
                    className="modern-select"
                  >
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

          <button type="submit" className="submit-btn">
            Continue to Learning <FaChevronRight />
          </button>
        </form>

        {error && (
  <div className="error-message">
    {error}
    <p className="error-suggestion">
      Try adding a number, middle initial, or last name (e.g., "{formData.name}2" 
      or "{formData.name} Smith")
    </p>
  </div>
)}
      </div>
    </div>
  );
};

export default Enrol;