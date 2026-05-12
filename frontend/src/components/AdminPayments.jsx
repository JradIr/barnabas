// src/components/AdminPayments.jsx

import React, { useState, useEffect } from "react";
import AxiosInstance from "./AxiosInstance";

const AdminPayments = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [payments, setPayments] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [approvalNote, setApprovalNote] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [stats, setStats] = useState({
    totalPayments: 0,
    pendingPayments: 0,
    approvedPayments: 0,
    rejectedPayments: 0,
    totalAmount: 0,
    pendingAmount: 0,
    approvedAmount: 0,
  });

  useEffect(() => {
    fetchPaymentsData();
  }, [filterStatus, dateRange]);

  const fetchPaymentsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all billing data
      let billingUrl = "billing/";
      if (dateRange.startDate && dateRange.endDate) {
        billingUrl += `?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`;
      }

      const [billingRes, paymentsRes] = await Promise.all([
        AxiosInstance.get(billingUrl),
        AxiosInstance.get("payments/"),
      ]);

      let billingData = billingRes.data;
      let paymentsData = paymentsRes.data;

      // Ensure data is array
      if (!Array.isArray(billingData)) {
        billingData = billingData.results || billingData.bills || [];
      }
      if (!Array.isArray(paymentsData)) {
        paymentsData = paymentsData.results || [];
      }

      // Process payments with approval status
      const processedPayments = billingData.map(bill => ({
        id: bill.id,
        invoiceNumber: bill.invoice_number || `INV-${bill.id}`,
        patientName: bill.patient_name || bill.user_username || "Unknown",
        patientEmail: bill.user_email || "",
        amount: parseFloat(bill.amount || 0),
        paidAmount: parseFloat(bill.paid_amount || 0),
        balance: parseFloat(bill.balance || bill.amount || 0),
        status: bill.status || "pending",
        paymentMethod: bill.payment_method || "N/A",
        paymentDate: bill.payment_date || bill.due_date,
        dueDate: bill.due_date,
        description: bill.description || "Dental Service",
        requiresApproval: bill.braces_down_payment_approved === false && 
                         bill.description?.toLowerCase().includes("braces"),
        approvalStatus: bill.braces_down_payment_approved ? "approved" : "pending",
        createdAt: bill.created_at,
      }));

      // Filter based on status
      let filteredPayments = processedPayments;
      if (filterStatus !== "all") {
        filteredPayments = processedPayments.filter(p => p.status === filterStatus);
      }

      // Get pending approvals (braces down payments awaiting approval)
      const pendingApprovalsList = processedPayments.filter(
        p => p.requiresApproval && p.approvalStatus === "pending"
      );

      // Calculate statistics
      const totalAmount = processedPayments.reduce((sum, p) => sum + p.amount, 0);
      const pendingAmount = processedPayments
        .filter(p => p.status === "pending" || p.status === "partial")
        .reduce((sum, p) => sum + p.balance, 0);
      const approvedAmount = processedPayments
        .filter(p => p.status === "paid")
        .reduce((sum, p) => sum + p.amount, 0);

      setStats({
        totalPayments: processedPayments.length,
        pendingPayments: processedPayments.filter(p => p.status === "pending" || p.status === "partial").length,
        approvedPayments: processedPayments.filter(p => p.status === "paid").length,
        rejectedPayments: processedPayments.filter(p => p.status === "cancelled").length,
        totalAmount: totalAmount,
        pendingAmount: pendingAmount,
        approvedAmount: approvedAmount,
      });

      setPayments(filteredPayments);
      setPendingApprovals(pendingApprovalsList);
      setTransactions(paymentsData);

    } catch (err) {
      console.error("Error fetching payments:", err);
      setError(err.response?.data?.error || "Failed to load payment data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePayment = async (paymentId) => {
    try {
      setLoading(true);
      
      // Call the approve_braces_down_payment endpoint
      await AxiosInstance.post(`billing/${paymentId}/approve_braces_down_payment/`, {
        note: approvalNote,
      });

      setSuccessMessage("Payment approved successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
      
      setShowApprovalModal(false);
      setApprovalNote("");
      fetchPaymentsData();
      
    } catch (err) {
      console.error("Error approving payment:", err);
      setError(err.response?.data?.error || "Failed to approve payment. Please try again.");
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (paymentId, amount, method) => {
    try {
      setLoading(true);
      
      await AxiosInstance.post(`billing/${paymentId}/record_payment/`, {
        amount: amount,
        payment_method: method,
        notes: `Payment recorded by admin on ${new Date().toLocaleDateString()}`,
      });

      setSuccessMessage("Payment recorded successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
      
      fetchPaymentsData();
      
    } catch (err) {
      console.error("Error recording payment:", err);
      setError(err.response?.data?.error || "Failed to record payment. Please try again.");
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "#4caf50";
      case "pending":
        return "#ff9800";
      case "partial":
        return "#2196f3";
      case "overdue":
        return "#f44336";
      case "cancelled":
        return "#9e9e9e";
      default:
        return "#666";
    }
  };

  const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "Paid";
      case "pending":
        return "Pending";
      case "partial":
        return "Partial";
      case "overdue":
        return "Overdue";
      case "cancelled":
        return "Cancelled";
      default:
        return status || "Unknown";
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleSearch = (payment) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      payment.patientName?.toLowerCase().includes(term) ||
      payment.invoiceNumber?.toLowerCase().includes(term) ||
      payment.patientEmail?.toLowerCase().includes(term)
    );
  };

  if (loading && payments.length === 0) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading payment data...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Payment Management</h1>
        <p style={styles.subtitle}>Manage and approve patient payments</p>
      </div>

      {successMessage && (
        <div style={styles.successAlert}>
          <span>✓</span> {successMessage}
        </div>
      )}

      {error && (
        <div style={styles.errorAlert}>
          <span>⚠️</span> {error}
          <button onClick={fetchPaymentsData} style={styles.retryButton}>Retry</button>
        </div>
      )}

      {/* Pending Approvals Section */}
      {pendingApprovals.length > 0 && (
        <div style={styles.pendingSection}>
          <div style={styles.pendingHeader}>
            <h2 style={styles.sectionTitle}>Pending Approvals</h2>
            <span style={styles.pendingBadge}>{pendingApprovals.length} Requires Approval</span>
          </div>
          <div style={styles.pendingGrid}>
            {pendingApprovals.map((payment) => (
              <div key={payment.id} style={styles.pendingCard}>
                <div style={styles.pendingCardHeader}>
                  <span style={styles.pendingIcon}>⏳</span>
                  <span style={styles.pendingTitle}>Braces Down Payment</span>
                </div>
                <div style={styles.pendingContent}>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Patient:</span>
                    <span style={styles.infoValue}>{payment.patientName}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Amount:</span>
                    <span style={styles.infoValue}>{formatCurrency(payment.amount)}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Invoice:</span>
                    <span style={styles.infoValue}>{payment.invoiceNumber}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Date:</span>
                    <span style={styles.infoValue}>{formatDate(payment.createdAt)}</span>
                  </div>
                </div>
                <div style={styles.pendingActions}>
                  <button
                    style={styles.approveButton}
                    onClick={() => {
                      setSelectedPayment(payment);
                      setShowApprovalModal(true);
                    }}
                  >
                    Approve Payment
                  </button>
                  <button
                    style={styles.viewButton}
                    onClick={() => {
                      setSelectedPayment(payment);
                      setShowDetailsModal(true);
                    }}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={styles.filtersSection}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">All Payments</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Search</label>
          <input
            type="text"
            placeholder="Search by patient or invoice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Start Date</label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            style={styles.dateInput}
          />
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>End Date</label>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            style={styles.dateInput}
          />
        </div>

        <button onClick={fetchPaymentsData} style={styles.applyButton}>
          Apply Filters
        </button>
      </div>

      {/* Statistics Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>💰</div>
          <div style={styles.statContent}>
            <div style={styles.statValue}>{formatCurrency(stats.totalAmount)}</div>
            <div style={styles.statLabel}>Total Revenue</div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>⏳</div>
          <div style={styles.statContent}>
            <div style={styles.statValue}>{stats.pendingPayments}</div>
            <div style={styles.statLabel}>Pending Payments</div>
            <div style={styles.statSub}>{formatCurrency(stats.pendingAmount)}</div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>✅</div>
          <div style={styles.statContent}>
            <div style={styles.statValue}>{stats.approvedPayments}</div>
            <div style={styles.statLabel}>Completed Payments</div>
            <div style={styles.statSub}>{formatCurrency(stats.approvedAmount)}</div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>📊</div>
          <div style={styles.statContent}>
            <div style={styles.statValue}>
              {stats.totalPayments > 0
                ? ((stats.approvedAmount / stats.totalAmount) * 100).toFixed(1)
                : 0}%
            </div>
            <div style={styles.statLabel}>Collection Rate</div>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div style={styles.tableSection}>
        <div style={styles.tableHeader}>
          <h2 style={styles.sectionTitle}>Payment Transactions</h2>
          <button onClick={fetchPaymentsData} style={styles.refreshButton}>
            🔄 Refresh
          </button>
        </div>

        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.th}>Invoice #</th>
                <th style={styles.th}>Patient Name</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Paid Amount</th>
                <th style={styles.th}>Balance</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Payment Method</th>
                <th style={styles.th}>Due Date</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.filter(handleSearch).length === 0 ? (
                <tr>
                  <td colSpan="9" style={styles.emptyState}>
                    No payments found matching your criteria
                  </td>
                </tr>
              ) : (
                payments.filter(handleSearch).map((payment) => (
                  <tr key={payment.id} style={styles.tableRow}>
                    <td style={styles.td}>{payment.invoiceNumber}</td>
                    <td style={styles.td}>
                      <div>
                        <div style={styles.patientName}>{payment.patientName}</div>
                        <div style={styles.patientEmail}>{payment.patientEmail}</div>
                      </div>
                    </td>
                    <td style={styles.td}>{formatCurrency(payment.amount)}</td>
                    <td style={styles.td}>{formatCurrency(payment.paidAmount)}</td>
                    <td style={styles.td}>{formatCurrency(payment.balance)}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: getStatusColor(payment.status)
                      }}>
                        {getStatusText(payment.status)}
                      </span>
                    </td>
                    <td style={styles.td}>{payment.paymentMethod}</td>
                    <td style={styles.td}>{formatDate(payment.dueDate)}</td>
                    <td style={styles.td}>
                      <div style={styles.actionButtons}>
                        {payment.status !== "paid" && (
                          <button
                            style={styles.recordButton}
                            onClick={() => {
                              const amount = prompt("Enter payment amount:", payment.balance);
                              if (amount) {
                                const method = prompt("Payment method (cash, credit_card, bank_transfer):", "cash");
                                if (method) {
                                  handleRecordPayment(payment.id, parseFloat(amount), method);
                                }
                              }
                            }}
                          >
                            Record Payment
                          </button>
                        )}
                        <button
                          style={styles.viewDetailsButton}
                          onClick={() => {
                            setSelectedPayment(payment);
                            setShowDetailsModal(true);
                          }}
                        >
                          View Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedPayment && (
        <div style={styles.modalOverlay} onClick={() => setShowApprovalModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Approve Braces Down Payment</h2>
              <button
                style={styles.closeButton}
                onClick={() => setShowApprovalModal(false)}
              >
                ✕
              </button>
            </div>
            <div style={styles.modalContent}>
              <div style={styles.modalInfo}>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Patient:</span>
                  <span style={styles.infoValue}>{selectedPayment.patientName}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Invoice:</span>
                  <span style={styles.infoValue}>{selectedPayment.invoiceNumber}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Amount:</span>
                  <span style={styles.infoValue}>{formatCurrency(selectedPayment.amount)}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Description:</span>
                  <span style={styles.infoValue}>{selectedPayment.description}</span>
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Approval Note (Optional)</label>
                <textarea
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  style={styles.textarea}
                  placeholder="Add any notes about this approval..."
                  rows="3"
                />
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button
                style={styles.cancelButton}
                onClick={() => setShowApprovalModal(false)}
              >
                Cancel
              </button>
              <button
                style={styles.approveModalButton}
                onClick={() => handleApprovePayment(selectedPayment.id)}
              >
                Approve Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedPayment && (
        <div style={styles.modalOverlay} onClick={() => setShowDetailsModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Payment Details</h2>
              <button
                style={styles.closeButton}
                onClick={() => setShowDetailsModal(false)}
              >
                ✕
              </button>
            </div>
            <div style={styles.modalContent}>
              <div style={styles.detailsSection}>
                <h3 style={styles.detailsTitle}>Invoice Information</h3>
                <div style={styles.detailsGrid}>
                  <div style={styles.detailsItem}>
                    <label>Invoice Number:</label>
                    <p>{selectedPayment.invoiceNumber}</p>
                  </div>
                  <div style={styles.detailsItem}>
                    <label>Status:</label>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: getStatusColor(selectedPayment.status)
                    }}>
                      {getStatusText(selectedPayment.status)}
                    </span>
                  </div>
                  <div style={styles.detailsItem}>
                    <label>Total Amount:</label>
                    <p>{formatCurrency(selectedPayment.amount)}</p>
                  </div>
                  <div style={styles.detailsItem}>
                    <label>Paid Amount:</label>
                    <p>{formatCurrency(selectedPayment.paidAmount)}</p>
                  </div>
                  <div style={styles.detailsItem}>
                    <label>Balance:</label>
                    <p>{formatCurrency(selectedPayment.balance)}</p>
                  </div>
                  <div style={styles.detailsItem}>
                    <label>Due Date:</label>
                    <p>{formatDate(selectedPayment.dueDate)}</p>
                  </div>
                  <div style={styles.detailsItem}>
                    <label>Payment Method:</label>
                    <p>{selectedPayment.paymentMethod}</p>
                  </div>
                  <div style={styles.detailsItem}>
                    <label>Payment Date:</label>
                    <p>{formatDate(selectedPayment.paymentDate)}</p>
                  </div>
                </div>
              </div>
              <div style={styles.detailsSection}>
                <h3 style={styles.detailsTitle}>Patient Information</h3>
                <div style={styles.detailsGrid}>
                  <div style={styles.detailsItem}>
                    <label>Name:</label>
                    <p>{selectedPayment.patientName}</p>
                  </div>
                  <div style={styles.detailsItem}>
                    <label>Email:</label>
                    <p>{selectedPayment.patientEmail}</p>
                  </div>
                </div>
              </div>
              <div style={styles.detailsSection}>
                <h3 style={styles.detailsTitle}>Service Description</h3>
                <p style={styles.description}>{selectedPayment.description}</p>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button
                style={styles.closeModalButton}
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "24px",
    fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif",
    backgroundColor: "#f5f5f5",
    minHeight: "100vh",
  },

  header: {
    marginBottom: "32px",
    padding: "20px",
    backgroundColor: "white",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },

  title: {
    fontSize: "28px",
    fontWeight: "600",
    color: "#333",
    margin: "0 0 8px 0",
  },

  subtitle: {
    fontSize: "14px",
    color: "#666",
    margin: 0,
  },

  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "60vh",
  },

  spinner: {
    width: "50px",
    height: "50px",
    border: "4px solid #f3f3f3",
    borderTop: "4px solid #667eea",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },

  loadingText: {
    marginTop: "16px",
    color: "#666",
    fontSize: "16px",
  },

  successAlert: {
    backgroundColor: "#d4edda",
    color: "#155724",
    padding: "12px 20px",
    borderRadius: "8px",
    marginBottom: "20px",
    border: "1px solid #c3e6cb",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  errorAlert: {
    backgroundColor: "#f8d7da",
    color: "#721c24",
    padding: "12px 20px",
    borderRadius: "8px",
    marginBottom: "20px",
    border: "1px solid #f5c6cb",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
  },

  retryButton: {
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    padding: "6px 12px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
  },

  pendingSection: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "32px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    border: "2px solid #ff9800",
  },

  pendingHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "12px",
  },

  pendingBadge: {
    backgroundColor: "#ff9800",
    color: "white",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "14px",
    fontWeight: "600",
  },

  pendingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
    gap: "20px",
  },

  pendingCard: {
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    padding: "16px",
    transition: "transform 0.2s, box-shadow 0.2s",
  },

  pendingCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "16px",
    paddingBottom: "12px",
    borderBottom: "1px solid #e0e0e0",
  },

  pendingIcon: {
    fontSize: "24px",
  },

  pendingTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#ff9800",
  },

  pendingContent: {
    marginBottom: "16px",
  },

  pendingActions: {
    display: "flex",
    gap: "12px",
  },

  filtersSection: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "32px",
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
    alignItems: "flex-end",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  },

  filterGroup: {
    flex: 1,
    minWidth: "150px",
  },

  filterLabel: {
    display: "block",
    marginBottom: "8px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#333",
  },

  filterSelect: {
    width: "100%",
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "14px",
    backgroundColor: "white",
  },

  searchInput: {
    width: "100%",
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "14px",
  },

  dateInput: {
    width: "100%",
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "14px",
  },

  applyButton: {
    padding: "10px 24px",
    backgroundColor: "#667eea",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.3s",
  },

  refreshButton: {
    padding: "8px 16px",
    backgroundColor: "#4caf50",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    cursor: "pointer",
    transition: "background-color 0.3s",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px",
    marginBottom: "32px",
  },

  statCard: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    transition: "transform 0.2s",
  },

  statIcon: {
    fontSize: "40px",
  },

  statContent: {
    flex: 1,
  },

  statValue: {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#333",
    marginBottom: "4px",
  },

  statLabel: {
    fontSize: "14px",
    color: "#666",
    marginBottom: "4px",
  },

  statSub: {
    fontSize: "12px",
    color: "#999",
  },

  tableSection: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "24px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },

  tableHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "16px",
  },

  sectionTitle: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#333",
    margin: 0,
  },

  tableContainer: {
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  tableHeaderRow: {
    backgroundColor: "#f8f9fa",
    borderBottom: "2px solid #e0e0e0",
  },

  th: {
    padding: "12px",
    textAlign: "left",
    fontSize: "14px",
    fontWeight: "600",
    color: "#333",
  },

  tableRow: {
    borderBottom: "1px solid #f0f0f0",
    transition: "background-color 0.2s",
  },

  td: {
    padding: "12px",
    fontSize: "14px",
    color: "#666",
  },

  patientName: {
    fontWeight: "500",
    color: "#333",
  },

  patientEmail: {
    fontSize: "12px",
    color: "#999",
  },

  statusBadge: {
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "500",
    color: "white",
    display: "inline-block",
  },

  actionButtons: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },

  recordButton: {
    padding: "6px 12px",
    backgroundColor: "#2196f3",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "12px",
    cursor: "pointer",
  },

  viewDetailsButton: {
    padding: "6px 12px",
    backgroundColor: "#666",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "12px",
    cursor: "pointer",
  },

  approveButton: {
    flex: 1,
    padding: "8px 16px",
    backgroundColor: "#4caf50",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    cursor: "pointer",
  },

  viewButton: {
    flex: 1,
    padding: "8px 16px",
    backgroundColor: "#666",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    cursor: "pointer",
  },

  emptyState: {
    textAlign: "center",
    padding: "48px",
    color: "#999",
    fontSize: "14px",
  },

  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    animation: "fadeIn 0.3s",
  },

  modal: {
    backgroundColor: "white",
    borderRadius: "12px",
    width: "90%",
    maxWidth: "600px",
    maxHeight: "90vh",
    overflow: "auto",
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
    animation: "slideUp 0.3s",
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid #e0e0e0",
  },

  modalTitle: {
    margin: 0,
    fontSize: "24px",
    fontWeight: "600",
    color: "#333",
  },

  closeButton: {
    backgroundColor: "transparent",
    border: "none",
    fontSize: "24px",
    cursor: "pointer",
    color: "#999",
    padding: "0",
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
  },

  modalContent: {
    padding: "24px",
  },

  modalInfo: {
    backgroundColor: "#f8f9fa",
    padding: "16px",
    borderRadius: "8px",
    marginBottom: "20px",
  },

  formGroup: {
    marginBottom: "20px",
  },

  formLabel: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "600",
    color: "#333",
    fontSize: "14px",
  },

  textarea: {
    width: "100%",
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "14px",
    fontFamily: "inherit",
    resize: "vertical",
  },

  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    padding: "20px 24px",
    borderTop: "1px solid #e0e0e0",
  },

  cancelButton: {
    padding: "10px 20px",
    backgroundColor: "#f8f9fa",
    color: "#666",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },

  approveModalButton: {
    padding: "10px 20px",
    backgroundColor: "#4caf50",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },

  closeModalButton: {
    padding: "10px 20px",
    backgroundColor: "#667eea",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },

  detailsSection: {
    marginBottom: "24px",
  },

  detailsTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#333",
    marginBottom: "16px",
    paddingBottom: "8px",
    borderBottom: "2px solid #667eea",
  },

  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
  },

  detailsItem: {
    label: {
      fontSize: "12px",
      color: "#999",
      display: "block",
      marginBottom: "4px",
    },
    p: {
      fontSize: "14px",
      color: "#333",
      fontWeight: "500",
      margin: 0,
    },
  },

  description: {
    fontSize: "14px",
    color: "#666",
    lineHeight: "1.6",
    margin: 0,
  },
};

// Add keyframe animations
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from {
      transform: translateY(50px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  
  input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
  
  tr:hover {
    background-color: #f8f9fa;
  }
  
  .pending-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  
  .stat-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  }
`;
document.head.appendChild(styleSheet);

export default AdminPayments;