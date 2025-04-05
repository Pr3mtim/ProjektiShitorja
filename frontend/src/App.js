import React from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./Components/Login";
import Dashboard from "./Components/Dashboard"; // Assuming you have a Dashboard component
import Register from './Components/Register';
import SalesPage from './Components/SalesPage';
import Navbar from './Components/Navbar';
import PrivateRoute from './PrivateRoute'; // Import the PrivateRoute component
import ProductManagement from './Components/ProductManagement';


const App = () => {

  const isLoggedIn = localStorage.getItem("token"); // Check if user is logged in

  return (
    <Router>
      <Navbar />
      <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/sales" element={<PrivateRoute><SalesPage /></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/product-management" element={<PrivateRoute><ProductManagement /></PrivateRoute>} />
          {/* Fallback route if no match found */}
      </Routes>
  </Router>
  );
};

export default App;
