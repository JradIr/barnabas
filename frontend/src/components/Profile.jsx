// src/components/Profile.jsx

import React, { useState, useEffect } from "react";
import AxiosInstance from "./AxiosInstance";

const Profile = () => {
  const [profile, setProfile] = useState({
    username: "",
    email: "",
    firstname: "",
    middlename: "",
    lastname: "",
    birthday: "",
  });
  const [editForm, setEditForm] = useState({
    username: "",
    email: "",
    firstname: "",
    middlename: "",
    lastname: "",
    birthday: "",
  });
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch user profile from /users/me/ endpoint
        const profileResponse = await AxiosInstance.get("users/me/");
        setProfile(profileResponse.data);
        setEditForm(profileResponse.data);
        
        // Fetch user appointments from /appointments/ endpoint
        try {
          const appointmentsResponse = await AxiosInstance.get("appointments/");
          setAppointments(appointmentsResponse.data);
        } catch (appError) {
          console.error("Error fetching appointments:", appError);
          setAppointments([]);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        setError("Failed to load profile data. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, []);

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      setUpdating(true);
      setError(null);
      
      // Update user profile via /users/me/ endpoint
      await AxiosInstance.put("users/me/", editForm);
      setProfile(editForm);
      setSuccessMessage("Profile updated successfully!");
      
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
      setEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      setError(error.response?.data?.message || "Failed to update profile. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const getInitials = () => {
    if (profile.firstname && profile.lastname) {
      return `${profile.firstname[0]}${profile.lastname[0]}`.toUpperCase();
    }
    return profile.username?.[0]?.toUpperCase() || "U";
  };

  const getFullName = () => {
    const parts = [profile.firstname, profile.middlename, profile.lastname].filter(Boolean);
    return parts.join(" ") || profile.username;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not provided";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatAppointmentDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return "#4caf50";
      case "pending":
        return "#ff9800";
      case "cancelled":
        return "#f44336";
      case "completed":
        return "#2196f3";
      default:
        return "#9e9e9e";
    }
  };

  const getUpcomingAppointments = () => {
    const now = new Date();
    return appointments.filter(apt => new Date(apt.date) > now);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading profile...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Success Message */}
      {successMessage && (
        <div style={styles.successAlert}>
          <span>✓</span> {successMessage}
        </div>
      )}

      {/* Hero Section */}
      <div style={styles.heroSection}>
        <div style={styles.heroContent}>
          <div style={styles.avatarContainer}>
            <div style={styles.avatar}>
              {getInitials()}
            </div>
          </div>
          
          <div style={styles.heroInfo}>
            <h1 style={styles.heroName}>{getFullName()}</h1>
            <p style={styles.heroUsername}>@{profile.username}</p>
            <p style={styles.heroEmail}>{profile.email}</p>
            <button 
              style={styles.editButton}
              onClick={() => setEditDialogOpen(true)}
            >
              ✏️ Edit Profile
            </button>
          </div>
        </div>
      </div>

      <hr style={styles.divider} />

      {/* Additional Information Section */}
      <div style={styles.additionalInfo}>
        <h2 style={styles.sectionTitle}>Additional Information</h2>
        
        <div style={styles.gridContainer}>
          {/* Personal Details Card */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardIcon}>👤</span>
              <h3 style={styles.cardTitle}>Personal Details</h3>
            </div>
            <div style={styles.cardContent}>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Full Name:</span>
                <span style={styles.infoValue}>{getFullName()}</span>
              </div>
              {profile.middlename && (
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Middle Name:</span>
                  <span style={styles.infoValue}>{profile.middlename}</span>
                </div>
              )}
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Username:</span>
                <span style={styles.infoValue}>{profile.username}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Email:</span>
                <span style={styles.infoValue}>{profile.email}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Birthday:</span>
                <span style={styles.infoValue}>{formatDate(profile.birthday)}</span>
              </div>
            </div>
          </div>

          {/* Account Stats Card */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardIcon}>📊</span>
              <h3 style={styles.cardTitle}>Account Statistics</h3>
            </div>
            <div style={styles.cardContent}>
              <div style={styles.statsRow}>
                <div style={styles.statItem}>
                  <div style={styles.statNumber}>{appointments.length}</div>
                  <div style={styles.statLabel}>Total Appointments</div>
                </div>
                <div style={styles.statItem}>
                  <div style={styles.statNumber}>{getUpcomingAppointments().length}</div>
                  <div style={styles.statLabel}>Upcoming Appointments</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Appointments Section */}
        <div style={styles.appointmentsSection}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>📅</span>
            <h2 style={styles.sectionTitle}>My Appointments</h2>
          </div>
          
          {appointments.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyStateText}>No appointments found.</p>
            </div>
          ) : (
            <div style={styles.appointmentsList}>
              {appointments.map((appointment) => (
                <div key={appointment.id} style={styles.appointmentCard}>
                  <div style={styles.appointmentContent}>
                    <div style={styles.appointmentInfo}>
                      <h4 style={styles.appointmentTitle}>
                        {appointment.service || "Dental Appointment"}
                      </h4>
                      <p style={styles.appointmentDate}>
                        📅 {formatAppointmentDate(appointment.date)}
                      </p>
                      {appointment.location && (
                        <p style={styles.appointmentLocation}>
                          📍 {appointment.location}
                        </p>
                      )}
                      {appointment.notes && (
                        <p style={styles.appointmentNotes}>
                          📝 {appointment.notes}
                        </p>
                      )}
                    </div>
                    <div style={styles.appointmentStatus}>
                      <span 
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: getStatusColor(appointment.status)
                        }}
                      >
                        {appointment.status || "Scheduled"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editDialogOpen && (
        <div style={styles.modalOverlay} onClick={() => !updating && setEditDialogOpen(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Edit Profile</h2>
              <button 
                style={styles.closeButton}
                onClick={() => setEditDialogOpen(false)}
                disabled={updating}
              >
                ✕
              </button>
            </div>
            
            {error && (
              <div style={styles.errorAlert}>
                <span>⚠️</span> {error}
              </div>
            )}
            
            <div style={styles.modalContent}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Username</label>
                <input
                  type="text"
                  name="username"
                  value={editForm.username}
                  onChange={handleEditChange}
                  style={styles.formInput}
                  disabled={updating}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Email</label>
                <input
                  type="email"
                  name="email"
                  value={editForm.email}
                  onChange={handleEditChange}
                  style={styles.formInput}
                  disabled={updating}
                />
              </div>
              
              <div style={styles.formRow}>
                <div style={{...styles.formGroup, flex: 1}}>
                  <label style={styles.formLabel}>First Name</label>
                  <input
                    type="text"
                    name="firstname"
                    value={editForm.firstname || ""}
                    onChange={handleEditChange}
                    style={styles.formInput}
                    disabled={updating}
                  />
                </div>
                
                <div style={{...styles.formGroup, flex: 1}}>
                  <label style={styles.formLabel}>Middle Name</label>
                  <input
                    type="text"
                    name="middlename"
                    value={editForm.middlename || ""}
                    onChange={handleEditChange}
                    style={styles.formInput}
                    disabled={updating}
                  />
                </div>
                
                <div style={{...styles.formGroup, flex: 1}}>
                  <label style={styles.formLabel}>Last Name</label>
                  <input
                    type="text"
                    name="lastname"
                    value={editForm.lastname || ""}
                    onChange={handleEditChange}
                    style={styles.formInput}
                    disabled={updating}
                  />
                </div>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Birthday</label>
                <input
                  type="date"
                  name="birthday"
                  value={editForm.birthday || ""}
                  onChange={handleEditChange}
                  style={styles.formInput}
                  disabled={updating}
                />
              </div>
            </div>
            
            <div style={styles.modalFooter}>
              <button 
                style={styles.cancelButton}
                onClick={() => setEditDialogOpen(false)}
                disabled={updating}
              >
                Cancel
              </button>
              <button 
                style={styles.saveButton}
                onClick={handleSave}
                disabled={updating}
              >
                {updating ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Internal CSS Styles
const styles = {
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "24px",
    fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif",
  },
  
  // Loading States
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
  
  // Alert Messages
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
    gap: "10px",
  },
  
  // Hero Section
  heroSection: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    borderRadius: "16px",
    padding: "48px 32px",
    marginBottom: "24px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
  },
  heroContent: {
    display: "flex",
    alignItems: "center",
    gap: "32px",
    flexWrap: "wrap",
  },
  avatarContainer: {
    flexShrink: 0,
  },
  avatar: {
    width: "120px",
    height: "120px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "48px",
    fontWeight: "bold",
    color: "white",
    border: "4px solid white",
    boxShadow: "0 8px 16px rgba(0,0,0,0.2)",
  },
  heroInfo: {
    flex: 1,
  },
  heroName: {
    color: "white",
    fontSize: "32px",
    fontWeight: "600",
    margin: "0 0 8px 0",
  },
  heroUsername: {
    color: "rgba(255,255,255,0.9)",
    fontSize: "16px",
    margin: "0 0 4px 0",
  },
  heroEmail: {
    color: "rgba(255,255,255,0.8)",
    fontSize: "14px",
    margin: "0 0 16px 0",
  },
  editButton: {
    backgroundColor: "white",
    color: "#667eea",
    border: "none",
    padding: "10px 24px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "transform 0.2s, box-shadow 0.2s",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },
  
  // Divider
  divider: {
    margin: "32px 0",
    background: "linear-gradient(to right, transparent, #667eea, #764ba2, transparent)",
    height: "2px",
    border: "none",
  },
  
  // Additional Info Section
  additionalInfo: {
    padding: "0",
  },
  sectionTitle: {
    color: "#333",
    fontSize: "24px",
    fontWeight: "600",
    marginBottom: "24px",
    paddingBottom: "12px",
    borderBottom: "3px solid #667eea",
    display: "inline-block",
  },
  gridContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "24px",
    marginBottom: "32px",
  },
  
  // Cards
  card: {
    backgroundColor: "white",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    overflow: "hidden",
    transition: "transform 0.2s, box-shadow 0.2s",
    cursor: "pointer",
  },
  cardHeader: {
    backgroundColor: "#f8f9fa",
    padding: "16px 20px",
    borderBottom: "1px solid #e0e0e0",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  cardIcon: {
    fontSize: "24px",
  },
  cardTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "600",
    color: "#333",
  },
  cardContent: {
    padding: "20px",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #f0f0f0",
  },
  infoLabel: {
    fontWeight: "600",
    color: "#666",
    fontSize: "14px",
  },
  infoValue: {
    color: "#333",
    fontSize: "14px",
  },
  statsRow: {
    display: "flex",
    justifyContent: "space-around",
    gap: "20px",
  },
  statItem: {
    textAlign: "center",
  },
  statNumber: {
    fontSize: "32px",
    fontWeight: "bold",
    color: "#667eea",
  },
  statLabel: {
    fontSize: "12px",
    color: "#666",
    marginTop: "4px",
  },
  
  // Appointments Section
  appointmentsSection: {
    marginTop: "32px",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
  },
  sectionIcon: {
    fontSize: "28px",
  },
  appointmentsList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  appointmentCard: {
    backgroundColor: "white",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    padding: "20px",
    transition: "transform 0.2s",
  },
  appointmentContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentTitle: {
    margin: "0 0 8px 0",
    fontSize: "16px",
    fontWeight: "600",
    color: "#333",
  },
  appointmentDate: {
    margin: "4px 0",
    fontSize: "14px",
    color: "#666",
  },
  appointmentLocation: {
    margin: "4px 0",
    fontSize: "14px",
    color: "#666",
  },
  appointmentNotes: {
    margin: "4px 0",
    fontSize: "14px",
    color: "#888",
    fontStyle: "italic",
  },
  appointmentStatus: {
    flexShrink: 0,
  },
  statusBadge: {
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
    color: "white",
    display: "inline-block",
  },
  emptyState: {
    textAlign: "center",
    padding: "48px",
    backgroundColor: "#f8f9fa",
    borderRadius: "12px",
  },
  emptyStateText: {
    color: "#999",
    fontSize: "16px",
  },
  
  // Modal
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
    transition: "background-color 0.2s",
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
  
  // Form Elements
  formGroup: {
    marginBottom: "20px",
  },
  formRow: {
    display: "flex",
    gap: "16px",
    marginBottom: "20px",
  },
  formLabel: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "600",
    color: "#333",
    fontSize: "14px",
  },
  formInput: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "14px",
    transition: "border-color 0.2s",
    boxSizing: "border-box",
  },
  cancelButton: {
    backgroundColor: "#f8f9fa",
    color: "#666",
    border: "1px solid #ddd",
    padding: "10px 20px",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  saveButton: {
    backgroundColor: "#667eea",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
};

// Add keyframe animations to the document
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
  
  input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
  
  .MuiCard-root:hover,
  .appointment-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  }
`;
document.head.appendChild(styleSheet);

export default Profile;