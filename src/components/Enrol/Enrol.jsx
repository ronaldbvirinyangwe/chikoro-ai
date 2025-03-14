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
    const studentName = localStorage.getItem('studentName');
    const storedStudentId = localStorage.getItem('studentId');

    if (studentName && storedStudentId) {
      try {
        // Verify both name and ID match
        const response = await axios.get(`${BASE_API_URL}/students/${storedStudentId}`);
        
        if (response.data.name === studentName) {
          // Valid credentials, proceed to dashboard
          navigate('/subjectselect');
        } else {
          // Name/ID mismatch, clear storage
          localStorage.clear();
          setError('Session expired. Please register again.');
        }
      } catch (error) {
        if (error.response?.status === 404) {
          // Student not found, clear invalid credentials
          localStorage.clear();
          setError('Session expired. Please register again.');
        }
      }
    } else if (studentName) {
      // Clean up legacy storage format
      localStorage.removeItem('studentName');
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
    // Try to create new student directly
    const response = await axios.post(`${BASE_API_URL}/students`, formData);
    
    // Handle success
    localStorage.setItem('studentId', response.data._id);
    localStorage.setItem('studentName', response.data.name);
    localStorage.setItem('studentGrade', formData.grade);
    navigate('/subjectselect');
    
  } catch (error) {
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
