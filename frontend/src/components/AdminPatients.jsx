import React, { useState, useEffect } from "react";
import "./style/AdminPatients.css";
import AxiosInstance from "./AxiosInstance";

export default function AdminPatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [treatmentHistory, setTreatmentHistory] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    blood_type: "",
    allergies: "",
    medical_conditions: "",
    current_medications: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relation: "",
    dental_insurance_provider: "",
    insurance_id: ""
  });

  const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const response = await AxiosInstance.get("users/");
      setPatients(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching patients:", error);
      showToast("Failed to load patients", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientRecord = async (userId) => {
    try {
      const response = await AxiosInstance.get(`patient-records/${userId}/`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error("Error fetching patient record:", error);
      return null;
    }
  };

  const fetchTreatmentHistory = async (userId) => {
    try {
      const response = await AxiosInstance.get(`treatment-history/patient_history/?user_id=${userId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching treatment history:", error);
      return [];
    }
  };

  const handleViewPatient = async (patient) => {
    setSelectedPatient(patient);
    const record = await fetchPatientRecord(patient.id);
    if (record) {
      setEditFormData({
        blood_type: record.blood_type || "",
        allergies: record.allergies || "",
        medical_conditions: record.medical_conditions || "",
        current_medications: record.current_medications || "",
        emergency_contact_name: record.emergency_contact_name || "",
        emergency_contact_phone: record.emergency_contact_phone || "",
        emergency_contact_relation: record.emergency_contact_relation || "",
        dental_insurance_provider: record.dental_insurance_provider || "",
        insurance_id: record.insurance_id || ""
      });
    } else {
      setEditFormData({
        blood_type: "",
        allergies: "",
        medical_conditions: "",
        current_medications: "",
        emergency_contact_name: "",
        emergency_contact_phone: "",
        emergency_contact_relation: "",
        dental_insurance_provider: "",
        insurance_id: ""
      });
    }
    setShowModal(true);
  };

  const handleEditPatient = async (patient) => {
    setSelectedPatient(patient);
    const record = await fetchPatientRecord(patient.id);
    if (record) {
      setEditFormData({
        blood_type: record.blood_type || "",
        allergies: record.allergies || "",
        medical_conditions: record.medical_conditions || "",
        current_medications: record.current_medications || "",
        emergency_contact_name: record.emergency_contact_name || "",
        emergency_contact_phone: record.emergency_contact_phone || "",
        emergency_contact_relation: record.emergency_contact_relation || "",
        dental_insurance_provider: record.dental_insurance_provider || "",
        insurance_id: record.insurance_id || ""
      });
    }
    setShowEditModal(true);
  };

  const handleViewHistory = async (patient) => {
    setSelectedPatient(patient);
    const history = await fetchTreatmentHistory(patient.id);
    setTreatmentHistory(history);
    setShowHistoryModal(true);
  };

  const handleSaveRecord = async () => {
    try {
      const recordData = {
        user: selectedPatient.id,
        ...editFormData
      };
      
      await AxiosInstance.post("patient-records/", recordData);
      showToast("Patient record saved successfully!", "success");
      setShowEditModal(false);
      setShowModal(false);
    } catch (error) {
      console.error("Error saving patient record:", error);
      showToast("Failed to save patient record", "error");
    }
  };

  const filteredPatients = patients.filter(patient => 
    patient.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchPatients();
  }, []);

  return (
    <div className="admin-patients">
      {/* Animated Background */}
      <div className="admin-patients-bg">
        <div className="bg-circle bg-circle-1"></div>
        <div className="bg-circle bg-circle-2"></div>
        <div className="bg-circle bg-circle-3"></div>
        <div className="bg-circle bg-circle-4"></div>
        <div className="bg-circle bg-circle-5"></div>
        <div className="bg-circle bg-circle-6"></div>
      </div>

      <div className="admin-patients-container">
        {/* Header */}
        <div className="patients-header">
          <div className="header-left">
            <h1><i className="fas fa-users"></i> Patient Management</h1>
            <p>View and manage all patient records, medical history, and appointments</p>
          </div>
          <div className="header-right">
            <div className="stats-badge">
              <i className="fas fa-user-plus"></i>
              <span>{patients.length} Total Patients</span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-section">
          <div className="search-wrapper">
            <i className="fas fa-search search-icon"></i>
            <input
              type="text"
              placeholder="Search by username or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button className="clear-search" onClick={() => setSearchTerm("")}>
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        </div>

        {/* Patients Table */}
        <div className="patients-table-container">
          {loading ? (
            <div className="loading-state">
              <i className="fas fa-spinner fa-pulse"></i>
              <p>Loading patients...</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-user-slash"></i>
              <p>No patients found</p>
              {searchTerm && <p className="empty-subtext">Try a different search term</p>}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="patients-table">
                <thead>
                  <tr>
                    <th><i className="fas fa-user"></i> Username</th>
                    <th><i className="fas fa-envelope"></i> Email</th>
                    <th><i className="fas fa-calendar-alt"></i> Joined</th>
                    <th><i className="fas fa-user-md"></i> Status</th>
                    <th><i className="fas fa-cogs"></i> Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((patient) => (
                    <tr key={patient.id} className="patient-row">
                      <td className="patient-name">
                        <div className="avatar">
                          <i className="fas fa-user-circle"></i>
                        </div>
                        <span>{patient.username}</span>
                      </td>
                      <td>{patient.email}</td>
                      <td>{new Date(patient.date_joined).toLocaleDateString()}</td>
                      <td>
                        <span className="status-badge active">
                          <i className="fas fa-circle"></i> Active
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="action-btn view-btn"
                            onClick={() => handleViewPatient(patient)}
                            title="View Details"
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                          <button 
                            className="action-btn edit-btn"
                            onClick={() => handleEditPatient(patient)}
                            title="Edit Medical Record"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button 
                            className="action-btn history-btn"
                            onClick={() => handleViewHistory(patient)}
                            title="View Treatment History"
                          >
                            <i className="fas fa-history"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* View Patient Modal */}
      {showModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-user-circle"></i> {selectedPatient.username}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="info-section">
                <h3><i className="fas fa-id-card"></i> Basic Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Username:</label>
                    <span>{selectedPatient.username}</span>
                  </div>
                  <div className="info-item">
                    <label>Email:</label>
                    <span>{selectedPatient.email}</span>
                  </div>
                  <div className="info-item">
                    <label>User ID:</label>
                    <span>#{selectedPatient.id}</span>
                  </div>
                  <div className="info-item">
                    <label>Joined:</label>
                    <span>{new Date(selectedPatient.date_joined).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="info-section">
                <h3><i className="fas fa-notes-medical"></i> Medical Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Blood Type:</label>
                    <span>{editFormData.blood_type || "Not specified"}</span>
                  </div>
                  <div className="info-item">
                    <label>Allergies:</label>
                    <span>{editFormData.allergies || "None"}</span>
                  </div>
                  <div className="info-item">
                    <label>Medical Conditions:</label>
                    <span>{editFormData.medical_conditions || "None"}</span>
                  </div>
                  <div className="info-item">
                    <label>Current Medications:</label>
                    <span>{editFormData.current_medications || "None"}</span>
                  </div>
                </div>
              </div>

              <div className="info-section">
                <h3><i className="fas fa-phone-alt"></i> Emergency Contact</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Name:</label>
                    <span>{editFormData.emergency_contact_name || "Not specified"}</span>
                  </div>
                  <div className="info-item">
                    <label>Phone:</label>
                    <span>{editFormData.emergency_contact_phone || "Not specified"}</span>
                  </div>
                  <div className="info-item">
                    <label>Relationship:</label>
                    <span>{editFormData.emergency_contact_relation || "Not specified"}</span>
                  </div>
                </div>
              </div>

              <div className="info-section">
                <h3><i className="fas fa-file-invoice-dollar"></i> Insurance Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Provider:</label>
                    <span>{editFormData.dental_insurance_provider || "Not specified"}</span>
                  </div>
                  <div className="info-item">
                    <label>Insurance ID:</label>
                    <span>{editFormData.insurance_id || "Not specified"}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Close</button>
              <button className="btn-primary" onClick={() => {
                setShowModal(false);
                handleEditPatient(selectedPatient);
              }}>
                <i className="fas fa-edit"></i> Edit Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      {showEditModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-edit"></i> Edit Medical Record - {selectedPatient.username}</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="edit-form">
                <div className="form-section">
                  <h3><i className="fas fa-tint"></i> Blood Type</h3>
                  <select 
                    value={editFormData.blood_type} 
                    onChange={(e) => setEditFormData({...editFormData, blood_type: e.target.value})}
                    className="form-select"
                  >
                    <option value="">Select Blood Type</option>
                    {BLOOD_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="form-section">
                  <h3><i className="fas fa-allergies"></i> Allergies</h3>
                  <textarea 
                    value={editFormData.allergies} 
                    onChange={(e) => setEditFormData({...editFormData, allergies: e.target.value})}
                    placeholder="List any allergies (medications, latex, foods, etc.)"
                    rows="3"
                    className="form-textarea"
                  />
                </div>

                <div className="form-section">
                  <h3><i className="fas fa-heartbeat"></i> Medical Conditions</h3>
                  <textarea 
                    value={editFormData.medical_conditions} 
                    onChange={(e) => setEditFormData({...editFormData, medical_conditions: e.target.value})}
                    placeholder="List any medical conditions (diabetes, hypertension, heart disease, etc.)"
                    rows="3"
                    className="form-textarea"
                  />
                </div>

                <div className="form-section">
                  <h3><i className="fas fa-capsules"></i> Current Medications</h3>
                  <textarea 
                    value={editFormData.current_medications} 
                    onChange={(e) => setEditFormData({...editFormData, current_medications: e.target.value})}
                    placeholder="List current medications and dosages"
                    rows="2"
                    className="form-textarea"
                  />
                </div>

                <div className="form-grid">
                  <div className="form-section">
                    <h3><i className="fas fa-user-friends"></i> Emergency Contact Name</h3>
                    <input 
                      type="text" 
                      value={editFormData.emergency_contact_name} 
                      onChange={(e) => setEditFormData({...editFormData, emergency_contact_name: e.target.value})}
                      placeholder="Full name"
                      className="form-input"
                    />
                  </div>

                  <div className="form-section">
                    <h3><i className="fas fa-phone"></i> Emergency Contact Phone</h3>
                    <input 
                      type="tel" 
                      value={editFormData.emergency_contact_phone} 
                      onChange={(e) => setEditFormData({...editFormData, emergency_contact_phone: e.target.value})}
                      placeholder="Phone number"
                      className="form-input"
                    />
                  </div>

                  <div className="form-section">
                    <h3><i className="fas fa-handshake"></i> Relationship</h3>
                    <input 
                      type="text" 
                      value={editFormData.emergency_contact_relation} 
                      onChange={(e) => setEditFormData({...editFormData, emergency_contact_relation: e.target.value})}
                      placeholder="e.g., Spouse, Parent, Sibling"
                      className="form-input"
                    />
                  </div>

                  <div className="form-section">
                    <h3><i className="fas fa-building"></i> Dental Insurance Provider</h3>
                    <input 
                      type="text" 
                      value={editFormData.dental_insurance_provider} 
                      onChange={(e) => setEditFormData({...editFormData, dental_insurance_provider: e.target.value})}
                      placeholder="Insurance company name"
                      className="form-input"
                    />
                  </div>

                  <div className="form-section">
                    <h3><i className="fas fa-id-card"></i> Insurance ID</h3>
                    <input 
                      type="text" 
                      value={editFormData.insurance_id} 
                      onChange={(e) => setEditFormData({...editFormData, insurance_id: e.target.value})}
                      placeholder="Insurance policy number"
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveRecord}>
                <i className="fas fa-save"></i> Save Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Treatment History Modal */}
      {showHistoryModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-history"></i> Treatment History - {selectedPatient.username}</h2>
              <button className="modal-close" onClick={() => setShowHistoryModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              {treatmentHistory.length === 0 ? (
                <div className="empty-history">
                  <i className="fas fa-notes-medical"></i>
                  <p>No treatment history found for this patient.</p>
                </div>
              ) : (
                <div className="history-list">
                  {treatmentHistory.map((treatment, idx) => (
                    <div key={idx} className="history-item">
                      <div className="history-header">
                        <span className="history-date">
                          <i className="fas fa-calendar"></i> {new Date(treatment.treatment_date).toLocaleDateString()}
                        </span>
                        <span className={`history-status ${treatment.payment_status}`}>
                          {treatment.payment_status === 'paid' ? 'Paid' : treatment.payment_status === 'partial' ? 'Partial' : 'Pending'}
                        </span>
                      </div>
                      <div className="history-details">
                        <div className="history-procedure">
                          <i className="fas fa-stethoscope"></i> {treatment.treatment_type?.replace('_', ' ').toUpperCase()}
                        </div>
                        {treatment.dentist_notes && (
                          <div className="history-notes">
                            <i className="fas fa-comment"></i> {treatment.dentist_notes}
                          </div>
                        )}
                        <div className="history-cost">
                          <div><i className="fas fa-tag"></i> Cost: ₱{parseFloat(treatment.cost).toLocaleString()}</div>
                          <div><i className="fas fa-money-bill"></i> Paid: ₱{parseFloat(treatment.paid_amount).toLocaleString()}</div>
                          <div><i className="fas fa-balance-scale"></i> Balance: ₱{parseFloat(treatment.balance).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowHistoryModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast-msg toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}