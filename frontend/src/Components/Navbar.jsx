import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaShoppingCart, FaUser, FaChartLine, FaBoxes, FaSignInAlt, FaUserPlus } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../Styles/Navbar.css'; // Assuming you have a CSS file for custom styles

const Navbar = () => {
    const [expanded, setExpanded] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const location = useLocation();
    
    // Close mobile menu when route changes
    useEffect(() => {
        setExpanded(false);
    }, [location]);

    // Add scroll effect
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Toggle mobile menu
    const toggleMenu = () => {
        setExpanded(!expanded);
    };

    // Check if current route is active
    const isActive = (path) => {
        return location.pathname === path;
    };

    return (
        <nav className={`navbar navbar-expand-lg navbar-dark ${scrolled ? 'navbar-scrolled' : 'bg-dark'} fixed-top`}>
            <div className="container">
                <Link className="navbar-brand d-flex align-items-center" to="/">
                    <span className="brand-icon">🚬</span>
                    <span className="brand-text ms-2">FreeShop Valoni</span>
                </Link>
                
                <button 
                    className={`navbar-toggler ${expanded ? '' : 'collapsed'}`} 
                    type="button" 
                    onClick={toggleMenu}
                    aria-expanded={expanded}
                    aria-label="Toggle navigation"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>

                <div className={`collapse navbar-collapse ${expanded ? 'show' : ''}`} id="navbarContent">
                    <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                        <NavItem 
                            path="/sales" 
                            icon={<FaShoppingCart className="me-2" />} 
                            label="Sales" 
                            isActive={isActive('/sales')}
                        />
                        <NavItem 
                            path="/dashboard" 
                            icon={<FaChartLine className="me-2" />} 
                            label="Dashboard" 
                            isActive={isActive('/dashboard')}
                        />
                        <NavItem 
                            path="/product-management" 
                            icon={<FaBoxes className="me-2" />} 
                            label="Products" 
                            isActive={isActive('/product-management')}
                        />
                    </ul>

                    <ul className="navbar-nav ms-auto">
                        <NavItem 
                            path="/" 
                            icon={<FaSignInAlt className="me-2" />} 
                            label="Login" 
                            isActive={isActive('/')}
                        />
                        <NavItem 
                            path="/register" 
                            icon={<FaUserPlus className="me-2" />} 
                            label="Register" 
                            isActive={isActive('/register')}
                        />
                        <li className="nav-item dropdown">
                            <a className="nav-link dropdown-toggle d-flex align-items-center" href="#" id="userDropdown" role="button">
                                <FaUser className="me-2" />
                                <span>Admin</span>
                            </a>
                            <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                                <li><Link className="dropdown-item" to="/profile">Profile</Link></li>
                                <li><Link className="dropdown-item" to="/settings">Settings</Link></li>
                                <li><hr className="dropdown-divider" /></li>
                                <li><Link className="dropdown-item" to="/logout">Logout</Link></li>
                            </ul>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    );
};

const NavItem = ({ path, icon, label, isActive }) => (
    <li className="nav-item">
        <Link 
            className={`nav-link d-flex align-items-center ${isActive ? 'active' : ''}`} 
            to={path}
        >
            {icon}
            {label}
        </Link>
    </li>
);

export default Navbar;