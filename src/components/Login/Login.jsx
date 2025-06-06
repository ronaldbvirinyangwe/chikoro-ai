import React, { useState, useCallback, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
// Removed direct axios import as login will use AuthContext's function
// import axios from "axios";
import { useAuth } from '../../context/AuthContext.jsx'; // Assuming AuthContext is correctly imported
import 'bootstrap/dist/css/bootstrap.min.css';
import { FaEnvelope, FaLock, FaSignInAlt, FaUserPlus, FaEye, FaEyeSlash } from 'react-icons/fa';
import './login.css';
import { useTheme } from '../../context/ThemeContext'; // Assuming useTheme is correctly imported

// Removed BASE_API_URL as the login function in AuthContext handles the API call
// const BASE_API_URL = 'https://chikoro-ai.com/api';

const Login = React.memo(() => {
  const { darkMode, setDarkMode } = useTheme(); // Assuming darkMode and setDarkMode are used elsewhere
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation(); // Assuming location is used elsewhere if not removed
  // Get the login function and isAuthenticated state from AuthContext
  const { login, isAuthenticated } = useAuth();

  // Effect to redirect authenticated users away from the login page
  useEffect(() => {
    if (isAuthenticated) {
      // Redirect to a protected route, e.g., subject select or dashboard
      // You might want to redirect to a specific page if the user was trying to access it before login
      const from = location.state?.from?.pathname || '/enrol'; // Redirect to /enrol or previous page
      navigate(from, { replace: true });
    }
     // Clean up any previous errors when component mounts
    setError('');
  }, [isAuthenticated, navigate, location.state]); // Added dependencies

  const handleChange = useCallback((e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: id === 'password' ? value : value.trim()
    }));
  }, []);

  // Modified handleSubmit to use the login function from AuthContext
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Call the login function provided by AuthContext
      // Pass only email and password, AuthContext handles the API call, token storage, etc.
      const result = await login(formData.email, formData.password);

      if (result.success) {
        // Login successful, AuthContext has updated state and stored tokens
        // The useEffect above will handle the navigation based on isAuthenticated state change
        console.log("Login successful via AuthContext.");
      } else {
        // Login failed, AuthContext has likely set an error message in its state
        // Use the error message returned by the login function or from AuthContext state
        setError(result.error || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      // This catch block might be less frequently hit if AuthContext handles API errors internally
      console.error('Login Error during AuthContext call:', error);
      setError('An unexpected error occurred during login.');
    } finally {
      setLoading(false);
    }
  }, [formData, login]); // Added login to dependencies

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  // If user is already authenticated, render nothing or a loading spinner
  // as the useEffect will handle the redirect
  if (isAuthenticated) {
      return null; // Or return a loading indicator
  }


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
                      // Clear email validation error if format is now valid
                       if (error === 'Please enter a valid email address') {
                           setError('');
                       }
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
                {/* Removed password strength placeholder */}
                {/* <div className="password-strength"></div> */}
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
