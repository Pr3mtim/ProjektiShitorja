import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';

const Login = () => {
  // Refs
  const usernameRef = useRef();

  // State
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notification, setNotification] = useState(null);

  // Hooks
  const navigate = useNavigate();

  // Effects
  useEffect(() => {
    usernameRef.current.focus();
  }, []);

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } //else if (formData.password.length < 8) {
      //newErrors.password = 'Password must be at least 8 characters';
   // }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const response = await axios.post('http://localhost:3500/login', formData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Store token and user data
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('username', formData.username);

      showNotification('Login successful!', 'success');
      navigate('/dashboard');

    } catch (error) {
      const errorMessage = error.response?.data?.message || 
                         'Login failed. Please try again.';
      showNotification(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center vh-100">
      <div className="card p-4 shadow" style={{ width: '100%', maxWidth: '450px' }}>
        <div className="card-body">
          <div className="text-center mb-4">
            <h2>Secure Login</h2>
            <p className="text-muted">Enter your credentials to access your account</p>
          </div>

          {notification && (
            <div className={`alert alert-${notification.type === 'error' ? 'danger' : 'success'} mb-4`}>
              {notification.message}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="username" className="form-label">Username</label>
              <input
                ref={usernameRef}
                id="username"
                type="text"
                name="username"
                className={`form-control ${errors.username ? 'is-invalid' : ''}`}
                value={formData.username}
                onChange={handleInputChange}
                autoComplete="username"
                disabled={isSubmitting}
              />
              {errors.username && (
                <div className="invalid-feedback">{errors.username}</div>
              )}
            </div>

            <div className="mb-3">
              <label htmlFor="password" className="form-label">Password</label>
              <div className="input-group">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                  value={formData.password}
                  onChange={handleInputChange}
                  autoComplete="current-password"
                  disabled={isSubmitting}
                />
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <i className="bi bi-eye-slash"></i>
                  ) : (
                    <i className="bi bi-eye"></i>
                  )}
                </button>
              </div>
              {errors.password && (
                <div className="invalid-feedback">{errors.password}</div>
              )}
            </div>

            <div className="d-grid gap-2 mb-3">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Logging in...
                  </>
                ) : (
                  'Login'
                )}
              </button>
            </div>

            <div className="d-flex justify-content-between">
              <Link to="/forgot-password" className="text-decoration-none">
                Forgot password?
              </Link>
              <Link to="/register" className="text-decoration-none">
                Create account
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
