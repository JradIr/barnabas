// src/components/Navbar.jsx
import Typography from '@mui/material/Typography';
import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Box,
  CssBaseline,
  Avatar,
  Menu,
  MenuItem,
  Button,
  Container,
  IconButton as MuiIconButton,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AxiosInstance from "./AxiosInstance";
import "./style/Navbar.css";

export default function Navbar({ content }) {
  const location = useLocation();
  const path = location.pathname;
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const open = Boolean(anchorEl);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const logoutUser = () => {
    AxiosInstance.post(`logout/`, {}).then(() => {
      localStorage.removeItem("Token");
      navigate("/");
    });
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const navItems = [
    { name: "Home", path: "/home" },
    { name: "About", path: "/about" },
    { name: "Services", path: "/services" },
    { name: "Appointment", path: "/calendar" },
  ];

  // Helper to check if path is active
  const isActive = (itemPath) => {
    if (itemPath === "/home") {
      return path === "/home" || path === "/home/";
    }
    return path === itemPath || path === `${itemPath}/`;
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <CssBaseline />
      
      {/* Navbar with Dark Transparent Glass Effect - No transition */}
      <AppBar
        position="fixed"
        className="navbar"
        sx={{
          background: "rgba(26, 42, 58, 0.85) !important",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: "none",
          borderBottom: "1px solid rgba(44, 166, 164, 0.15)",
        }}
      >
        <Container maxWidth={false} disableGutters>
          <Toolbar sx={{ 
            display: "flex", 
            justifyContent: "space-between",
            px: { xs: 2, sm: 3, md: 4 },
            py: 1,
            minHeight: "70px"
          }}>
            {/* Logo */}
            <Box 
              className="logo-container"
              onClick={() => navigate("/home")}
              sx={{ cursor: "pointer" }}
            >
              <img
                src="/barnabaslogo.png"
                alt="Barnabas Dental Clinic"
                className="navbar-logo"
              />
              <span className="logo-text">Barnabas Dental</span>
            </Box>

            {/* Desktop Navigation */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, alignItems: "center" }}>
              {navItems.map((item) => (
                <Button
                  key={item.name}
                  component={Link}
                  to={item.path}
                  className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                  sx={{
                    color: isActive(item.path) ? "#2ca6a4" : "white",
                    fontWeight: isActive(item.path) ? 600 : 500,
                    textTransform: "none",
                    fontSize: "1rem",
                    px: 2,
                    py: 1,
                    mx: 0.5,
                    borderRadius: "8px",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.15)",
                      color: "white",
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  {item.name}
                </Button>
              ))}

              {/* Profile Avatar Desktop */}
              <MuiIconButton 
                onClick={handleMenuOpen}
                className="avatar-button"
                sx={{ ml: 2 }}
              >
                <Avatar sx={{ 
                  bgcolor: "#2ca6a4", 
                  color: "white",
                  transition: "all 0.3s ease",
                  '&:hover': {
                    transform: "scale(1.05)",
                    boxShadow: "0 2px 8px rgba(44, 166, 164, 0.3)"
                  }
                }}>
                  <PersonIcon />
                </Avatar>
              </MuiIconButton>
              <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleMenuClose}
                className="profile-menu"
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                PaperProps={{
                  sx: {
                    mt: 1,
                    borderRadius: "12px",
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
                    minWidth: "150px",
                    backdropFilter: "blur(10px)",
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                  }
                }}
              >
                <MenuItem 
                  onClick={() => {
                    handleMenuClose();
                    navigate("/profile");
                  }}
                  className="menu-item"
                >
                  Profile
                </MenuItem>
                <MenuItem 
                  onClick={() => {
                    handleMenuClose();
                    logoutUser();
                  }}
                  className="menu-item"
                >
                  Logout
                </MenuItem>
              </Menu>
            </Box>

            {/* Hamburger Menu Button - Only visible on mobile/tablet */}
            <MuiIconButton 
              className="mobile-menu-btn"
              onClick={toggleMobileMenu}
              sx={{ 
                display: { xs: 'flex', md: 'none' },
                color: "white",
                zIndex: 1201,
              }}
            >
              <MenuIcon />
            </MuiIconButton>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Navigation Drawer */}
      <Box className={`mobile-nav ${mobileMenuOpen ? 'open' : ''}`}>
        {/* Close button inside drawer */}
        <MuiIconButton 
          className="mobile-close-btn"
          onClick={closeMobileMenu}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            color: '#1a5f5d',
            zIndex: 1202,
            backgroundColor: 'rgba(44, 166, 164, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(44, 166, 164, 0.2)',
              transform: 'rotate(90deg)',
            }
          }}
        >
          <CloseIcon />
        </MuiIconButton>

        <Box className="mobile-nav-content">
          {/* Mobile Avatar Section */}
          <Box className="mobile-avatar-section">
            <Avatar sx={{ 
              bgcolor: "#2ca6a4", 
              width: 60, 
              height: 60,
              marginBottom: 2,
            }}>
              <PersonIcon sx={{ fontSize: 35 }} />
            </Avatar>
            <Typography variant="h6" sx={{ color: "#1a5f5d", fontWeight: 600 }}>
              Welcome Back!
            </Typography>
          </Box>

          {/* Mobile Navigation Links */}
          <Box className="mobile-nav-links">
            {navItems.map((item) => (
              <Button
                key={item.name}
                component={Link}
                to={item.path}
                className={`mobile-nav-link ${isActive(item.path) ? 'active' : ''}`}
                onClick={closeMobileMenu}
                fullWidth
              >
                {item.name}
              </Button>
            ))}
          </Box>

          {/* Mobile Action Buttons */}
          <Box className="mobile-action-buttons">
            <Button
              className="mobile-nav-link"
              onClick={() => {
                closeMobileMenu();
                navigate("/profile");
              }}
              fullWidth
            >
              Profile
            </Button>
            <Button
              className="mobile-nav-link logout"
              onClick={() => {
                closeMobileMenu();
                logoutUser();
              }}
              fullWidth
            >
              Logout
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Overlay for mobile menu */}
      {mobileMenuOpen && (
        <Box 
          className="mobile-overlay"
          onClick={closeMobileMenu}
        />
      )}

      {/* Main Content - Full width, no padding */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1,
          margin: 0,
          padding: 0,
          width: "100%",
          mt: "70px",
        }}
      >
        {content}
      </Box>
    </Box>
  );
}