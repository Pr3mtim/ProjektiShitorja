import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "bootstrap/dist/css/bootstrap.min.css";

const ProductManagement = () => {
    const [products, setProducts] = useState([]);
    const [newProduct, setNewProduct] = useState({ name: "", price: "", stock: "" });
    const [restockAmount, setRestockAmount] = useState("");
    const [restockProductId, setRestockProductId] = useState(null);
    const [editingProduct, setEditingProduct] = useState(null);
    const [editFormData, setEditFormData] = useState({ name: "", price: "", stock: "" });

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await axios.get("http://localhost:3500/brands");
            setProducts(response.data);
        } catch (error) {
            toast.error("Error fetching products.");
        }
    };

    const handleChange = (e) => {
        setNewProduct({ ...newProduct, [e.target.name]: e.target.value });
    };

    const handleEditChange = (e) => {
        setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
    };

    const addProduct = async (e) => {
        e.preventDefault();
        try {
            await axios.post("http://localhost:3500/brands", newProduct);
            fetchProducts();
            setNewProduct({ name: "", price: "", stock: "" });
            toast.success("Product added successfully!");
        } catch (error) {
            toast.error("Error adding product.");
        }
    };

    const deleteProduct = async (id) => {
        try {
            await axios.delete(`http://localhost:3500/brands/${id}`);
            fetchProducts();
            toast.success("Product deleted successfully.");
        } catch (error) {
            toast.error("Error deleting product.");
        }
    };

    const openRestockModal = (productId) => {
        setRestockProductId(productId);
        setRestockAmount("");
    };

    const closeRestockModal = () => {
        setRestockProductId(null);
        setRestockAmount("");
    };

    const openEditModal = (product) => {
        setEditingProduct(product);
        setEditFormData({
            name: product.name,
            price: product.price,
            stock: product.stock
        });
    };

    const closeEditModal = () => {
        setEditingProduct(null);
        setEditFormData({ name: "", price: "", stock: "" });
    };

    const handleRestock = async () => {
        if (!restockAmount || isNaN(restockAmount)) {
            toast.error("Please enter a valid amount");
            return;
        }

        try {
            await axios.put(`http://localhost:3500/brands/${restockProductId}`, {
                stock: parseInt(restockAmount),
                lastRestocked: new Date()
            });
            fetchProducts();
            closeRestockModal();
            toast.success("Product restocked successfully!");
        } catch (error) {
            toast.error("Error restocking product.");
        }
    };

    const handleUpdate = async () => {
        try {
            await axios.put(`http://localhost:3500/brands/${editingProduct._id}`, editFormData);
            fetchProducts();
            closeEditModal();
            toast.success("Product updated successfully!");
        } catch (error) {
            toast.error("Error updating product.");
        }
    };

    return (
        <div className="container mt-5">
            <ToastContainer />
            <h2 className="text-primary mb-4">Product Management</h2>
            
            {/* Add Product Form */}
            <div className="card mb-4">
                <div className="card-body">
                    <h4 className="card-title">Add New Product</h4>
                    <form onSubmit={addProduct}>
                        <div className="row">
                            <div className="col-md-4 mb-3">
                                <input
                                    type="text"
                                    name="name"
                                    className="form-control"
                                    placeholder="Product Name"
                                    value={newProduct.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="col-md-4 mb-3">
                                <input
                                    type="number"
                                    name="price"
                                    className="form-control"
                                    placeholder="Price"
                                    value={newProduct.price}
                                    onChange={handleChange}
                                    min="0"
                                    step="0.01"
                                    required
                                />
                            </div>
                            <div className="col-md-4 mb-3">
                                <input
                                    type="number"
                                    name="stock"
                                    className="form-control"
                                    placeholder="Initial Stock"
                                    value={newProduct.stock}
                                    onChange={handleChange}
                                    min="0"
                                    required
                                />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary w-100">
                            Add Product
                        </button>
                    </form>
                </div>
            </div>

            {/* Products List */}
            <div className="card">
                <div className="card-body">
                    <h4 className="card-title">Product Inventory</h4>
                    <div className="table-responsive">
                        <table className="table table-striped table-hover">
                            <thead className="table-dark">
                                <tr>
                                    <th>Name</th>
                                    <th className="text-end">Price</th>
                                    <th className="text-end">Stock</th>
                                    <th className="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product) => (
                                    <tr key={product._id}>
                                        <td>{product.name}</td>
                                        <td className="text-end">${product.price.toFixed(2)}</td>
                                        <td className="text-end">{product.stock}</td>
                                        <td className="text-end">
                                            <div className="btn-group">
                                                <button
                                                    className="btn btn-sm btn-warning me-2"
                                                    onClick={() => openEditModal(product)}
                                                >
                                                    <i className="bi bi-pencil"></i> Edit
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-success me-2"
                                                    onClick={() => openRestockModal(product._id)}
                                                >
                                                    <i className="bi bi-box-arrow-in-down"></i> Restock
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-danger"
                                                    onClick={() => deleteProduct(product._id)}
                                                >
                                                    <i className="bi bi-trash"></i> Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Restock Modal */}
            {restockProductId && (
                <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Restock Product</h5>
                                <button type="button" className="btn-close" onClick={closeRestockModal}></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="form-label">Amount to Add</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={restockAmount}
                                        onChange={(e) => setRestockAmount(e.target.value)}
                                        min="1"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeRestockModal}>
                                    Cancel
                                </button>
                                <button type="button" className="btn btn-primary" onClick={handleRestock}>
                                    Confirm Restock
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Product Modal */}
            {editingProduct && (
                <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Edit Product</h5>
                                <button type="button" className="btn-close" onClick={closeEditModal}></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="form-label">Product Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        className="form-control"
                                        value={editFormData.name}
                                        onChange={handleEditChange}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Price</label>
                                    <input
                                        type="number"
                                        name="price"
                                        className="form-control"
                                        value={editFormData.price}
                                        onChange={handleEditChange}
                                        min="0"
                                        step="0.01"
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Stock</label>
                                    <input
                                        type="number"
                                        name="stock"
                                        className="form-control"
                                        value={editFormData.stock}
                                        onChange={handleEditChange}
                                        min="0"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeEditModal}>
                                    Cancel
                                </button>
                                <button type="button" className="btn btn-primary" onClick={handleUpdate}>
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
        </div>
    );
};

export default ProductManagement;