import React, { useState, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { FaUser, FaEnvelope, FaLock, FaSignInAlt, FaUserPlus, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext.jsx';
import { login as apiLogin } from "../../services/api";
import './signup.css';

const BASE_API_URL = 'https://lsdl9qdylhle6t-8080.proxy.runpod.net/api'; // Adjusted to match your API endpoint

const Signup = React.memo(() => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [successMessage, setSuccessMessage] = useState('');

  const validateForm = useCallback(() => {
    const errors = [];

    if (!/^[A-Za-z]{2,}$/.test(formData.firstName)) errors.push('First name must be at least 2 letters');
    if (!/^[A-Za-z]{2,}$/.test(formData.lastName)) errors.push('Last name must be at least 2 letters');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.push('Invalid email format');
    if (formData.password.length < 8) errors.push('Password must be at least 8 characters');
    if (!/[0-9]/.test(formData.password)) errors.push('Password must contain at least one number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) errors.push('Password must contain at least one special character');

    return errors;
  }, [formData]);

    const handleChange = useCallback((e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]:value
    }));
  }, []);

 const handleSubmit = async (e) => {
    e.preventDefault();
    try {
       const url = `${BASE_API_URL}/users`;
      const { data: res } = await axios.post(url, formData);
      navigate('/login');
      console.log(res.message);
    } catch (error) {
      if (error.response && error.response.status >= 400 && error.response.status <= 500) {
        setError(error.response.data.message);
      } else {
        alert("Error creating user. Please try again.");
      }
    }
  };

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  return (
    <div className="signup-container">
      <div className="auth-wrapper">
        <div className="auth-form">
          <div className="form-header">
            <h2>Create Account</h2>
            <p>Join us to start your learning journey</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-6">
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <div className="input-with-icon">
                    <FaUser className="input-icon" aria-hidden="true" />
                    <input
                      type="text"
                      id="firstName"
                      className="form-control"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={handleChange}
                      pattern="[A-Za-z]{2,}"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="form-group">
                  <label htmlFor="lastName">Last Name</label>
                  <div className="input-with-icon">
                    <FaUser className="input-icon" aria-hidden="true" />
                    <input
                      type="text"
                      id="lastName"
                      className="form-control"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={handleChange}
                      pattern="[A-Za-z]{2,}"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <div className="input-with-icon">
                <FaEnvelope className="input-icon" aria-hidden="true" />
                <input
                  type="email"
                  id="email"
                  className="form-control"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-with-icon">
                <FaLock className="input-icons" aria-hidden="true" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  minLength="8"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={togglePasswordVisibility}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <small className="form-text text-muted">
                Minimum 8 characters with at least one number and special character
              </small>
            </div>

            {error && (
              <div className="alert alert-danger mt-3" role="alert">
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
                  <FaUserPlus className="btn-icon" aria-hidden="true" />
                  Create Account
                </>
              )}
            </button>

            <div className="form-footer mt-3">
              <p className="text-center">
                Already have an account? <Link to="/login" className="text-link">Sign In</Link>
              </p>
            </div>
          </form>
        </div>

        <div className="auth-graphics d-none d-lg-block">
          <div className="graphics-content">
            <h2>Welcome Back!</h2>
            <p>Sign in to continue your learning progress</p>
            <Link to="/login" className="btn btn-outline-light">
              <FaSignInAlt className="btn-icon" aria-hidden="true" />
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
});

export default Signup;