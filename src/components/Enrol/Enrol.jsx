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
      if (studentName) {
        try {
          const response = await axios.get(`${BASE_API_URL}/students/authenticate/${studentName}`);
          if (response.data) {
            localStorage.setItem('studentId', response.data._id);
            localStorage.setItem('studentName', response.data.name);
            navigate('/subjectselect');
          }
        } catch (error) {
          console.error('Student not found:', error);
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
    const response = await axios.get(`${BASE_API_URL}/students/authenticate/${formData.name}`);
    if (response.data) {
      if (!response.data.name) {
        throw new Error('Student name not found in response');
      }
      localStorage.setItem('studentId', response.data._id);
      localStorage.setItem('studentName', response.data.name);
      localStorage.setItem('studentGrade', formData.grade);
      navigate('/subjectselect');
      return;
    }
  } catch (error) {
    if (error.response?.status === 404) {
      try {
        const response = await axios.post(`${BASE_API_URL}/students`, formData);
        if (!response.data.name) {
          throw new Error('Student name not found in response');
        }
        localStorage.setItem('studentId', response.data._id);
        localStorage.setItem('studentName', response.data.name);
        localStorage.setItem('studentGrade', formData.grade);
        navigate('/subjectselect');
      } catch (error) {
        setError('Error saving student!');
      }
    } else {
      setError('Error checking student existence!');
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

        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
};

export default Enrol;
