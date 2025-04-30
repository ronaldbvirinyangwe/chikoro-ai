import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import './LinkDevice.css';

const LinkDevice = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [studentName, setStudentName] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const BASE_API_URL = 'http://localhost:3001'; 

  // Parse URL parameters
  const searchParams = new URLSearchParams(location.search);
  const token = searchParams.get('token');
  const studentId = searchParams.get('studentId');

  useEffect(() => {
    const initializeDevice = async () => {
      try {
        // Generate device fingerprint
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        setDeviceId(result.visitorId);
        
        // If we have all required parameters, register the device
        if (token && studentId && result.visitorId) {
          registerDevice(result.visitorId);
        } else {
          setError('Missing required information for device linking');
          setLoading(false);
        }
      } catch (e) {
        setError('Failed to initialize device identification');
        setLoading(false);
      }
    };
    
    initializeDevice();
  }, [token, studentId]);

  const registerDevice = async (deviceId) => {
    try {
      // First, get student info to display name
      const studentResponse = await axios.get(`${BASE_API_URL}/students/${studentId}`);
      setStudentName(studentResponse.data.name);
      
      // Register the device
      const deviceName = navigator.userAgent;
      const response = await axios.post(`${BASE_API_URL}/students/register-device`, {
        token,
        studentId,
        deviceId,
        deviceName
      });
      
      // On success, store credentials in localStorage
      localStorage.setItem('studentId', studentId);
      localStorage.setItem('studentName', studentResponse.data.name);
      localStorage.setItem('deviceId', deviceId);
      localStorage.setItem('studentGrade', studentResponse.data.grade);
      
      setSuccess(true);
      setLoading(false);
      
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate('/subjectselect');
      }, 3000);
      
    } catch (error) {
      if (error.response?.status === 401) {
        setError('The link is invalid or has expired. Please generate a new QR code.');
      } else if (error.response?.status === 403) {
        setError('Maximum number of devices already registered.');
      } else {
        setError('Failed to link device. Please try again.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="link-device-container">
      <h1>Device Linking</h1>
      
      {loading && (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Linking your device...</p>
        </div>
      )}
      
      {error && (
        <div className="error-box">
          <h3>Error</h3>
          <p>{error}</p>
          <button 
            className="back-button"
            onClick={() => navigate('/')}
          >
            Go to Login Page
          </button>
        </div>
      )}
      
      {success && (
        <div className="success-box">
          <h3>Success!</h3>
          <p>Your device has been successfully linked to {studentName}'s account.</p>
          <p>Redirecting to dashboard...</p>
        </div>
      )}
    </div>
  );
};

export default LinkDevice;