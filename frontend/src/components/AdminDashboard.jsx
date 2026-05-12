import React, { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Chip,
} from "@mui/material";
import {
  TrendingUp,
  AttachMoney,
  People,
  Warning,
  CalendarToday,
  Receipt,
  Payment,
  MedicalServices,
  ArrowUpward,
  ArrowDownward,
  Schedule,
  Check,
  Close,
  EventAvailable,
  MonetizationOn,
  HealthAndSafety,
  History,
  AccessTime,
} from "@mui/icons-material";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import AxiosInstance from "./AxiosInstance";
import "./style/AdminDashboard.css";

const localizer = momentLocalizer(moment);

const AdminDashboard = () => {
  const [billing, setBilling] = useState([]);
  const [payments, setPayments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    dailyAppointments: 0,
    weeklyAppointments: 0,
    monthlyAppointments: 0,
    revenueGrowth: 12.5,
    totalRevenue: 0,
    collectionRate: 0,
  });

  const fetchData = async () => {
    try {
      // Fetch all data in parallel
      const [billingRes, paymentsRes, patientsRes, appointmentsRes, auditRes] = await Promise.all([
        AxiosInstance.get("billing/"),
        AxiosInstance.get("payments/"),
        AxiosInstance.get("patient-records/"),
        AxiosInstance.get("appointments/"),
        AxiosInstance.get("activity-logs/").catch(() => ({ data: [] })),
      ]);
      
      setBilling(Array.isArray(billingRes.data) ? billingRes.data : []);
      setPayments(Array.isArray(paymentsRes.data) ? paymentsRes.data : []);
      setPatients(Array.isArray(patientsRes.data) ? patientsRes.data : []);
      setAppointments(Array.isArray(appointmentsRes.data) ? appointmentsRes.data : []);
      setAuditLogs(Array.isArray(auditRes.data) ? auditRes.data.slice(0, 10) : []);
      
      // Calculate statistics
      const today = new Date().toDateString();
      const thisMonth = new Date().getMonth();
      const thisWeekStart = new Date();
      thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
      const thisWeekEnd = new Date();
      thisWeekEnd.setDate(thisWeekEnd.getDate() + (6 - thisWeekEnd.getDay()));
      
      const dailyCount = appointmentsRes.data.filter(apt => 
        new Date(apt.date).toDateString() === today
      ).length;
      
      const weeklyCount = appointmentsRes.data.filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate >= thisWeekStart && aptDate <= thisWeekEnd;
      }).length;
      
      const monthlyCount = appointmentsRes.data.filter(apt => 
        new Date(apt.date).getMonth() === thisMonth
      ).length;
      
      // Calculate total revenue from billing
      const totalRevenue = billingRes.data.reduce((sum, b) => {
        const amount = parseFloat(b.total_amount || b.amount || 0);
        return sum + amount;
      }, 0);
      
      // Calculate collection rate
      const paidInvoices = billingRes.data.filter(b => 
        b.status === 'paid' || b.status === 'Paid' || b.paid_amount >= b.total_amount
      ).length;
      const collectionRate = billingRes.data.length > 0 
        ? (paidInvoices / billingRes.data.length) * 100 
        : 0;
      
      setStats({
        dailyAppointments: dailyCount,
        weeklyAppointments: weeklyCount,
        monthlyAppointments: monthlyCount,
        revenueGrowth: 12.5,
        totalRevenue: totalRevenue,
        collectionRate: collectionRate,
      });
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper functions for data formatting
  const getPatientFullName = (record) => {
    return record.user_fullname || record.user_username || record.patient || 'Unknown';
  };

  const getPatientContact = (record) => {
    return record.emergency_contact_phone || record.contact || 'N/A';
  };

  const getMedicalHistory = (record) => {
    return record.medical_conditions || record.allergies || record.medical_history || '';
  };

  const getLastVisit = (record) => {
    if (record.last_visit) return record.last_visit;
    const patientAppointments = appointments.filter(apt => 
      apt.user === record.user || apt.user_username === record.user_username
    );
    const completedAppointments = patientAppointments.filter(apt => apt.status === 'completed');
    if (completedAppointments.length > 0) {
      const lastVisit = new Date(Math.max(...completedAppointments.map(apt => new Date(apt.date))));
      return lastVisit.toLocaleDateString();
    }
    return 'N/A';
  };

  const getInvoiceNumber = (bill) => {
    return bill.invoice_number || `INV-${bill.id}`;
  };

  const getBillAmount = (bill) => {
    return parseFloat(bill.total_amount || bill.amount || 0);
  };

  const getBillStatus = (bill) => {
    if (bill.status === 'paid' || bill.status === 'Paid' || bill.paid_amount >= bill.total_amount) {
      return 'paid';
    }
    if (bill.status === 'partial' || (bill.paid_amount > 0 && bill.paid_amount < bill.total_amount)) {
      return 'partial';
    }
    if (bill.status === 'overdue') return 'overdue';
    return 'unpaid';
  };

  const getPaymentAmount = (payment) => {
    return parseFloat(payment.amount || 0);
  };

  const getPaymentMethod = (payment) => {
    return payment.payment_method || payment.method || 'Cash';
  };

  const getPaymentTransactionId = (payment) => {
    return payment.reference_number || payment.transaction_id || 'N/A';
  };

  const getPaymentDate = (payment) => {
    return payment.payment_date || payment.created_at;
  };

  const getPaymentStatus = (payment) => {
    return payment.status || 'completed';
  };

  // Transform appointments for calendar
  const calendarEvents = appointments.map(apt => ({
    title: `${apt.user_username || 'Patient'} - ${apt.service || 'Consultation'}`,
    start: new Date(apt.date),
    end: new Date(new Date(apt.date).setHours(new Date(apt.date).getHours() + 1)),
    status: apt.status,
  }));

  // Format audit log time
  const formatAuditTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <Box className="admin-dashboard-wrapper">
      {/* Animated Background Elements */}
      <div className="dashboard-bg-animation">
        <div className="dashboard-bg-circle dashboard-bg-circle-1"></div>
        <div className="dashboard-bg-circle dashboard-bg-circle-2"></div>
        <div className="dashboard-bg-circle dashboard-bg-circle-3"></div>
        <div className="dashboard-bg-circle dashboard-bg-circle-4"></div>
        <div className="dashboard-bg-circle dashboard-bg-circle-5"></div>
        <div className="dashboard-bg-circle dashboard-bg-circle-6"></div>
      </div>

      {/* Floating particles */}
      <div className="dashboard-particles">
        {[...Array(30)].map((_, i) => (
          <div key={i} className="dashboard-particle" style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 15}s`,
            animationDuration: `${8 + Math.random() * 15}s`
          }}></div>
        ))}
      </div>

      <Box className="admin-dashboard-content">
        {/* Header Section */}
        <Box className="dashboard-header-glass fade-down">
          <Box className="dashboard-header-left">
            <div className="dashboard-welcome-badge">
              <MedicalServices sx={{ fontSize: 18 }} />
              <Typography variant="caption">Admin Portal</Typography>
            </div>
            <Typography variant="h4" className="dashboard-title">
              Welcome back, Administrator
            </Typography>
            <Typography variant="body2" className="dashboard-subtitle">
              Here's your clinic performance overview and management hub.
            </Typography>
          </Box>
          <Box className="dashboard-header-right">
            <div className="dashboard-date-card">
              <CalendarToday sx={{ fontSize: 20, color: '#2ca6a4' }} />
              <Typography variant="body2">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </Typography>
            </div>
          </Box>
        </Box>

        {loading ? (
          <Box className="loading-container">
            <LinearProgress sx={{ width: '300px', borderRadius: '10px', bgcolor: '#e0e0e0', '& .MuiLinearProgress-bar': { bgcolor: '#2ca6a4' } }} />
            <Typography variant="body2" sx={{ mt: 2, textAlign: 'center', color: '#6c757d' }}>
              Loading dashboard data...
            </Typography>
          </Box>
        ) : (
          <>
            {/* Stats Section - Flex Row */}
            <div className="stats-section fade-up">
              <div className="stat-item">
                <div className="stat-icon revenue-icon">
                  <AttachMoney sx={{ fontSize: 32 }} />
                </div>
                <div className="stat-info">
                  <Typography variant="body2" className="stat-label">Total Revenue</Typography>
                  <Typography variant="h3" className="stat-value">₱{stats.totalRevenue.toFixed(2)}</Typography>
                  <div className="stat-trend up">
                    <ArrowUpward sx={{ fontSize: 12 }} />
                    <Typography variant="caption">{stats.revenueGrowth}% from last month</Typography>
                  </div>
                </div>
              </div>
              
              <div className="stat-item">
                <div className="stat-icon collection-icon">
                  <TrendingUp sx={{ fontSize: 32 }} />
                </div>
                <div className="stat-info">
                  <Typography variant="body2" className="stat-label">Collection Rate</Typography>
                  <Typography variant="h3" className="stat-value">{stats.collectionRate.toFixed(1)}%</Typography>
                </div>
              </div>
              
              <div className="stat-item">
                <div className="stat-icon patients-icon">
                  <People sx={{ fontSize: 32 }} />
                </div>
                <div className="stat-info">
                  <Typography variant="body2" className="stat-label">Active Patients</Typography>
                  <Typography variant="h3" className="stat-value">{patients.length}</Typography>
                  <div className="stat-trend up">
                    <ArrowUpward sx={{ fontSize: 12 }} />
                    <Typography variant="caption">8.2% from last month</Typography>
                  </div>
                </div>
              </div>
              
              <div className="stat-item">
                <div className="stat-icon pending-icon">
                  <Warning sx={{ fontSize: 32 }} />
                </div>
                <div className="stat-info">
                  <Typography variant="body2" className="stat-label">Pending Invoices</Typography>
                  <Typography variant="h3" className="stat-value">
                    {billing.filter(b => getBillStatus(b) === 'unpaid').length}
                  </Typography>
                </div>
              </div>
            </div>

            {/* Appointments Section - Grid */}
            <div className="appointments-section fade-up">
              <div className="section-header">
                <div className="section-title-wrapper">
                  <EventAvailable sx={{ color: '#2ca6a4' }} />
                  <Typography variant="h5" className="section-title">Appointments Management</Typography>
                </div>
                <Chip label={`${stats.dailyAppointments} Today`} size="small" className="today-chip" />
              </div>
              
              <div className="appointments-grid">
                {/* Calendar */}
                <div className="calendar-wrapper">
                  <div className="subsection-header">
                    <CalendarToday sx={{ fontSize: 20, color: '#2ca6a4' }} />
                    <Typography variant="h6">Calendar View</Typography>
                  </div>
                  <div className="calendar-container">
                    <Calendar
                      localizer={localizer}
                      events={calendarEvents}
                      startAccessor="start"
                      endAccessor="end"
                      style={{ height: 450 }}
                      className="custom-calendar"
                      eventPropGetter={(event) => ({
                        className: `calendar-event ${event.status === 'completed' ? 'event-completed' : event.status === 'confirmed' ? 'event-confirmed' : 'event-scheduled'}`,
                      })}
                    />
                  </div>
                </div>

                {/* Stats Overview */}
                <div className="stats-overview-wrapper">
                  <div className="subsection-header">
                    <Schedule sx={{ fontSize: 20, color: '#2ca6a4' }} />
                    <Typography variant="h6">Overview</Typography>
                  </div>
                  <div className="stats-overview">
                    <div className="overview-item">
                      <div>
                        <Typography variant="body2" className="overview-label">Today's Appointments</Typography>
                        <Typography variant="h2" className="overview-number">{stats.dailyAppointments}</Typography>
                      </div>
                      <div className="overview-icon teal"><MedicalServices /></div>
                    </div>
                    <div className="overview-item">
                      <div>
                        <Typography variant="body2" className="overview-label">This Week</Typography>
                        <Typography variant="h2" className="overview-number">{stats.weeklyAppointments}</Typography>
                      </div>
                      <div className="overview-icon blue"><CalendarToday /></div>
                    </div>
                    <div className="overview-item">
                      <div>
                        <Typography variant="body2" className="overview-label">This Month</Typography>
                        <Typography variant="h2" className="overview-number">{stats.monthlyAppointments}</Typography>
                      </div>
                      <div className="overview-icon green"><TrendingUp /></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Section - Grid */}
            <div className="financial-section fade-left">
              <div className="section-header">
                <div className="section-title-wrapper">
                  <MonetizationOn sx={{ color: '#2ca6a4' }} />
                  <Typography variant="h5" className="section-title">Financial Overview</Typography>
                </div>
              </div>
              
              <div className="financial-grid">
                {/* Billing Table */}
                <div className="billing-wrapper">
                  <div className="subsection-header">
                    <Receipt sx={{ fontSize: 20, color: '#2ca6a4' }} />
                    <Typography variant="h6">Recent Billing</Typography>
                    <Chip 
                      label={`${billing.filter(b => getBillStatus(b) !== 'paid').length} Unpaid`} 
                      size="small" 
                      className="warning-chip" 
                    />
                  </div>
                  <TableContainer component={Paper} className="dashboard-table">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Invoice #</TableCell>
                          <TableCell>Patient</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {billing.slice(0, 5).map((b) => {
                          const status = getBillStatus(b);
                          return (
                            <TableRow key={b.id} className="table-row">
                              <TableCell>{getInvoiceNumber(b)}</TableCell>
                              <TableCell>{b.user_username || 'N/A'}</TableCell>
                              <TableCell>₱{getBillAmount(b).toFixed(2)}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={status === 'partial' ? 'Partial' : status}
                                  size="small"
                                  className={
                                    status === 'paid' ? 'status-paid' : 
                                    status === 'partial' ? 'status-partial' : 
                                    'status-unpaid'
                                  }
                                  icon={status === 'paid' ? <Check sx={{ fontSize: 16 }} /> : 
                                        status === 'partial' ? <Schedule sx={{ fontSize: 16 }} /> : 
                                        <Close sx={{ fontSize: 16 }} />}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {billing.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} align="center">No billing records found</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </div>

                {/* Payments Table (changed from List to Table) */}
                <div className="payments-wrapper">
                  <div className="subsection-header">
                    <Payment sx={{ fontSize: 20, color: '#2ca6a4' }} />
                    <Typography variant="h6">Recent Payments</Typography>
                    <Chip 
                      label={`${payments.length} Total`} 
                      size="small" 
                      className="info-chip" 
                    />
                  </div>
                  <TableContainer component={Paper} className="dashboard-table">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Transaction ID</TableCell>
                          <TableCell>Method</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {payments.slice(0, 5).map((p) => (
                          <TableRow key={p.id} className="table-row">
                            <TableCell>{getPaymentTransactionId(p)}</TableCell>
                            <TableCell>{getPaymentMethod(p)}</TableCell>
                            <TableCell>₱{getPaymentAmount(p).toFixed(2)}</TableCell>
                            <TableCell>{new Date(getPaymentDate(p)).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Chip 
                                label={getPaymentStatus(p)}
                                size="small"
                                className={getPaymentStatus(p) === 'completed' ? 'status-paid' : 'status-partial'}
                                icon={getPaymentStatus(p) === 'completed' ? <Check sx={{ fontSize: 16 }} /> : <Schedule sx={{ fontSize: 16 }} />}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                        {payments.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} align="center">No payment records found</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </div>
              </div>
            </div>

            {/* Patients Section - Full Width */}
            <div className="patients-section fade-up">
              <div className="section-header">
                <div className="section-title-wrapper">
                  <HealthAndSafety sx={{ color: '#2ca6a4' }} />
                  <Typography variant="h5" className="section-title">Patient Records</Typography>
                </div>
                <Chip label={`${patients.length} Total Patients`} size="small" className="info-chip" />
              </div>
              
              <TableContainer component={Paper} className="dashboard-table">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Patient Name</TableCell>
                      <TableCell>Contact</TableCell>
                      <TableCell>Medical History</TableCell>
                      <TableCell>Last Visit</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {patients.map((r) => (
                      <TableRow key={r.id} className="table-row">
                        <TableCell>
                          <Typography fontWeight={600} color="#1a5f5d">
                            {getPatientFullName(r)}
                          </Typography>
                        </TableCell>
                        <TableCell>{getPatientContact(r)}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color="textSecondary">
                            {getMedicalHistory(r).substring(0, 50) || 'No history recorded'}
                            {getMedicalHistory(r).length > 50 && '...'}
                          </Typography>
                        </TableCell>
                        <TableCell>{getLastVisit(r)}</TableCell>
                      </TableRow>
                    ))}
                    {patients.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">No patient records found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>

            {/* Audit Log Section - Below all content */}
            <div className="audit-section fade-up">
              <div className="section-header">
                <div className="section-title-wrapper">
                  <History sx={{ color: '#2ca6a4' }} />
                  <Typography variant="h5" className="section-title">Audit Log (Recent Activity)</Typography>
                </div>
                <Chip label="Non-working - Demo Data" size="small" className="warning-chip" />
              </div>
              
              <TableContainer component={Paper} className="dashboard-table">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><AccessTime sx={{ fontSize: 16, mr: 0.5 }} /> Timestamp</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Details</TableCell>
                      <TableCell>IP Address</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {auditLogs.length > 0 ? (
                      auditLogs.map((log) => (
                        <TableRow key={log.id} className="table-row">
                          <TableCell>{formatAuditTime(log.created_at)}</TableCell>
                          <TableCell>{log.user_username || log.user || 'System'}</TableCell>
                          <TableCell>
                            <Chip 
                              label={log.action || log.action_type || 'Unknown'}
                              size="small"
                              className={
                                log.action === 'CREATE' ? 'status-paid' :
                                log.action === 'UPDATE' ? 'status-partial' :
                                log.action === 'DELETE' ? 'status-unpaid' : 'info-chip'
                              }
                            />
                          </TableCell>
                          <TableCell>{log.details || log.description || '-'}</TableCell>
                          <TableCell>{log.ip_address || '-'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <>
                        {/* Demo audit log entries */}
                        {[1, 2, 3, 4, 5].map((i) => (
                          <TableRow key={i} className="table-row">
                            <TableCell>{new Date(Date.now() - i * 3600000).toLocaleString()}</TableCell>
                            <TableCell>demo_user_{i}</TableCell>
                            <TableCell>
                              <Chip 
                                label={i === 1 ? 'CREATE' : i === 2 ? 'UPDATE' : i === 3 ? 'DELETE' : 'LOGIN'}
                                size="small"
                                className={i === 1 ? 'status-paid' : i === 2 ? 'status-partial' : 'status-unpaid'}
                              />
                            </TableCell>
                            <TableCell>
                              {i === 1 ? 'Created new appointment' : 
                               i === 2 ? 'Updated patient record' : 
                               i === 3 ? 'Cancelled appointment' : 
                               'User logged in'}
                            </TableCell>
                            <TableCell>192.168.1.{100 + i}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ color: '#b0b0b0', py: 3 }}>
                            <History sx={{ fontSize: 40, opacity: 0.5, mb: 1 }} />
                            <Typography variant="body2">Audit log feature coming soon. This is demo data.</Typography>
                            <Typography variant="caption">Activity logging will be implemented in the next phase.</Typography>
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          </>
        )}
      </Box>
    </Box>
  );
};

export default AdminDashboard;