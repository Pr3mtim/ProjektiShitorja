import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { FaEye, FaEyeSlash, FaUser, FaLock } from "react-icons/fa";

const Register = () => {
    // Form state
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        confirmPassword: ""
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    
    // Refs and hooks
    const usernameRef = useRef();
    const navigate = useNavigate();

    // Auto-focus username field on mount
    useEffect(() => {
        usernameRef.current.focus();
    }, []);

    // Client-side validation
    const validateForm = () => {
        const newErrors = {};
        const { username, password, confirmPassword } = formData;

        if (!username.trim()) {
            newErrors.username = "Username is required";
        } else if (username.length < 4) {
            newErrors.username = "Username must be at least 4 characters";
        } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            newErrors.username = "Username can only contain letters, numbers, and underscores";
        }

        if (!password) {
            newErrors.password = "Password is required";
        } else if (password.length < 8) {
            newErrors.password = "Password must be at least 8 characters";
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])/.test(password)) {
            newErrors.password = "Password must contain uppercase, lowercase, number, and special character";
        }

        if (password !== confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: "" }));
        }
    };

    // Handle form submission
    const handleRegister = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;

        setIsSubmitting(true);
        setSuccessMessage("");

        try {
            const response = await axios.post("http://localhost:3500/register", {
                username: formData.username,
                password: formData.password
            }, {
                headers: {
                    "Content-Type": "application/json"
                },
                timeout: 10000 // 10 second timeout
            });

            setSuccessMessage("Registration successful! Redirecting to login...");
            
            // Redirect after 3 seconds
            setTimeout(() => {
                navigate("/");
            }, 3000);

        } catch (err) {
            const errorMessage = err.response?.data?.message || 
                               err.message || 
                               "Registration failed. Please try again.";
            setErrors({ server: errorMessage });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container d-flex justify-content-center align-items-center vh-100 bg-light">
            <div className="card p-4 shadow-lg" style={{ width: "100%", maxWidth: "450px" }}>
                <div className="card-body">
                    <div className="text-center mb-4">
                        <h3 className="text-primary">Create Admin Account</h3>
                        <p className="text-muted">Please fill in the details below</p>
                    </div>

                    {errors.server && (
                        <div className="alert alert-danger" role="alert">
                            {errors.server}
                        </div>
                    )}

                    {successMessage && (
                        <div className="alert alert-success" role="alert">
                            {successMessage}
                        </div>
                    )}

                    <form onSubmit={handleRegister} noValidate>
                        <div className="mb-3">
                            <label className="form-label">Username</label>
                            <div className="input-group">
                                <span className="input-group-text">
                                    <FaUser />
                                </span>
                                <input
                                    ref={usernameRef}
                                    type="text"
                                    name="username"
                                    className={`form-control ${errors.username ? "is-invalid" : ""}`}
                                    value={formData.username}
                                    onChange={handleChange}
                                    required
                                    autoComplete="username"
                                    maxLength="30"
                                />
                            </div>
                            {errors.username && (
                                <div className="invalid-feedback d-block">
                                    {errors.username}
                                </div>
                            )}
                        </div>

                        <div className="mb-3">
                            <label className="form-label">Password</label>
                            <div className="input-group">
                                <span className="input-group-text">
                                    <FaLock />
                                </span>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    className={`form-control ${errors.password ? "is-invalid" : ""}`}
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    autoComplete="new-password"
                                />
                                <button 
                                    type="button" 
                                    className="btn btn-outline-secondary"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                            {errors.password && (
                                <div className="invalid-feedback d-block">
                                    {errors.password}
                                </div>
                            )}
                            <div className="form-text">
                                Password must be at least 8 characters with uppercase, lowercase, number, and special character
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="form-label">Confirm Password</label>
                            <div className="input-group">
                                <span className="input-group-text">
                                    <FaLock />
                                </span>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    className={`form-control ${errors.confirmPassword ? "is-invalid" : ""}`}
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    autoComplete="new-password"
                                />
                                <button 
                                    type="button" 
                                    className="btn btn-outline-secondary"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                >
                                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                            {errors.confirmPassword && (
                                <div className="invalid-feedback d-block">
                                    {errors.confirmPassword}
                                </div>
                            )}
                        </div>

                        <button 
                            type="submit" 
                            className="btn btn-primary w-100 py-2 mb-3"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                    Registering...
                                </>
                            ) : "Register"}
                        </button>

                        <div className="text-center">
                            <span className="text-muted">Already have an account? </span>
                            <Link to="/login" className="text-decoration-none">Login here</Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Register;