import React, { useEffect, useState } from "react";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "bootstrap/dist/css/bootstrap.min.css";
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const SalesPage = () => {
  const [sales, setSales] = useState([]);
  const [brands, setBrands] = useState([]);
  const [newSale, setNewSale] = useState({ 
    brandId: "", 
    quantity: "", 
    amountReceived: "" 
  });
  const [editSale, setEditSale] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportParams, setReportParams] = useState({
    period: 'week',
    saleType: 'all',
    brand: 'all',
    startDate: '',
    endDate: ''
  });
  const [currentPage, setCurrentPage] = useState(1); // Ensure this is present
  const [totalPages, setTotalPages] = useState(1);


  useEffect(() => {
    fetchSales();
    fetchBrands();
    fetchSalesStats();
  }, []);

  const fetchSales = async () => {
    try {
      const response = await axios.get(`http://localhost:3500/sales?page=${currentPage}`);
      setSales(response.data.sales);
      setTotalPages(response.data.totalPages);
    } catch (err) {
      console.error("Error fetching sales", err);
      toast.error("Failed to fetch sales");
    }
  };  
  

  const fetchBrands = async () => {
    try {
      const response = await axios.get("http://localhost:3500/brands");
      setBrands(response.data);
    } catch (err) {
      console.error("Error fetching brands", err);
      toast.error("Failed to fetch brands");
    }
  };

  const fetchSalesStats = async (params = {}) => {
    setLoading(true);
    try {
      const response = await axios.get("http://localhost:3500/sales/advanced-report", {
        params: {
          period: params.period || reportParams.period,
          saleType: params.saleType || reportParams.saleType,
          brandId: params.brand || reportParams.brand,
          startDate: params.startDate || reportParams.startDate,
          endDate: params.endDate || reportParams.endDate
        }
      });
      setReportData(response.data);
    } catch (err) {
      console.error("Error fetching sales stats", err);
      toast.error("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const handleSaleChange = (e) => {
    const { name, value } = e.target;
    setNewSale((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSale = async (e) => {
    e.preventDefault();
    if (!newSale.brandId || !newSale.quantity || !newSale.amountReceived) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const brand = brands.find(b => b._id === newSale.brandId);
      if (!brand) {
        toast.error("Invalid brand selected");
        return;
      }

      const totalAmount = newSale.quantity * brand.price;
      await axios.post("http://localhost:3500/sales", {
        brandId: newSale.brandId,
        quantity: parseInt(newSale.quantity),
        totalAmount,
        amountReceived: parseFloat(newSale.amountReceived)
      });
      
      toast.success("Sale recorded successfully!");
      setNewSale({ brandId: "", quantity: "", amountReceived: "" });
      fetchSales();
      fetchSalesStats();
    } catch (err) {
      toast.error("Failed to add sale. Please try again.");
    }
  };

  const handleEditSale = (sale) => {
    setEditSale(sale);
    setNewSale({ 
      brandId: sale.brand._id, 
      quantity: sale.quantity, 
      amountReceived: sale.amountReceived 
    });
  };

  const handleUpdateSale = async (e) => {
    e.preventDefault();
    try {
      const brand = brands.find(b => b._id === newSale.brandId);
      if (!brand) {
        toast.error("Invalid brand selected");
        return;
      }

      const totalAmount = newSale.quantity * brand.price;
      await axios.put(`http://localhost:3500/sales/${editSale._id}`, {
        quantity: parseInt(newSale.quantity),
        totalAmount,
        amountReceived: parseFloat(newSale.amountReceived)
      });
      
      toast.success("Sale updated successfully!");
      setEditSale(null);
      setNewSale({ brandId: "", quantity: "", amountReceived: "" });
      fetchSales();
      fetchSalesStats();
    } catch (err) {
      toast.error("Failed to update sale. Please try again.");
    }
  };

  const handleDeleteSale = async (saleId) => {
    if (window.confirm("Are you sure you want to delete this sale?")) {
      try {
        await axios.delete(`http://localhost:3500/sales/${saleId}`);
        toast.success("Sale deleted successfully!");
        fetchSales();
        fetchSalesStats();
      } catch (err) {
        toast.error("Failed to delete sale. Please try again.");
      }
    }
  };

  const handleReportParamChange = (e) => {
    const { name, value } = e.target;
    setReportParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const downloadCSVReport = async () => {
    try {
      const response = await axios.get(
        "http://localhost:3500/sales/advanced-report/download", 
        {
          params: reportParams,
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      toast.error("Failed to download report");
    }
  };

  const filteredSales = Array.isArray(sales) ? sales.filter(sale => {
    if (reportParams.saleType === 'all') return true;
    return sale.saleType === reportParams.saleType;
  }) : []; // Return empty array if sales is not an array  
  

  // Prepare chart data
  const prepareChartData = () => {
    if (!reportData) return null;

    // Daily trend data
    const dailyData = Object.entries(reportData.dailyStats || {})
      .map(([date, stats]) => ({
        date,
        ...stats
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const lineChartData = {
      labels: dailyData.map(item => item.date),
      datasets: [
        {
          label: 'Daily Revenue',
          data: dailyData.map(item => item.totalAmount),
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1,
          fill: false
        }
      ]
    };

    // Brand performance data
    const brandData = Object.entries(reportData.brandStats || {})
      .map(([brand, stats]) => ({
        brand,
        ...stats
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5); // Top 5 brands

    const barChartData = {
      labels: brandData.map(item => item.brand),
      datasets: [
        {
          label: 'Revenue by Brand',
          data: brandData.map(item => item.totalAmount),
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }
      ]
    };

    return { lineChartData, barChartData };
  };

  const chartData = prepareChartData();

  return (
    <div className="container mt-4">
      <ToastContainer />
      <h2 className="mb-4">Sales Management</h2>

      {/* Report Generator */}
      <div className="card mb-4">
        <div className="card-body">
          <h5 className="card-title">Generate Custom Report</h5>
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Time Period</label>
              <select
                className="form-select"
                name="period"
                value={reportParams.period}
                onChange={handleReportParamChange}
              >
                <option value="day">Last 24 Hours</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="year">Last 12 Months</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {reportParams.period === 'custom' && (
              <>
                <div className="col-md-3">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="form-control"
                    name="startDate"
                    value={reportParams.startDate}
                    onChange={handleReportParamChange}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    className="form-control"
                    name="endDate"
                    value={reportParams.endDate}
                    onChange={handleReportParamChange}
                  />
                </div>
              </>
            )}

            <div className="col-md-3">
              <label className="form-label">Sale Type</label>
              <select
                className="form-select"
                name="saleType"
                value={reportParams.saleType}
                onChange={handleReportParamChange}
              >
                <option value="all">All Types</option>
                <option value="single">Single Product</option>
                <option value="multi">Multi-Product</option>
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label">Brand</label>
              <select
                className="form-select"
                name="brand"
                value={reportParams.brand}
                onChange={handleReportParamChange}
              >
                <option value="all">All Brands</option>
                {brands.map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="col-12">
              <button
                className="btn btn-primary me-2"
                onClick={() => fetchSalesStats()}
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </button>
              <button
                className="btn btn-success"
                onClick={downloadCSVReport}
                disabled={!reportData}
              >
                Download CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Summary */}
      {reportData && (
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card text-white bg-primary">
              <div className="card-body">
                <h5 className="card-title">Total Sales</h5>
                <p className="card-text display-6">{reportData.summary.totalSales}</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-white bg-success">
              <div className="card-body">
                <h5 className="card-title">Total Revenue</h5>
                <p className="card-text display-6">
                    ${(reportData.summary?.totalAmount ?? 0).toFixed(2)} {/* Ensure totalAmount is safely accessed */}
                {/* Display deficit if totalAmount is negative, though it should not be in a well-functioning sales system */}
                    </p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-white bg-info">
              <div className="card-body">
                <h5 className="card-title">Total Quantity</h5>
                <p className="card-text display-6">{reportData.summary.totalQuantity}</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-white bg-warning">
              <div className="card-body">
                <h5 className="card-title">Balance</h5>
                <p className="card-text display-6">
                ${(reportData.summary?.balance ?? 0).toFixed(2)} {/* Ensure balance is safely accessed */}
                {(reportData.summary?.balance ?? 0) < 0 && (
                    <span className="text-danger ms-2">(Deficit)</span>
                )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      {chartData && (
        <div className="row mb-4">
          <div className="col-md-6">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">Daily Sales Trend</h5>
                <Line 
                  data={chartData.lineChartData} 
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'top',
                      },
                      title: {
                        display: true,
                        text: 'Revenue Over Time'
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">Top Performing Brands</h5>
                <Bar
                  data={chartData.barChartData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'top',
                      },
                      title: {
                        display: true,
                        text: 'Revenue by Brand'
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sales Form */}
      <div className="card mb-4">
        <div className="card-body">
          <h5 className="card-title">{editSale ? "Edit Sale" : "Add New Sale"}</h5>
          
          <form onSubmit={editSale ? handleUpdateSale : handleAddSale}>
            <div className="row">
              <div className="col-md-4 mb-3">
                <label className="form-label">Brand</label>
                <select
                  className="form-control"
                  name="brandId"
                  value={newSale.brandId}
                  onChange={handleSaleChange}
                  required
                >
                  <option value="">Select Brand</option>
                  {brands.map(brand => (
                    <option key={brand._id} value={brand._id}>
                      {brand.name} (${brand.price.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4 mb-3">
                <label className="form-label">Quantity</label>
                <input
                  type="number"
                  className="form-control"
                  name="quantity"
                  value={newSale.quantity}
                  onChange={handleSaleChange}
                  min="1"
                  required
                />
              </div>
              <div className="col-md-4 mb-3">
                <label className="form-label">Amount Received ($)</label>
                <input
                  type="number"
                  className="form-control"
                  name="amountReceived"
                  value={newSale.amountReceived}
                  onChange={handleSaleChange}
                  step="0.01"
                  min="0"
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-100">
              {editSale ? "Update Sale" : "Add Sale"}
            </button>
            {editSale && (
              <button
                type="button"
                className="btn btn-secondary w-100 mt-2"
                onClick={() => {
                  setEditSale(null);
                  setNewSale({ brandId: "", quantity: "", amountReceived: "" });
                }}
              >
                Cancel Edit
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Sales List */}
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">Sales Records</h5>
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead className="table-dark">
                <tr>
                  <th>Date</th>
                  <th>Brand</th>
                  <th className="text-end">Qty</th>
                  <th className="text-end">Type</th>
                  <th className="text-end">Unit Price</th>
                  <th className="text-end">Total</th>
                  <th className="text-end">Received</th>
                  <th className="text-end">Balance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => {
                  const unitPrice = sale.totalAmount / sale.quantity;
                  const totalAmount = sale.totalAmount || 0;
                  const amountReceived = sale.amountReceived || 0;
                  const balance = amountReceived - totalAmount;

                  return (
                    <tr key={sale._id}>
                      <td>{new Date(sale.date).toLocaleDateString()}</td>
                      <td>{sale.brand?.name || "Brand not found"}</td>
                      <td className="text-end">{sale.quantity}</td>
                      <td className="text-end">
                        <span className={`badge ${sale.saleType === 'multi' ? 'bg-info' : 'bg-primary'}`}>
                          {sale.saleType === 'multi' ? 'Multi' : 'Single'}
                        </span>
                      </td>
                      <td className="text-end">${unitPrice?.toFixed(2) || '0.00'}</td>
                      <td className="text-end">${totalAmount.toFixed(2)}</td>
                      <td className="text-end">${amountReceived.toFixed(2)}</td>
                      <td className="text-end">
                        {balance < 0 ? (
                          <span className="text-danger">
                            -${Math.abs(balance).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-success">
                            +${balance.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-primary"
                            onClick={() => handleEditSale(sale)}
                            title="Edit"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => handleDeleteSale(sale._id)}
                            title="Delete"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesPage;