import React, { useState, useCallback, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from '../../context/AuthContext.jsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FaEnvelope, FaLock, FaSignInAlt, FaUserPlus, FaEye, FaEyeSlash } from 'react-icons/fa';
import './login.css';
import { useTheme } from '../../context/ThemeContext';

const BASE_API_URL = 'https://chikoro-ai.com/api';

const Login = React.memo(() => {
  const { darkMode, setDarkMode } = useTheme();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  useEffect(() => {
    // Clean up any previous errors when component mounts
    setError('');
  }, []);

  const handleChange = useCallback((e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: id === 'password' ? value : value.trim()
    }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
  
    try {
      const response = await axios.post(`${BASE_API_URL}/auth`, formData);
  
      if (response.data.success) {
        // Use the login function from AuthContext
        await login(response.data.user, response.data.accessToken);
        
        // After successful login, redirect to /payment
        navigate('/enrol', { replace: true });
      } else {
        setError('Invalid login credentials');
      }
    } catch (error) {
      console.error('Login Error:', error);
      if (error.response && error.response.status >= 400 && error.response.status <= 500) {
        setError(error.response.data.message || 'Invalid credentials');
      } else {
        setError('Unable to connect to the server. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  }, [formData, login, navigate]);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  return (
    <div className="login-container">
      <div className="auth-wrapper">
        <div className="auth-form">
          <div className="form-header">
            <h2>Welcome Back!</h2>
            <p>Please sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <div className="input-with-icon">
          
                <input
                  type="email"
                  id="email"
                  className="form-control"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="username"
                  required
                  onBlur={() => {
                    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
                      setError('Please enter a valid email address');
                    } else {
                      setError('');
                    }
                  }}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-with-icon">
                <FaLock className="input-icon" aria-hidden="true" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                  minLength="8"
                />
                <div className="password-strength">
                </div>
                <button
                  type="button"
                  className="password-toggle"
                  onClick={togglePasswordVisibility}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
            
            {error && (
              <div className="alert alert-danger mt-2" role="alert">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary btn-block"
              disabled={loading || !formData.email || !formData.password}
              aria-busy={loading}
            >
              {loading ? (
                <div className="spinner-border spinner-border-sm" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              ) : (
                <>
                  <FaSignInAlt className="btn-icon" aria-hidden="true" />
                  Sign In
                </>
              )}
            </button>

            <div className="form-footer">
              <p>Don't have an account? <Link to="/signup" className="text-link">Create Account</Link></p>
            </div>
          </form>
        </div>

        <div className="auth-graphics d-none d-lg-block">
          <div className="graphics-content">
            <h2>New Here?</h2>
            <p>Sign up and begin to enhance your learning journey!</p>
            <Link to="/signup" className="btn btn-outline-light">
              <FaUserPlus className="btn-icon" aria-hidden="true" />
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
});

export default Login;