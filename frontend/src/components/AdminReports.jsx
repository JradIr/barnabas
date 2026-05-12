// src/components/AdminReports.jsx

import React, { useState, useEffect } from "react";
import AxiosInstance from "./AxiosInstance";

const AdminReports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("daily");
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [reports, setReports] = useState({
    appointments: [],
    stats: {},
    financials: {},
    users: [],
    waitlist: [],
  });
  const [summary, setSummary] = useState({
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    pendingAppointments: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    completedPayments: 0,
    averageDailyAppointments: 0,
    patientCount: 0,
  });

  useEffect(() => {
    fetchReports();
  }, [activeTab, dateRange]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch appointments based on date range
      let appointmentsUrl = `appointments/?`;
      
      if (activeTab === "daily") {
        appointmentsUrl += `start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`;
      } else if (activeTab === "weekly") {
        appointmentsUrl += `start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`;
      } else if (activeTab === "monthly") {
        appointmentsUrl += `start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`;
      } else if (activeTab === "quarterly") {
        appointmentsUrl += `start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`;
      }

      // Fetch admin stats
      const [appointmentsRes, statsRes, billsRes, usersRes, waitlistRes] = await Promise.all([
        AxiosInstance.get(appointmentsUrl),
        AxiosInstance.get("appointments/admin_stats/"),
        AxiosInstance.get("billing/"),
        AxiosInstance.get("users/"),
        AxiosInstance.get("appointments/waitlist_status/"),
      ]);

      // Process appointments data
      const appointments = appointmentsRes.data.results || appointmentsRes.data;
      const appointmentsList = Array.isArray(appointments) ? appointments : [];

      // Calculate summary statistics
      const completed = appointmentsList.filter(apt => apt.status === "completed");
      const cancelled = appointmentsList.filter(apt => apt.status === "cancelled");
      const pending = appointmentsList.filter(apt => apt.status === "pending");
      const confirmed = appointmentsList.filter(apt => apt.status === "confirmed");

      // Process financial data
      const bills = billsRes.data;
      const totalRevenue = bills
        .filter(bill => bill.status === "paid")
        .reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0);
      
      const pendingPayments = bills
        .filter(bill => bill.status === "pending" || bill.status === "partial")
        .reduce((sum, bill) => sum + parseFloat(bill.balance || bill.amount || 0), 0);

      // Process user data
      const users = usersRes.data;

      setReports({
        appointments: appointmentsList,
        stats: statsRes.data,
        financials: {
          totalRevenue,
          pendingPayments,
          bills: bills,
        },
        users: users,
        waitlist: waitlistRes.data.waitlist_entries || [],
      });

      setSummary({
        totalAppointments: appointmentsList.length,
        completedAppointments: completed.length,
        cancelledAppointments: cancelled.length,
        pendingAppointments: pending.length,
        confirmedAppointments: confirmed.length,
        totalRevenue: totalRevenue,
        pendingPayments: pendingPayments,
        completedPayments: totalRevenue,
        averageDailyAppointments: calculateAverageDaily(appointmentsList),
        patientCount: users.length,
      });

    } catch (err) {
      console.error("Error fetching reports:", err);
      setError(err.response?.data?.error || "Failed to load reports. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const calculateAverageDaily = (appointments) => {
    if (!appointments.length) return 0;
    const daysDiff = Math.ceil(
      (new Date(dateRange.endDate) - new Date(dateRange.startDate)) / (1000 * 60 * 60 * 24)
    ) + 1;
    return (appointments.length / daysDiff).toFixed(1);
  };

  const handleDateRangeChange = (type, value) => {
    const newRange = { ...dateRange };
    
    if (type === "start") {
      newRange.startDate = value;
    } else if (type === "end") {
      newRange.endDate = value;
    }
    
    setDateRange(newRange);
  };

  const setQuickRange = (range) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (range) {
      case "today":
        start = today;
        end = today;
        break;
      case "yesterday":
        start = new Date(today.setDate(today.getDate() - 1));
        end = new Date(today);
        break;
      case "thisWeek":
        const day = today.getDay();
        start = new Date(today.setDate(today.getDate() - day + (day === 0 ? -6 : 1)));
        end = new Date();
        break;
      case "lastWeek":
        start = new Date(today.setDate(today.getDate() - 7));
        end = new Date(today.setDate(today.getDate() + 6));
        break;
      case "thisMonth":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case "lastMonth":
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      default:
        return;
    }

    setDateRange({
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return "#4caf50";
      case "completed":
        return "#2196f3";
      case "pending":
        return "#ff9800";
      case "cancelled":
        return "#f44336";
      case "pencil":
        return "#9c27b0";
      default:
        return "#9e9e9e";
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
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const downloadReport = (format = "csv") => {
    const data = reports.appointments.map(apt => ({
      "Date": apt.date,
      "Time": apt.time,
      "Status": apt.status,
      "Service": apt.service || "N/A",
      "Patient": apt.user_username || apt.user?.username || "N/A",
      "Email": apt.user_email || apt.user?.email || "N/A",
    }));

    const headers = Object.keys(data[0] || {});
    const csvRows = [
      headers.join(","),
      ...data.map(row => headers.map(header => JSON.stringify(row[header] || "")).join(","))
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeTab}_report_${dateRange.startDate}_to_${dateRange.endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading reports...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Admin Reports Dashboard</h1>
        <p style={styles.subtitle}>Comprehensive analytics and insights</p>
      </div>

      {error && (
        <div style={styles.errorAlert}>
          <span>⚠️</span> {error}
          <button onClick={fetchReports} style={styles.retryButton}>Retry</button>
        </div>
      )}

      {/* Tab Navigation */}
      <div style={styles.tabContainer}>
        {["daily", "weekly", "monthly", "quarterly"].map((tab) => (
          <button
            key={tab}
            style={{
              ...styles.tabButton,
              ...(activeTab === tab ? styles.tabButtonActive : {}),
            }}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Date Range Selector */}
      <div style={styles.dateRangeContainer}>
        <div style={styles.dateInputGroup}>
          <label style={styles.label}>Start Date</label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => handleDateRangeChange("start", e.target.value)}
            style={styles.dateInput}
          />
        </div>
        <div style={styles.dateInputGroup}>
          <label style={styles.label}>End Date</label>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => handleDateRangeChange("end", e.target.value)}
            style={styles.dateInput}
          />
        </div>
        <button onClick={fetchReports} style={styles.applyButton}>
          Apply Range
        </button>
      </div>

      {/* Quick Range Buttons */}
      <div style={styles.quickRangeContainer}>
        <button onClick={() => setQuickRange("today")} style={styles.quickButton}>Today</button>
        <button onClick={() => setQuickRange("yesterday")} style={styles.quickButton}>Yesterday</button>
        <button onClick={() => setQuickRange("thisWeek")} style={styles.quickButton}>This Week</button>
        <button onClick={() => setQuickRange("lastWeek")} style={styles.quickButton}>Last Week</button>
        <button onClick={() => setQuickRange("thisMonth")} style={styles.quickButton}>This Month</button>
        <button onClick={() => setQuickRange("lastMonth")} style={styles.quickButton}>Last Month</button>
      </div>

      {/* Summary Cards */}
      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryIcon}>📊</div>
          <div style={styles.summaryContent}>
            <div style={styles.summaryValue}>{summary.totalAppointments}</div>
            <div style={styles.summaryLabel}>Total Appointments</div>
            <div style={styles.summaryTrend}>
              {summary.completedAppointments} completed
            </div>
          </div>
        </div>

        <div style={styles.summaryCard}>
          <div style={styles.summaryIcon}>💰</div>
          <div style={styles.summaryContent}>
            <div style={styles.summaryValue}>{formatCurrency(summary.totalRevenue)}</div>
            <div style={styles.summaryLabel}>Total Revenue</div>
            <div style={styles.summaryTrend}>
              {formatCurrency(summary.pendingPayments)} pending
            </div>
          </div>
        </div>

        <div style={styles.summaryCard}>
          <div style={styles.summaryIcon}>👥</div>
          <div style={styles.summaryContent}>
            <div style={styles.summaryValue}>{summary.patientCount}</div>
            <div style={styles.summaryLabel}>Total Patients</div>
            <div style={styles.summaryTrend}>
              {summary.averageDailyAppointments} avg daily
            </div>
          </div>
        </div>

        <div style={styles.summaryCard}>
          <div style={styles.summaryIcon}>✅</div>
          <div style={styles.summaryContent}>
            <div style={styles.summaryValue}>
              {((summary.completedAppointments / summary.totalAppointments) * 100 || 0).toFixed(1)}%
            </div>
            <div style={styles.summaryLabel}>Completion Rate</div>
            <div style={styles.summaryTrend}>
              {summary.cancelledAppointments} cancelled
            </div>
          </div>
        </div>
      </div>

      {/* Status Distribution */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Appointment Status Distribution</h2>
        </div>
        <div style={styles.statusGrid}>
          <div style={styles.statusItem}>
            <div style={{...styles.statusBar, width: `${(summary.confirmedAppointments / summary.totalAppointments) * 100 || 0}%`, backgroundColor: "#4caf50"}}></div>
            <div style={styles.statusLabel}>Confirmed: {summary.confirmedAppointments}</div>
          </div>
          <div style={styles.statusItem}>
            <div style={{...styles.statusBar, width: `${(summary.pendingAppointments / summary.totalAppointments) * 100 || 0}%`, backgroundColor: "#ff9800"}}></div>
            <div style={styles.statusLabel}>Pending: {summary.pendingAppointments}</div>
          </div>
          <div style={styles.statusItem}>
            <div style={{...styles.statusBar, width: `${(summary.completedAppointments / summary.totalAppointments) * 100 || 0}%`, backgroundColor: "#2196f3"}}></div>
            <div style={styles.statusLabel}>Completed: {summary.completedAppointments}</div>
          </div>
          <div style={styles.statusItem}>
            <div style={{...styles.statusBar, width: `${(summary.cancelledAppointments / summary.totalAppointments) * 100 || 0}%`, backgroundColor: "#f44336"}}></div>
            <div style={styles.statusLabel}>Cancelled: {summary.cancelledAppointments}</div>
          </div>
        </div>
      </div>

      {/* Appointments Table */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Appointments Details</h2>
          <button onClick={downloadReport} style={styles.downloadButton}>
            📥 Download CSV
          </button>
        </div>
        
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Time</th>
                <th style={styles.th}>Patient</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Service</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {reports.appointments.length === 0 ? (
                <tr>
                  <td colSpan="6" style={styles.emptyState}>
                    No appointments found for this period
                  </td>
                </tr>
              ) : (
                reports.appointments.map((apt) => (
                  <tr key={apt.id} style={styles.tableRow}>
                    <td style={styles.td}>{formatDate(apt.date)}</td>
                    <td style={styles.td}>{apt.time}</td>
                    <td style={styles.td}>{apt.user_username || apt.user?.username || "N/A"}</td>
                    <td style={styles.td}>{apt.user_email || apt.user?.email || "N/A"}</td>
                    <td style={styles.td}>{apt.service || "General"}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: getStatusColor(apt.status)
                      }}>
                        {apt.status || "Scheduled"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Summary */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Financial Summary</h2>
        <div style={styles.financialGrid}>
          <div style={styles.financialCard}>
            <div style={styles.financialLabel}>Total Revenue</div>
            <div style={styles.financialAmount}>{formatCurrency(summary.totalRevenue)}</div>
          </div>
          <div style={styles.financialCard}>
            <div style={styles.financialLabel}>Pending Payments</div>
            <div style={styles.financialAmount}>{formatCurrency(summary.pendingPayments)}</div>
          </div>
          <div style={styles.financialCard}>
            <div style={styles.financialLabel}>Collection Rate</div>
            <div style={styles.financialAmount}>
              {summary.totalRevenue + summary.pendingPayments > 0
                ? ((summary.totalRevenue / (summary.totalRevenue + summary.pendingPayments)) * 100).toFixed(1)
                : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Recent Transactions</h2>
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.th}>Invoice #</th>
                <th style={styles.th}>Patient</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {reports.financials.bills?.slice(0, 10).map((bill) => (
                <tr key={bill.id} style={styles.tableRow}>
                  <td style={styles.td}>{bill.invoice_number || `INV-${bill.id}`}</td>
                  <td style={styles.td}>{bill.patient_name || bill.user_username || "N/A"}</td>
                  <td style={styles.td}>{formatCurrency(bill.amount)}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: bill.status === "paid" ? "#4caf50" : bill.status === "partial" ? "#ff9800" : "#f44336"
                    }}>
                      {bill.status || "Pending"}
                    </span>
                  </td>
                  <td style={styles.td}>{bill.due_date ? formatDate(bill.due_date) : "N/A"}</td>
                </tr>
              ))}
              {(!reports.financials.bills || reports.financials.bills.length === 0) && (
                <tr>
                  <td colSpan="5" style={styles.emptyState}>
                    No transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
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
  
  tabContainer: {
    display: "flex",
    gap: "8px",
    marginBottom: "24px",
    backgroundColor: "white",
    padding: "8px",
    borderRadius: "12px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  },
  
  tabButton: {
    flex: 1,
    padding: "12px 24px",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.3s",
    color: "#666",
  },
  
  tabButtonActive: {
    backgroundColor: "#667eea",
    color: "white",
    boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
  },
  
  dateRangeContainer: {
    display: "flex",
    gap: "16px",
    alignItems: "flex-end",
    marginBottom: "16px",
    padding: "20px",
    backgroundColor: "white",
    borderRadius: "12px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  },
  
  dateInputGroup: {
    flex: 1,
  },
  
  label: {
    display: "block",
    marginBottom: "8px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#333",
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
  
  quickRangeContainer: {
    display: "flex",
    gap: "8px",
    marginBottom: "32px",
    flexWrap: "wrap",
  },
  
  quickButton: {
    padding: "8px 16px",
    backgroundColor: "#f0f0f0",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.3s",
  },
  
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px",
    marginBottom: "32px",
  },
  
  summaryCard: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    transition: "transform 0.2s",
  },
  
  summaryIcon: {
    fontSize: "40px",
  },
  
  summaryContent: {
    flex: 1,
  },
  
  summaryValue: {
    fontSize: "32px",
    fontWeight: "bold",
    color: "#333",
    marginBottom: "4px",
  },
  
  summaryLabel: {
    fontSize: "14px",
    color: "#666",
    marginBottom: "4px",
  },
  
  summaryTrend: {
    fontSize: "12px",
    color: "#999",
  },
  
  section: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "32px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  
  sectionHeader: {
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
  
  downloadButton: {
    padding: "8px 16px",
    backgroundColor: "#4caf50",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    cursor: "pointer",
    transition: "background-color 0.3s",
  },
  
  statusGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  
  statusItem: {
    position: "relative",
    padding: "8px",
    backgroundColor: "#f5f5f5",
    borderRadius: "6px",
    overflow: "hidden",
  },
  
  statusBar: {
    position: "absolute",
    left: 0,
    top: 0,
    height: "100%",
    opacity: 0.2,
    transition: "width 0.5s",
  },
  
  statusLabel: {
    position: "relative",
    zIndex: 1,
    fontSize: "14px",
    fontWeight: "500",
  },
  
  tableContainer: {
    overflowX: "auto",
  },
  
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  
  tableHeader: {
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
  
  statusBadge: {
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "500",
    color: "white",
    display: "inline-block",
  },
  
  emptyState: {
    textAlign: "center",
    padding: "48px",
    color: "#999",
    fontSize: "14px",
  },
  
  financialGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "20px",
  },
  
  financialCard: {
    padding: "16px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    textAlign: "center",
  },
  
  financialLabel: {
    fontSize: "14px",
    color: "#666",
    marginBottom: "8px",
  },
  
  financialAmount: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#333",
  },
};

// Add keyframe animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  
  input:focus, select:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
  
  tr:hover {
    background-color: #f8f9fa;
  }
`;
document.head.appendChild(styleSheet);

export default AdminReports;