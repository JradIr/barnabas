// src/components/StaffNavbar.jsx

import React, { useState, useEffect } from 'react';
import { 
  Box, CssBaseline, Drawer, AppBar, Toolbar, List, 
  ListItem, ListItemButton, ListItemIcon, ListItemText, 
  IconButton, Typography, Divider, useTheme, useMediaQuery,
  Avatar, Tooltip, Badge, Menu, MenuItem
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PaymentIcon from '@mui/icons-material/Payment';
import PeopleIcon from '@mui/icons-material/People';
import BarChartIcon from '@mui/icons-material/BarChart';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import EventIcon from '@mui/icons-material/Event';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AxiosInstance from './AxiosInstance';
import './style/AdminNavbar.css';

const drawerWidth = 240;
const collapsedDrawerWidth = 68;

export default function StaffNavbar({ content }) {
  const location = useLocation();
  const path = location.pathname;
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState(5);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);

  // Close drawer on route change for mobile
  useEffect(() => {
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [path, isMobile]);

  const logoutUser = () => {
    AxiosInstance.post(`logout/`, {})
      .then(() => {
        localStorage.removeItem('Token');
        localStorage.removeItem('user');
        navigate('/staff/login');
      })
      .catch((error) => {
        console.error('Logout error:', error);
        localStorage.removeItem('Token');
        localStorage.removeItem('user');
        navigate('/staff/login');
      });
  };

  const handleDrawerToggle = () => {
    if (isMobile || isTablet) {
      setMobileOpen(!mobileOpen);
    } else {
      setOpen(!open);
    }
  };

  const handleNotificationClick = (event) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchorEl(null);
  };

  const handleProfileClick = (event) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleProfileClose = () => {
    setProfileAnchorEl(null);
  };

  const navItems = [
    { name: 'Dashboard', path: '/staff/dashboard', icon: <DashboardIcon /> },
    { name: 'Appointments', path: '/staff/appointments', icon: <EventIcon /> },
    { name: 'Patient Records', path: '/staff/patients', icon: <PeopleIcon /> },
    { name: 'Schedule', path: '/staff/schedule', icon: <CalendarMonthIcon /> },
    { name: 'Treatments', path: '/staff/treatments', icon: <MedicalServicesIcon /> },
    { name: 'Billing', path: '/staff/billing', icon: <ReceiptIcon /> },
    { name: 'Payments', path: '/staff/payments', icon: <PaymentIcon /> },
    { name: 'Reports', path: '/staff/reports', icon: <BarChartIcon /> },
    { name: 'Settings', path: '/staff/settings', icon: <SettingsIcon /> },
  ];

  const drawer = (
    <Box className="staff-drawer">
      {/* Header with only Hamburger Menu */}
      <Box className="drawer-header">
        {/* Desktop Hamburger Menu Button */}
        {isDesktop && (
          <IconButton 
            onClick={handleDrawerToggle}
            className="desktop-hamburger-btn"
            size="small"
          >
            {open ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
        )}
        
        {/* Mobile/Tablet Hamburger Menu Button */}
        {(isMobile || isTablet) && (
          <IconButton 
            onClick={handleDrawerToggle}
            className="mobile-drawer-close-btn"
            size="small"
          >
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Box>

      <Divider className="drawer-divider" />

      {/* Navigation Items */}
      <List className="nav-list" disablePadding>
        {navItems.map((item) => {
          const isActive = path === item.path || path.startsWith(item.path + '/');
          return (
            <ListItem key={item.name} disablePadding className="nav-item">
              <Tooltip 
                title={(!open && isDesktop) ? item.name : ''} 
                placement="right"
                arrow
              >
                <ListItemButton
                  component={Link}
                  to={item.path}
                  className={`nav-button ${isActive ? 'active' : ''}`}
                  sx={{
                    justifyContent: (isMobile || isTablet || open) ? 'flex-start' : 'center',
                    px: 1.5,
                    py: 0.75,
                    minHeight: 40,
                    gap: 1.5,
                  }}
                >
                  <ListItemIcon 
                    className={`nav-icon ${isActive ? 'active' : ''}`}
                    sx={{
                      minWidth: 'auto',
                      justifyContent: 'center',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {(isMobile || isTablet || open) && (
                    <ListItemText 
                      primary={item.name} 
                      className={`nav-text ${isActive ? 'active' : ''}`}
                      primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: isActive ? 600 : 400 }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>

      <Divider className="drawer-divider" />

      {/* User Section - Notifications & Profile */}
      <List className="nav-list-user" disablePadding>
        {/* Notifications Button */}
        <ListItem disablePadding className="nav-item">
          <Tooltip title={(!open && isDesktop) ? 'Notifications' : ''} placement="right" arrow>
            <ListItemButton
              onClick={handleNotificationClick}
              className="nav-button notification-btn-sidebar"
              sx={{
                justifyContent: (isMobile || isTablet || open) ? 'flex-start' : 'center',
                px: 1.5,
                py: 0.75,
                minHeight: 40,
                gap: 1.5,
              }}
            >
              <ListItemIcon 
                className="nav-icon"
                sx={{
                  minWidth: 'auto',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <Badge badgeContent={notifications} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '10px', height: '16px', minWidth: '16px' } }}>
                  <NotificationsIcon />
                </Badge>
              </ListItemIcon>
              {(isMobile || isTablet || open) && (
                <ListItemText 
                  primary="Notifications" 
                  className="nav-text"
                  primaryTypographyProps={{ fontSize: '0.85rem' }}
                />
              )}
            </ListItemButton>
          </Tooltip>
        </ListItem>

        {/* Profile Button */}
        <ListItem disablePadding className="nav-item">
          <Tooltip title={(!open && isDesktop) ? 'Profile' : ''} placement="right" arrow>
            <ListItemButton
              onClick={handleProfileClick}
              className="nav-button profile-btn-sidebar"
              sx={{
                justifyContent: (isMobile || isTablet || open) ? 'flex-start' : 'center',
                px: 1.5,
                py: 0.75,
                minHeight: 40,
                gap: 1.5,
              }}
            >
              <ListItemIcon 
                className="nav-icon"
                sx={{
                  minWidth: 'auto',
                  justifyContent: 'center',
                }}
              >
                <Avatar sx={{ width: 24, height: 24, bgcolor: '#2ca6a4' }}>
                  <AccountCircleIcon sx={{ fontSize: 16 }} />
                </Avatar>
              </ListItemIcon>
              {(isMobile || isTablet || open) && (
                <ListItemText 
                  primary="Profile" 
                  className="nav-text"
                  primaryTypographyProps={{ fontSize: '0.85rem' }}
                />
              )}
            </ListItemButton>
          </Tooltip>
        </ListItem>
      </List>

      <Divider className="drawer-divider" />

      {/* Bottom Section - Logout */}
      <List className="nav-list-bottom" disablePadding>
        <ListItem disablePadding className="nav-item">
          <Tooltip title={(!open && isDesktop) ? 'Logout' : ''} placement="right" arrow>
            <ListItemButton
              onClick={logoutUser}
              className="nav-button logout-btn"
              sx={{
                justifyContent: (isMobile || isTablet || open) ? 'flex-start' : 'center',
                px: 1.5,
                py: 0.75,
                minHeight: 40,
                gap: 1.5,
              }}
            >
              <ListItemIcon 
                className="nav-icon logout-icon"
                sx={{
                  minWidth: 'auto',
                  justifyContent: 'center',
                }}
              >
                <LogoutIcon />
              </ListItemIcon>
              {(isMobile || isTablet || open) && (
                <ListItemText primary="Logout" className="nav-text" primaryTypographyProps={{ fontSize: '0.85rem' }} />
              )}
            </ListItemButton>
          </Tooltip>
        </ListItem>
      </List>
    </Box>
  );

  // Notification Menu
  const notificationMenu = (
    <Menu
      anchorEl={notificationAnchorEl}
      open={Boolean(notificationAnchorEl)}
      onClose={handleNotificationClose}
      className="notification-menu"
      PaperProps={{
        sx: {
          width: 320,
          maxHeight: 400,
          borderRadius: 2,
          mt: 1,
        }
      }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
        <Typography variant="subtitle2" fontWeight={600}>Staff Notifications</Typography>
      </Box>
      <MenuItem onClick={handleNotificationClose}>
        <Box>
          <Typography variant="body2" fontWeight={500}>New Patient Registration</Typography>
          <Typography variant="caption" color="textSecondary">New patient has registered online</Typography>
        </Box>
      </MenuItem>
      <MenuItem onClick={handleNotificationClose}>
        <Box>
          <Typography variant="body2" fontWeight={500}>Appointment Request</Typography>
          <Typography variant="caption" color="textSecondary">New appointment request pending</Typography>
        </Box>
      </MenuItem>
      <MenuItem onClick={handleNotificationClose}>
        <Box>
          <Typography variant="body2" fontWeight={500}>Payment Alert</Typography>
          <Typography variant="caption" color="textSecondary">Payment received from patient</Typography>
        </Box>
      </MenuItem>
      <MenuItem onClick={handleNotificationClose}>
        <Box>
          <Typography variant="body2" fontWeight={500}>Schedule Change</Typography>
          <Typography variant="caption" color="textSecondary">Your schedule has been updated</Typography>
        </Box>
      </MenuItem>
      <MenuItem onClick={handleNotificationClose}>
        <Box>
          <Typography variant="body2" fontWeight={500}>Lab Results Ready</Typography>
          <Typography variant="caption" color="textSecondary">Lab results are ready for review</Typography>
        </Box>
      </MenuItem>
    </Menu>
  );

  // Profile Menu
  const profileMenu = (
    <Menu
      anchorEl={profileAnchorEl}
      open={Boolean(profileAnchorEl)}
      onClose={handleProfileClose}
      className="profile-menu"
      PaperProps={{
        sx: {
          width: 200,
          borderRadius: 2,
          mt: 1,
        }
      }}
    >
      <MenuItem onClick={() => { handleProfileClose(); navigate('/staff/profile'); }}>
        <AccountCircleIcon sx={{ mr: 1, fontSize: 20 }} />
        My Profile
      </MenuItem>
      <MenuItem onClick={() => { handleProfileClose(); navigate('/staff/settings'); }}>
        <SettingsIcon sx={{ mr: 1, fontSize: 20 }} />
        Settings
      </MenuItem>
      <MenuItem onClick={() => { handleProfileClose(); navigate('/staff/schedule'); }}>
        <EventIcon sx={{ mr: 1, fontSize: 20 }} />
        My Schedule
      </MenuItem>
      <Divider />
      <MenuItem onClick={() => { handleProfileClose(); logoutUser(); }} sx={{ color: '#ef4444' }}>
        <LogoutIcon sx={{ mr: 1, fontSize: 20 }} />
        Logout
      </MenuItem>
    </Menu>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      
      {/* Notifications & Profile Menus */}
      {notificationMenu}
      {profileMenu}
      
      {/* App Bar for Mobile/Tablet */}
      {(isMobile || isTablet) && (
        <AppBar 
          position="fixed" 
          className="staff-appbar"
          sx={{
            bgcolor: '#0d2a2a',
            boxShadow: 'none',
            borderBottom: '1px solid rgba(44, 166, 164, 0.2)',
            zIndex: 1200,
          }}
        >
          <Toolbar sx={{ minHeight: '56px !important', px: 2 }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              className="menu-button"
            >
              <MenuIcon />
            </IconButton>
            
            <Typography variant="subtitle2" className="appbar-title">
              Staff Portal
            </Typography>
            
            <Box sx={{ flexGrow: 1 }} />
          </Toolbar>
        </AppBar>
      )}

      {/* Mobile/Tablet Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'block' },
          '& .MuiDrawer-paper': { 
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: '#0a1a1f',
            borderRight: '1px solid rgba(44, 166, 164, 0.15)',
            top: 0,
            height: '100vh',
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Desktop Drawer */}
      {isDesktop && (
        <Drawer
          variant="permanent"
          className={`desktop-drawer ${open ? 'expanded' : 'collapsed'}`}
          sx={{
            width: open ? drawerWidth : collapsedDrawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: open ? drawerWidth : collapsedDrawerWidth,
              transition: 'width 0.2s ease',
              overflowX: 'hidden',
              bgcolor: '#0a1a1f',
              borderRight: '1px solid rgba(44, 166, 164, 0.15)',
              position: 'fixed',
              height: '100vh',
              top: 0,
              left: 0,
            },
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {drawer}
          </Box>
        </Drawer>
      )}

      {/* Main Content Area - Zero margins */}
      <Box
        component="main"
        className="staff-main-content"
        sx={{
          flexGrow: 1,
          p: 0,
          m: 0,
          minHeight: '100vh',
          mt: (isMobile || isTablet) ? '56px' : 0,
          bgcolor: '#f8f9fc',
          marginLeft: isDesktop ? (open ? `${drawerWidth}px` : `${collapsedDrawerWidth}px`) : 0,
          width: isDesktop ? `calc(100% - ${open ? drawerWidth : collapsedDrawerWidth}px)` : '100%',
          transition: 'margin-left 0.2s ease, width 0.2s ease',
        }}
      >
        {/* Content - No padding */}
        {content}
      </Box>
    </Box>
  );
}