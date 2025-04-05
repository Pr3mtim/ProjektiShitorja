import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaMinus, FaShoppingCart, FaSignOutAlt, FaMoneyBillWave, FaCalculator } from "react-icons/fa";
import { FiRefreshCw } from "react-icons/fi";

const Dashboard = () => {
    const [brands, setBrands] = useState([]);
    const [cart, setCart] = useState([]);
    const [amountReceived, setAmountReceived] = useState(0);
    const [totalCost, setTotalCost] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const navigate = useNavigate();

    // Memoized fetch function
    const fetchBrands = useCallback(async () => {
        try {
            const { data } = await axios.get("http://localhost:3500/brands");
            setBrands(data);
            setCart(data.map(brand => ({ ...brand, quantity: 0 })));
        } catch (err) {
            toast.error("Error fetching brands. Try again later.");
            console.error("Fetch brands error:", err);
        }
    }, []);

    useEffect(() => {
        fetchBrands();
    }, [fetchBrands]);

    // Optimized cart operations
    const updateQuantity = (brandId, change) => {
        setCart(prevCart => {
            const updatedCart = prevCart.map(item => 
                item._id === brandId 
                    ? { 
                        ...item, 
                        quantity: Math.max(0, Math.min(item.stock, item.quantity + change)) 
                    } 
                    : item
            );
            calculateTotal(updatedCart);
            return updatedCart;
        });
    };

    const calculateTotal = useCallback((cartItems) => {
        const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        setTotalCost(total);
    }, []);

    const handleSale = async () => {
        const sales = cart.filter(item => item.quantity > 0);
        
        if (sales.length === 0) {
            toast.error("No items selected for sale.");
            return;
        }
    
        // Validate stock before sending
        const stockErrors = sales.filter(sale => sale.quantity > sale.stock);
        if (stockErrors.length > 0) {
            stockErrors.forEach(sale => {
                toast.error(`Insufficient stock for ${sale.name} (Available: ${sale.stock}, Requested: ${sale.quantity})`);
            });
            return;
        }
    
        // Validate amount received is at least the total cost
        if (amountReceived < totalCost) {
            toast.error(`Amount received (${amountReceived}) is less than total cost (${totalCost})`);
            return;
        }
    
        setIsProcessing(true);
    
        try {
            // Calculate amounts with proper rounding
            const saleData = sales.map(sale => {
                const itemTotal = sale.quantity * sale.price;
                const itemPercentage = itemTotal / totalCost;
                const itemAmountReceived = amountReceived * itemPercentage;
                
                return {
                    brandId: sale._id,
                    quantity: sale.quantity,
                    totalAmount: parseFloat(itemTotal.toFixed(2)),
                    amountReceived: parseFloat(itemAmountReceived.toFixed(2))
                };
            });
    
            const response = await axios.post("http://localhost:3500/sales/bulk", {
                sales: saleData
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
    
            if (response.data.success) {
                toast.success(response.data.message);
                setCart(prevCart => prevCart.map(item => ({ ...item, quantity: 0 })));
                setTotalCost(0);
                setAmountReceived(0);
                await fetchBrands();
            } else {
                throw new Error(response.data.message);
            }
        } catch (err) {
            console.error("Sale error:", err.response?.data || err.message);
            
            if (err.response?.data?.error) {
                const failedItem = sales[err.response.data.saleIndex] || {};
                toast.error(
                    `Error with ${failedItem.name || 'item'}: ${err.response.data.error}`
                );
            } else {
                toast.error(err.message || "Failed to complete sale");
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        navigate("/");
        toast.success("Logged out successfully.");
    };

    const filteredCart = cart.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="dashboard-container">
            <ToastContainer position="top-center" autoClose={3000} />
            
            {/* Header Section */}
            <div className="dashboard-header">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="text-primary mb-0">
                            <FaShoppingCart className="me-2" />
                            Sales Dashboard
                        </h2>
                        <small className="text-muted">Manage your sales transactions</small>
                    </div>
                    <div className="d-flex align-items-center">
                        <button 
                            className="btn btn-outline-secondary me-2"
                            onClick={fetchBrands}
                            disabled={isProcessing}
                        >
                            <FiRefreshCw className={isProcessing ? "spin" : ""} />
                        </button>
                        <button 
                            className="btn btn-danger"
                            onClick={handleLogout}
                        >
                            <FaSignOutAlt className="me-1" />
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="mb-4">
                <div className="input-group">
                    <span className="input-group-text">
                        <i className="bi bi-search"></i>
                    </span>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Search brands..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Products Table */}
            <div className="card mb-4 shadow-sm">
                <div className="card-body table-responsive">
                    <table className="table table-hover align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>Brand</th>
                                <th>Price</th>
                                <th>Stock</th>
                                <th>Quantity</th>
                                <th>Subtotal</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCart.map((item) => (
                                <tr key={item._id} className={item.quantity > 0 ? "table-active" : ""}>
                                    <td>
                                        <strong>{item.name}</strong>
                                        {item.quantity > 0 && (
                                            <span className="badge bg-primary ms-2">
                                                {item.quantity} in cart
                                            </span>
                                        )}
                                    </td>
                                    <td>${item.price.toFixed(2)}</td>
                                    <td>
                                        <span className={item.stock < 5 ? "text-danger" : ""}>
                                            {item.stock} {item.stock < 5 && "(Low)"}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="d-flex align-items-center">
                                            <button 
                                                className="btn btn-sm btn-outline-secondary"
                                                onClick={() => updateQuantity(item._id, -1)}
                                                disabled={item.quantity <= 0}
                                            >
                                                <FaMinus />
                                            </button>
                                            <span className="mx-2">{item.quantity}</span>
                                            <button 
                                                className="btn btn-sm btn-outline-secondary"
                                                onClick={() => updateQuantity(item._id, 1)}
                                                disabled={item.quantity >= item.stock}
                                            >
                                                <FaPlus />
                                            </button>
                                        </div>
                                    </td>
                                    <td>
                                        ${(item.price * item.quantity).toFixed(2)}
                                    </td>
                                    <td>
                                        <button 
                                            className="btn btn-sm btn-danger"
                                            onClick={() => updateQuantity(item._id, -item.quantity)}
                                            disabled={item.quantity <= 0}
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Transaction Summary */}
            <div className="card shadow-sm">
                <div className="card-body">
                    <h5 className="card-title d-flex align-items-center">
                        <FaCalculator className="me-2" />
                        Transaction Summary
                    </h5>
                    
                    <div className="row mb-3">
                        <div className="col-md-6">
                            <div className="summary-item">
                                <span>Items in Cart:</span>
                                <span className="badge bg-primary rounded-pill">
                                    {cartItemsCount}
                                </span>
                            </div>
                            <div className="summary-item">
                                <span>Total Cost:</span>
                                <span className="fw-bold">${totalCost.toFixed(2)}</span>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="mb-3">
                                <label className="form-label d-flex align-items-center">
                                    <FaMoneyBillWave className="me-2" />
                                    Amount Received
                                </label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={amountReceived || ""}
                                    onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="summary-item">
                                <span>Change Due:</span>
                                <span className={amountReceived >= totalCost ? "text-success" : "text-danger"}>
                                    ${Math.max(0, amountReceived - totalCost).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button 
                        className="btn btn-success w-100 py-2"
                        onClick={handleSale}
                        disabled={totalCost === 0 || amountReceived < totalCost || isProcessing}
                    >
                        {isProcessing ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                Processing...
                            </>
                        ) : (
                            "Confirm Sale"
                        )}
                    </button>
                </div>
            </div>

            {/* Custom CSS in JS for spinner animation */}
        {/* Add this CSS */}
        <style jsx>{`
            .fixed-logout-button {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
            }
            .dashboard-container {
                padding: 2rem;
                max-width: 1200px;
                margin: 0 auto;
                margin-top: 60px; /* Add space for fixed button */
            }
            .summary-item {
                display: flex;
                justify-content: space-between;
                padding: 0.5rem 0;
                border-bottom: 1px solid #eee;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .spin {
                animation: spin 1s linear infinite;
            }
            .table-active {
                background-color: rgba(13, 110, 253, 0.05) !important;
            }
        `}</style>
        </div>
    );
};

export default Dashboard;