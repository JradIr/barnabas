// src/components/StaffDashboard.jsx

import React, { useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Avatar,
  LinearProgress,
  Chip,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  IconButton,
  Tabs,
  Tab,
  Stack,
} from '@mui/material';
import {
  Today as TodayIcon,
  People as PeopleIcon,
  Payments as PaymentsIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  ExitToApp as ExitIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  MoreVert as MoreVertIcon,
  CalendarToday as CalendarIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';

const StaffDashboard = () => {
  const [tabValue, setTabValue] = useState(0);
  const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Mock data
  const todaysAppointments = [
    { id: 1, patient: "John Smith", time: "09:00 AM", service: "Teeth Cleaning", status: "confirmed", avatar: "JS" },
    { id: 2, patient: "Maria Garcia", time: "10:30 AM", service: "Dental Filling", status: "pending", avatar: "MG" },
    { id: 3, patient: "Robert Johnson", time: "11:00 AM", service: "Tooth Extraction", status: "confirmed", avatar: "RJ" },
    { id: 4, patient: "Sarah Williams", time: "01:30 PM", service: "Braces Check-up", status: "checked-in", avatar: "SW" },
    { id: 5, patient: "David Brown", time: "03:00 PM", service: "Root Canal", status: "confirmed", avatar: "DB" },
  ];

  const pendingTasks = [
    { id: 1, task: "Approve patient registration", priority: "high", time: "Pending 2 hours" },
    { id: 2, task: "Review lab results", priority: "medium", time: "Due today" },
    { id: 3, task: "Follow up with insurance", priority: "low", time: "Tomorrow" },
  ];

  const recentActivities = [
    { id: 1, action: "New patient registered", user: "Sarah Johnson", time: "5 min ago", icon: "👤" },
    { id: 2, action: "Appointment confirmed", user: "Dr. Smith", time: "15 min ago", icon: "✅" },
    { id: 3, action: "Payment received", user: "John Doe", time: "1 hour ago", icon: "💰" },
    { id: 4, action: "Lab results uploaded", user: "Lab Tech", time: "2 hours ago", icon: "🔬" },
  ];

  const stats = [
    { title: "Today's Appointments", value: "12", icon: <TodayIcon />, color: "#2ca6a4", change: "+2 from yesterday" },
    { title: "Pending Approvals", value: "3", icon: <AccessTimeIcon />, color: "#ff9800", change: "Urgent: 1" },
    { title: "Total Patients", value: "245", icon: <PeopleIcon />, color: "#2196f3", change: "+12 this month" },
    { title: "Today's Revenue", value: "$1,250", icon: <MoneyIcon />, color: "#4caf50", change: "+$350 vs yesterday" },
  ];

  const getStatusColor = (status) => {
    const colors = {
      confirmed: '#4caf50',
      pending: '#ff9800',
      'checked-in': '#2196f3',
      cancelled: '#f44336',
      completed: '#9e9e9e',
    };
    return colors[status] || '#757575';
  };

  const getStatusLabel = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: '#f44336',
      medium: '#ff9800',
      low: '#4caf50',
    };
    return colors[priority] || '#757575';
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#f8f9fc', minHeight: '100vh' }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Grid container justifyContent="space-between" alignItems="center">
          <Grid item>
            <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a2c3e', mb: 1 }}>
              Staff Dashboard
            </Typography>
            <Typography variant="body2" sx={{ color: '#6c757d' }}>
              {currentDate} • {currentTime}
            </Typography>
          </Grid>
          <Grid item>
            <Stack direction="row" spacing={2}>
              <IconButton sx={{ bgcolor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <NotificationsIcon sx={{ color: '#2ca6a4' }} />
              </IconButton>
              <Chip 
                avatar={<Avatar sx={{ bgcolor: '#2ca6a4' }}>S</Avatar>}
                label="Dr. Sarah Wilson"
                variant="outlined"
                sx={{ borderColor: '#2ca6a4', color: '#2ca6a4' }}
              />
            </Stack>
          </Grid>
        </Grid>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderRadius: 3,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
                },
              }}
            >
              <Box>
                <Typography variant="caption" sx={{ color: '#6c757d', fontWeight: 500 }}>
                  {stat.title}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a2c3e', mt: 1 }}>
                  {stat.value}
                </Typography>
                <Typography variant="caption" sx={{ color: '#4caf50', fontSize: '0.7rem' }}>
                  {stat.change}
                </Typography>
              </Box>
              <Avatar
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: `${stat.color}15`,
                  color: stat.color,
                }}
              >
                {stat.icon}
              </Avatar>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Left Column - Appointments */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ borderRadius: 3, overflow: 'hidden', mb: 3 }}>
            <Box sx={{ p: 2, bgcolor: 'white', borderBottom: '1px solid #e0e0e0' }}>
              <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
                <Tab label="Today's Schedule" />
                <Tab label="Upcoming" />
                <Tab label="Completed" />
              </Tabs>
            </Box>

            {tabValue === 0 && (
              <Box>
                {todaysAppointments.map((apt, index) => (
                  <React.Fragment key={apt.id}>
                    <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: '#2ca6a4', width: 48, height: 48 }}>
                          {apt.avatar}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {apt.patient}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#6c757d' }}>
                            {apt.service}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {apt.time}
                        </Typography>
                        <Chip
                          label={getStatusLabel(apt.status)}
                          size="small"
                          sx={{
                            bgcolor: `${getStatusColor(apt.status)}20`,
                            color: getStatusColor(apt.status),
                            fontSize: '0.7rem',
                            fontWeight: 500,
                            mt: 0.5,
                          }}
                        />
                      </Box>
                    </Box>
                    {index < todaysAppointments.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </Box>
            )}

            {tabValue === 1 && (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: '#6c757d' }}>
                  No upcoming appointments scheduled
                </Typography>
              </Box>
            )}

            {tabValue === 2 && (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: '#6c757d' }}>
                  No completed appointments for today
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Recent Activities */}
          <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ p: 2, bgcolor: 'white', borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Recent Activities
              </Typography>
            </Box>
            {recentActivities.map((activity, index) => (
              <React.Fragment key={activity.id}>
                <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h5">{activity.icon}</Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {activity.action}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6c757d' }}>
                      by {activity.user} • {activity.time}
                    </Typography>
                  </Box>
                  <IconButton size="small">
                    <MoreVertIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
                {index < recentActivities.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </Paper>
        </Grid>

        {/* Right Column */}
        <Grid item xs={12} md={5}>
          {/* Pending Tasks Card */}
          <Paper sx={{ borderRadius: 3, overflow: 'hidden', mb: 3 }}>
            <Box sx={{ p: 2, bgcolor: 'white', borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Pending Tasks
              </Typography>
            </Box>
            {pendingTasks.map((task, index) => (
              <React.Fragment key={task.id}>
                <Box sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {task.task}
                    </Typography>
                    <Chip
                      label={task.priority}
                      size="small"
                      sx={{
                        bgcolor: `${getPriorityColor(task.priority)}20`,
                        color: getPriorityColor(task.priority),
                        fontSize: '0.7rem',
                        fontWeight: 500,
                      }}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#6c757d' }}>
                    {task.time}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={task.priority === 'high' ? 80 : task.priority === 'medium' ? 50 : 30}
                    sx={{
                      mt: 1.5,
                      height: 4,
                      borderRadius: 2,
                      bgcolor: '#e0e0e0',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: getPriorityColor(task.priority),
                        borderRadius: 2,
                      },
                    }}
                  />
                </Box>
                {index < pendingTasks.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </Paper>

          {/* Quick Actions Card */}
          <Paper sx={{ borderRadius: 3, overflow: 'hidden', mb: 3 }}>
            <Box sx={{ p: 2, bgcolor: 'white', borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Quick Actions
              </Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<TodayIcon />}
                    sx={{
                      py: 1.5,
                      borderRadius: 2,
                      borderColor: '#2ca6a4',
                      color: '#2ca6a4',
                      '&:hover': {
                        borderColor: '#1e7a78',
                        bgcolor: 'rgba(44, 166, 164, 0.05)',
                      },
                    }}
                  >
                    New Appointment
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<PeopleIcon />}
                    sx={{
                      py: 1.5,
                      borderRadius: 2,
                      borderColor: '#2ca6a4',
                      color: '#2ca6a4',
                      '&:hover': {
                        borderColor: '#1e7a78',
                        bgcolor: 'rgba(44, 166, 164, 0.05)',
                      },
                    }}
                  >
                    Register Patient
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<PaymentsIcon />}
                    sx={{
                      py: 1.5,
                      borderRadius: 2,
                      borderColor: '#2ca6a4',
                      color: '#2ca6a4',
                      '&:hover': {
                        borderColor: '#1e7a78',
                        bgcolor: 'rgba(44, 166, 164, 0.05)',
                      },
                    }}
                  >
                    Process Payment
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<CheckCircleIcon />}
                    sx={{
                      py: 1.5,
                      borderRadius: 2,
                      borderColor: '#2ca6a4',
                      color: '#2ca6a4',
                      '&:hover': {
                        borderColor: '#1e7a78',
                        bgcolor: 'rgba(44, 166, 164, 0.05)',
                      },
                    }}
                  >
                    Complete Check-in
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Paper>

          {/* Clinic Status Card */}
          <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ p: 2, bgcolor: '#2ca6a4', color: 'white' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Clinic Status
              </Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#6c757d' }}>
                    Operating Hours
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    9:00 AM - 6:00 PM
                  </Typography>
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#6c757d' }}>
                    Current Capacity
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      8/12
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={66}
                      sx={{
                        width: 80,
                        height: 4,
                        borderRadius: 2,
                        bgcolor: '#e0e0e0',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: '#4caf50',
                          borderRadius: 2,
                        },
                      }}
                    />
                  </Box>
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#6c757d' }}>
                    Next Available Slot
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    2:00 PM
                  </Typography>
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#6c757d' }}>
                    Waiting Patients
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#ff9800' }}>
                    3 waiting
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StaffDashboard;