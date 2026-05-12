// src/components/AdminActivityLog.jsx

import React, { useState, useEffect, useCallback } from "react";
import AxiosInstance from "./AxiosInstance";

const AdminActivityLog = () => {
  const [activityLogs, setActivityLogs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("activity");
  const [stats, setStats] = useState({
    total: 0,
    byAction: [],
    bySeverity: [],
    byUser: [],
    errors: 0,
    dailyAverage: 0,
  });
  const [filters, setFilters] = useState({
    action: "",
    severity: "",
    userId: "",
    startDate: "",
    endDate: "",
    search: "",
    entityType: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    totalPages: 1,
    totalItems: 0,
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  // Action types for filter
  const ACTION_TYPES = [
    { value: "", label: "All Actions" },
    { value: "login", label: "Login" },
    { value: "logout", label: "Logout" },
    { value: "login_failed", label: "Login Failed" },
    { value: "password_change", label: "Password Change" },
    { value: "account_created", label: "Account Created" },
    { value: "account_updated", label: "Account Updated" },
    { value: "appointment_created", label: "Appointment Created" },
    { value: "appointment_updated", label: "Appointment Updated" },
    { value: "appointment_cancelled", label: "Appointment Cancelled" },
    { value: "appointment_rescheduled", label: "Appointment Rescheduled" },
    { value: "appointment_confirmed", label: "Appointment Confirmed" },
    { value: "payment_made", label: "Payment Made" },
    { value: "payment_approved", label: "Payment Approved" },
    { value: "invoice_created", label: "Invoice Created" },
    { value: "admin_login", label: "Admin Login" },
    { value: "admin_report_generated", label: "Report Generated" },
    { value: "admin_user_created", label: "Admin Created User" },
    { value: "admin_user_updated", label: "Admin Updated User" },
    { value: "patient_record_created", label: "Patient Record Created" },
    { value: "patient_record_updated", label: "Patient Record Updated" },
    { value: "notification_sent", label: "Notification Sent" },
    { value: "ai_suggestion_generated", label: "AI Suggestion Generated" },
    { value: "system_error", label: "System Error" },
    { value: "permission_denied", label: "Permission Denied" },
  ];

  const SEVERITY_LEVELS = [
    { value: "", label: "All Severities" },
    { value: "info", label: "Info" },
    { value: "warning", label: "Warning" },
    { value: "error", label: "Error" },
    { value: "critical", label: "Critical" },
  ];

  const ENTITY_TYPES = [
    { value: "", label: "All Entities" },
    { value: "user", label: "User" },
    { value: "appointment", label: "Appointment" },
    { value: "billing", label: "Billing" },
    { value: "payment", label: "Payment" },
    { value: "patient_record", label: "Patient Record" },
    { value: "treatment_history", label: "Treatment History" },
    { value: "waitlist", label: "Waitlist" },
    { value: "notification", label: "Notification" },
    { value: "ai_suggestion", label: "AI Suggestion" },
    { value: "system", label: "System" },
    { value: "admin", label: "Admin Action" },
  ];

  useEffect(() => {
    fetchActivityLogs();
    fetchActivityStats();
  }, [pagination.page, filters, dateRange]);

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = `activity-logs/?page=${pagination.page}&page_size=${pagination.pageSize}`;
      
      if (filters.action) url += `&action=${filters.action}`;
      if (filters.severity) url += `&severity=${filters.severity}`;
      if (filters.userId) url += `&user_id=${filters.userId}`;
      if (filters.entityType) url += `&entity_type=${filters.entityType}`;
      if (dateRange.startDate) url += `&start_date=${dateRange.startDate}`;
      if (dateRange.endDate) url += `&end_date=${dateRange.endDate}`;
      if (filters.search) url += `&search=${filters.search}`;

      const response = await AxiosInstance.get(url);
      
      setActivityLogs(response.data.results || response.data);
      setPagination(prev => ({
        ...prev,
        totalItems: response.data.count || response.data.length,
        totalPages: Math.ceil((response.data.count || response.data.length) / prev.pageSize),
      }));
    } catch (err) {
      console.error("Error fetching activity logs:", err);
      setError(err.response?.data?.error || "Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityStats = async () => {
    try {
      const response = await AxiosInstance.get("activity-logs/stats/");
      setStats(response.data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await AxiosInstance.get("audit-logs/");
      setAuditLogs(response.data.results || response.data);
    } catch (err) {
      console.error("Error fetching audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleDateRangeChange = (key, value) => {
    setDateRange(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      action: "",
      severity: "",
      userId: "",
      startDate: "",
      endDate: "",
      search: "",
      entityType: "",
    });
    setDateRange({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const exportLogs = async (format = "csv") => {
    try {
      let url = `activity-logs/export/?format=${format}`;
      if (filters.action) url += `&action=${filters.action}`;
      if (filters.severity) url += `&severity=${filters.severity}`;
      if (dateRange.startDate) url += `&start_date=${dateRange.startDate}`;
      if (dateRange.endDate) url += `&end_date=${dateRange.endDate}`;
      
      const response = await AxiosInstance.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `activity_logs_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Error exporting logs:", err);
      setError("Failed to export logs");
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case "info":
        return "#2196f3";
      case "warning":
        return "#ff9800";
      case "error":
        return "#f44336";
      case "critical":
        return "#9c27b0";
      default:
        return "#757575";
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case "info":
        return "ℹ️";
      case "warning":
        return "⚠️";
      case "error":
        return "❌";
      case "critical":
        return "🔥";
      default:
        return "📄";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return formatDate(dateString);
  };

  const getActionLabel = (action) => {
    const found = ACTION_TYPES.find(a => a.value === action);
    return found ? found.label : action;
  };

  const getEntityTypeLabel = (entityType) => {
    const found = ENTITY_TYPES.find(e => e.value === entityType);
    return found ? found.label : entityType || "N/A";
  };

  if (loading && activityLogs.length === 0) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading activity logs...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Activity & Audit Logs</h1>
        <p style={styles.subtitle}>Monitor system activities, user actions, and security events</p>
      </div>

      {error && (
        <div style={styles.errorAlert}>
          <span>⚠️</span> {error}
          <button onClick={fetchActivityLogs} style={styles.retryButton}>Retry</button>
        </div>
      )}

      {/* Statistics Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📊</div>
          <div style={styles.statContent}>
            <div style={styles.statValue}>{stats.total}</div>
            <div style={styles.statLabel}>Total Activities</div>
            <div style={styles.statSub}>{stats.dailyAverage} avg/day</div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>⚠️</div>
          <div style={styles.statContent}>
            <div style={styles.statValue}>{stats.errors}</div>
            <div style={styles.statLabel}>Errors & Warnings</div>
            <div style={styles.statSub}>
              {stats.total > 0 ? ((stats.errors / stats.total) * 100).toFixed(1) : 0}% of total
            </div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>👥</div>
          <div style={styles.statContent}>
            <div style={styles.statValue}>{stats.byUser?.length || 0}</div>
            <div style={styles.statLabel}>Active Users</div>
            <div style={styles.statSub}>with logged activities</div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>🎯</div>
          <div style={styles.statContent}>
            <div style={styles.statValue}>{stats.byAction?.length || 0}</div>
            <div style={styles.statLabel}>Action Types</div>
            <div style={styles.statSub}>distinct activities</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={styles.tabContainer}>
        <button
          style={{ ...styles.tabButton, ...(activeTab === "activity" ? styles.tabButtonActive : {}) }}
          onClick={() => setActiveTab("activity")}
        >
          <i className="fas fa-activity"></i> Activity Logs
        </button>
        <button
          style={{ ...styles.tabButton, ...(activeTab === "audit" ? styles.tabButtonActive : {}) }}
          onClick={() => {
            setActiveTab("audit");
            fetchAuditLogs();
          }}
        >
          <i className="fas fa-clipboard-list"></i> Audit Logs (Data Changes)
        </button>
        <button
          style={{ ...styles.tabButton, ...(activeTab === "stats" ? styles.tabButtonActive : {}) }}
          onClick={() => setActiveTab("stats")}
        >
          <i className="fas fa-chart-bar"></i> Analytics
        </button>
      </div>

      {activeTab === "activity" && (
        <>
          {/* Filters */}
          <div style={styles.filtersSection}>
            <div style={styles.filterRow}>
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Action Type</label>
                <select
                  value={filters.action}
                  onChange={(e) => handleFilterChange("action", e.target.value)}
                  style={styles.filterSelect}
                >
                  {ACTION_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Severity</label>
                <select
                  value={filters.severity}
                  onChange={(e) => handleFilterChange("severity", e.target.value)}
                  style={styles.filterSelect}
                >
                  {SEVERITY_LEVELS.map(level => (
                    <option key={level.value} value={level.value}>{level.label}</option>
                  ))}
                </select>
              </div>

              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Entity Type</label>
                <select
                  value={filters.entityType}
                  onChange={(e) => handleFilterChange("entityType", e.target.value)}
                  style={styles.filterSelect}
                >
                  {ENTITY_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>User ID</label>
                <input
                  type="text"
                  placeholder="Filter by user ID"
                  value={filters.userId}
                  onChange={(e) => handleFilterChange("userId", e.target.value)}
                  style={styles.filterInput}
                />
              </div>
            </div>

            <div style={styles.filterRow}>
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Start Date</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => handleDateRangeChange("startDate", e.target.value)}
                  style={styles.filterInput}
                />
              </div>

              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>End Date</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => handleDateRangeChange("endDate", e.target.value)}
                  style={styles.filterInput}
                />
              </div>

              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Search</label>
                <input
                  type="text"
                  placeholder="Search in descriptions..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  style={styles.filterInput}
                />
              </div>

              <div style={styles.filterActions}>
                <button onClick={clearFilters} style={styles.clearButton}>
                  Clear Filters
                </button>
                <button onClick={() => exportLogs("csv")} style={styles.exportButton}>
                  📥 Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* Activity Logs Table */}
          <div style={styles.tableSection}>
            <div style={styles.tableHeader}>
              <h2 style={styles.sectionTitle}>Activity Logs</h2>
              <div style={styles.paginationInfo}>
                Showing {activityLogs.length} of {pagination.totalItems} entries
              </div>
            </div>

            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Timestamp</th>
                    <th style={styles.th}>User</th>
                    <th style={styles.th}>Action</th>
                    <th style={styles.th}>Severity</th>
                    <th style={styles.th}>Entity</th>
                    <th style={styles.th}>Description</th>
                    <th style={styles.th}>IP Address</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLogs.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={styles.emptyState}>
                        No activity logs found
                      </td>
                    </tr>
                  ) : (
                    activityLogs.map((log) => (
                      <tr key={log.id} style={styles.tableRow}>
                        <td style={styles.td}>
                          <div>{formatDate(log.created_at)}</div>
                          <small style={styles.relativeTime}>{formatRelativeTime(log.created_at)}</small>
                        </td>
                        <td style={styles.td}>
                          <strong>{log.user?.username || "System"}</strong>
                          <div style={styles.userEmail}>{log.user?.email || "System Event"}</div>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.actionBadge}>
                            {getActionLabel(log.action)}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.severityBadge,
                            backgroundColor: getSeverityColor(log.severity)
                          }}>
                            {getSeverityIcon(log.severity)} {log.severity?.toUpperCase()}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <div>{getEntityTypeLabel(log.entity_type)}</div>
                          <small style={styles.entityId}>ID: {log.entity_id || "N/A"}</small>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.description}>{log.description}</div>
                          {log.details && Object.keys(log.details).length > 0 && (
                            <small style={styles.detailsLink}>Has additional details</small>
                          )}
                        </td>
                        <td style={styles.td}>
                          <code style={styles.ipAddress}>{log.ip_address || "N/A"}</code>
                        </td>
                        <td style={styles.td}>
                          <button
                            style={styles.viewButton}
                            onClick={() => {
                              setSelectedLog(log);
                              setShowDetailsModal(true);
                            }}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div style={styles.pagination}>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  style={styles.paginationButton}
                >
                  Previous
                </button>
                <span style={styles.paginationInfo}>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                  style={styles.paginationButton}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "audit" && (
        <div style={styles.tableSection}>
          <div style={styles.tableHeader}>
            <h2 style={styles.sectionTitle}>Audit Logs - Data Changes</h2>
          </div>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.th}>Timestamp</th>
                  <th style={styles.th}>User</th>
                  <th style={styles.th}>Operation</th>
                  <th style={styles.th}>Model</th>
                  <th style={styles.th}>Object ID</th>
                  <th style={styles.th}>Changes</th>
                  <th style={styles.th}>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={styles.emptyState}>
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} style={styles.tableRow}>
                      <td style={styles.td}>{formatDate(log.created_at)}</td>
                      <td style={styles.td}>{log.user?.username || "System"}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.operationBadge,
                          backgroundColor: log.operation === "CREATE" ? "#4caf50" : 
                                         log.operation === "UPDATE" ? "#2196f3" : "#f44336"
                        }}>
                          {log.operation}
                        </span>
                      </td>
                      <td style={styles.td}>{log.model_name}</td>
                      <td style={styles.td}>{log.object_id}</td>
                      <td style={styles.td}>
                        <details>
                          <summary style={styles.summary}>View changes ({Object.keys(log.changes || {}).length} fields)</summary>
                          <pre style={styles.changesPre}>{JSON.stringify(log.changes, null, 2)}</pre>
                        </details>
                      </td>
                      <td style={styles.td}>{log.ip_address || "N/A"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "stats" && (
        <div style={styles.statsSection}>
          <div style={styles.statsGrid2}>
            {/* Top Actions */}
            <div style={styles.statsCard}>
              <h3 style={styles.statsCardTitle}>Top Actions</h3>
              <div style={styles.statsList}>
                {stats.byAction?.slice(0, 10).map((item, idx) => (
                  <div key={idx} style={styles.statsListItem}>
                    <span style={styles.statsListLabel}>{getActionLabel(item.action)}</span>
                    <span style={styles.statsListValue}>{item.count}</span>
                    <div style={{
                      ...styles.statsListBar,
                      width: `${(item.count / (stats.byAction?.[0]?.count || 1)) * 100}%`
                    }}></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Users */}
            <div style={styles.statsCard}>
              <h3 style={styles.statsCardTitle}>Most Active Users</h3>
              <div style={styles.statsList}>
                {stats.byUser?.slice(0, 10).map((item, idx) => (
                  <div key={idx} style={styles.statsListItem}>
                    <span style={styles.statsListLabel}>{item.user__username || "System"}</span>
                    <span style={styles.statsListValue}>{item.count}</span>
                    <div style={{
                      ...styles.statsListBar,
                      width: `${(item.count / (stats.byUser?.[0]?.count || 1)) * 100}%`
                    }}></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Severity Distribution */}
            <div style={styles.statsCard}>
              <h3 style={styles.statsCardTitle}>Severity Distribution</h3>
              <div style={styles.statsList}>
                {stats.bySeverity?.map((item, idx) => (
                  <div key={idx} style={styles.statsListItem}>
                    <span style={styles.statsListLabel}>
                      {getSeverityIcon(item.severity)} {item.severity?.toUpperCase()}
                    </span>
                    <span style={styles.statsListValue}>{item.count}</span>
                    <div style={{
                      ...styles.statsListBar,
                      backgroundColor: getSeverityColor(item.severity),
                      width: `${(item.count / stats.total) * 100}%`
                    }}></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedLog && (
        <div style={styles.modalOverlay} onClick={() => setShowDetailsModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Activity Details</h2>
              <button style={styles.closeButton} onClick={() => setShowDetailsModal(false)}>✕</button>
            </div>
            <div style={styles.modalContent}>
              <div style={styles.detailsGrid}>
                <div style={styles.detailsItem}>
                  <label>Action:</label>
                  <p>{getActionLabel(selectedLog.action)}</p>
                </div>
                <div style={styles.detailsItem}>
                  <label>Severity:</label>
                  <p>
                    <span style={{
                      ...styles.severityBadge,
                      backgroundColor: getSeverityColor(selectedLog.severity)
                    }}>
                      {getSeverityIcon(selectedLog.severity)} {selectedLog.severity?.toUpperCase()}
                    </span>
                  </p>
                </div>
                <div style={styles.detailsItem}>
                  <label>User:</label>
                  <p>{selectedLog.user?.username || "System"} ({selectedLog.user?.email || "System Event"})</p>
                </div>
                <div style={styles.detailsItem}>
                  <label>Timestamp:</label>
                  <p>{formatDate(selectedLog.created_at)}</p>
                </div>
                <div style={styles.detailsItem}>
                  <label>Entity:</label>
                  <p>{getEntityTypeLabel(selectedLog.entity_type)} (ID: {selectedLog.entity_id || "N/A"})</p>
                </div>
                <div style={styles.detailsItem}>
                  <label>IP Address:</label>
                  <p><code>{selectedLog.ip_address || "N/A"}</code></p>
                </div>
                <div style={styles.detailsItem}>
                  <label>User Agent:</label>
                  <p style={styles.userAgent}>{selectedLog.user_agent || "N/A"}</p>
                </div>
                <div style={styles.detailsItem}>
                  <label>Request Path:</label>
                  <p>{selectedLog.request_path || "N/A"}</p>
                </div>
                <div style={styles.detailsItem}>
                  <label>Session ID:</label>
                  <p>{selectedLog.session_id || "N/A"}</p>
                </div>
                <div style={styles.detailsItem}>
                  <label>Success:</label>
                  <p>{selectedLog.is_success ? "✅ Yes" : "❌ No"}</p>
                </div>
                {selectedLog.error_message && (
                  <div style={styles.detailsItemFull}>
                    <label>Error Message:</label>
                    <p style={styles.errorMessage}>{selectedLog.error_message}</p>
                  </div>
                )}
                <div style={styles.detailsItemFull}>
                  <label>Description:</label>
                  <p>{selectedLog.description}</p>
                </div>
                {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                  <div style={styles.detailsItemFull}>
                    <label>Additional Details:</label>
                    <pre style={styles.detailsPre}>{JSON.stringify(selectedLog.details, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.closeModalButton} onClick={() => setShowDetailsModal(false)}>
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

  filtersSection: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "24px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  },

  filterRow: {
    display: "flex",
    gap: "16px",
    marginBottom: "16px",
    flexWrap: "wrap",
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

  filterInput: {
    width: "100%",
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "14px",
  },

  filterActions: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-end",
  },

  clearButton: {
    padding: "10px 20px",
    backgroundColor: "#f8f9fa",
    color: "#666",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "14px",
    cursor: "pointer",
  },

  exportButton: {
    padding: "10px 20px",
    backgroundColor: "#4caf50",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    cursor: "pointer",
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

  relativeTime: {
    fontSize: "11px",
    color: "#999",
  },

  userEmail: {
    fontSize: "12px",
    color: "#999",
  },

  actionBadge: {
    backgroundColor: "#e3f2fd",
    color: "#1976d2",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "500",
  },

  severityBadge: {
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "500",
    color: "white",
    display: "inline-block",
  },

  entityId: {
    fontSize: "11px",
    color: "#999",
  },

  description: {
    maxWidth: "300px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  detailsLink: {
    fontSize: "11px",
    color: "#667eea",
    cursor: "pointer",
  },

  ipAddress: {
    fontSize: "12px",
    fontFamily: "monospace",
    backgroundColor: "#f5f5f5",
    padding: "2px 4px",
    borderRadius: "4px",
  },

  viewButton: {
    padding: "6px 12px",
    backgroundColor: "#667eea",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "12px",
    cursor: "pointer",
  },

  pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "16px",
    marginTop: "24px",
    paddingTop: "16px",
    borderTop: "1px solid #e0e0e0",
  },

  paginationButton: {
    padding: "8px 16px",
    backgroundColor: "#f8f9fa",
    color: "#666",
    border: "1px solid #ddd",
    borderRadius: "6px",
    cursor: "pointer",
  },

  paginationInfo: {
    fontSize: "14px",
    color: "#666",
  },

  emptyState: {
    textAlign: "center",
    padding: "48px",
    color: "#999",
    fontSize: "14px",
  },

  operationBadge: {
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "500",
    color: "white",
    display: "inline-block",
  },

  summary: {
    cursor: "pointer",
    color: "#667eea",
  },

  changesPre: {
    backgroundColor: "#f5f5f5",
    padding: "8px",
    borderRadius: "4px",
    fontSize: "12px",
    overflow: "auto",
    maxHeight: "200px",
  },

  statsSection: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "24px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },

  statsGrid2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
    gap: "24px",
  },

  statsCard: {
    padding: "20px",
    backgroundColor: "#f8f9fa",
    borderRadius: "12px",
  },

  statsCardTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#333",
    marginBottom: "16px",
    paddingBottom: "8px",
    borderBottom: "2px solid #667eea",
  },

  statsList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  statsListItem: {
    position: "relative",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px",
    backgroundColor: "white",
    borderRadius: "6px",
    overflow: "hidden",
  },

  statsListLabel: {
    fontSize: "14px",
    color: "#333",
    zIndex: 1,
  },

  statsListValue: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#667eea",
    zIndex: 1,
  },

  statsListBar: {
    position: "absolute",
    left: 0,
    top: 0,
    height: "100%",
    backgroundColor: "rgba(102, 126, 234, 0.1)",
    zIndex: 0,
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
    maxWidth: "800px",
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

  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    padding: "20px 24px",
    borderTop: "1px solid #e0e0e0",
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

  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
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
      margin: 0,
      wordBreak: "break-word",
    },
  },

  detailsItemFull: {
    gridColumn: "1 / -1",
    label: {
      fontSize: "12px",
      color: "#999",
      display: "block",
      marginBottom: "4px",
    },
    p: {
      fontSize: "14px",
      color: "#333",
      margin: 0,
    },
  },

  userAgent: {
    fontSize: "12px",
    color: "#666",
    wordBreak: "break-all",
  },

  errorMessage: {
    backgroundColor: "#f8d7da",
    color: "#721c24",
    padding: "8px",
    borderRadius: "4px",
    fontSize: "13px",
  },

  detailsPre: {
    backgroundColor: "#f5f5f5",
    padding: "12px",
    borderRadius: "6px",
    fontSize: "12px",
    overflow: "auto",
    maxHeight: "300px",
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
  
  tr:hover {
    background-color: #f8f9fa;
  }
  
  .stat-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  }
`;
document.head.appendChild(styleSheet);

export default AdminActivityLog;