import React, { useState, useCallback,useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { login as apiLogin } from "../../services/api";
import { useAuth } from '../../context/AuthContext.jsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FaEnvelope, FaLock, FaSignInAlt, FaUserPlus, FaEye, FaEyeSlash } from 'react-icons/fa';
import './login.css';

const Login = React.memo(() => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, loading: authLoading } = useAuth();
const [validationErrors, setValidationErrors] = useState({});

 
 const validateForm = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.email) {
      errors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = useCallback((e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiLogin({
        email: formData.email,
        password: formData.password
      });
      
      // Correctly access the nested data structure
      const { token, user: userData } = response.data.data;
      
      if (token && userData) {
        await login(userData, token);
        navigate("/enrol", { replace: true });
      } else {
        setError("Invalid response from server");
      }
    } catch (error) {
      console.error("Login Error:", error);
      
      if (error.response?.status === 429) {
        setError("Too many login attempts. Please try again later.");
      } else if (error.response?.status === 401) {
        setError("Invalid email or password.");
      } else {
        setError(error.response?.data?.message || "Unable to connect to the server.");
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
                    if (!/\S+@\S+\.\S+/.test(formData.email)) {
                      setError('Please enter a valid email address');
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
