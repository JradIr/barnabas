import React, { useState, useEffect, useCallback } from "react";
import AxiosInstance from "./AxiosInstance";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

export default function AppointmentScheduler({ role = "client" }) {
  // State Management
  const [appointments, setAppointments] = useState([]);
  const [myAppointment, setMyAppointment] = useState(null);
  const [waitlistEntries, setWaitlistEntries] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [billingRecords, setBillingRecords] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedProcedures, setSelectedProcedures] = useState([]);
  const [description, setDescription] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [pencilReservations, setPencilReservations] = useState({});
  const [tempBooking, setTempBooking] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [countdownTimer, setCountdownTimer] = useState(null);
  const [activeTab, setActiveTab] = useState("appointment");
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleData, setRescheduleData] = useState(null);
  const [rescheduleSlots, setRescheduleSlots] = useState([]);

  // Constants
  const CLINIC_OPEN = 9;
  const CLINIC_CLOSE = 18;
  const LUNCH_START = 12;
  const LUNCH_END = 13;
  const DAILY_LIMIT = 10;
  const NO_SHOW_FEE = 300;
  const PENCIL_BOOKING_HOURS = 8;
  const MAX_PER_SLOT = 2;

  const PROCEDURES = [
    { id: "cleaning", name: "Teeth Cleaning", duration: 60, price: 1000, icon: "fa-tooth" },
    { id: "filling", name: "Dental Filling", duration: 60, price: 1000, icon: "fa-fill-drip" },
    { id: "extraction", name: "Tooth Extraction", duration: 60, price: 1000, icon: "fa-teeth" },
    { id: "braces", name: "Braces/Orthodontics", duration: 180, price: 50000, icon: "fa-smile" }
  ];

  // All possible time slots in 24-hour format
  const ALL_SLOTS_24H = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30'
  ];

  // Helper: Convert 24h to AM/PM
  const toAmPm = (time24h) => {
    const [hour, minute] = time24h.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
  };

  const getTotalDuration = () => {
    return selectedProcedures.reduce((sum, p) => sum + p.duration, 0);
  };

  const getTotalPrice = () => {
    return selectedProcedures.reduce((sum, p) => sum + p.price, 0);
  };

  const getProcedureNames = () => {
    return selectedProcedures.map(p => p.name).join(", ");
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const addNotification = (message, type = "info") => {
    const newNotification = {
      id: Date.now(),
      message,
      type,
      created_at: new Date().toISOString(),
      title: type === "info" ? "Information" : "Warning",
      notification_type: type === "info" ? "appointment_reminder" : "alert"
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 10));
    showToast(message, type);
  };

  const fetchData = useCallback(async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const [appointmentsRes, myAppointmentsRes, waitlistRes, notificationsRes, billingRes] = await Promise.all([
        AxiosInstance.get("appointments/"),
        AxiosInstance.get("appointments/", { params: { user_id: user?.id } }),
        AxiosInstance.get("appointments/waitlist_status/"),
        AxiosInstance.get("notifications/"),
        AxiosInstance.get("billing/")
      ]);
      
      setAppointments(Array.isArray(appointmentsRes.data) ? appointmentsRes.data : []);
      const myApps = Array.isArray(myAppointmentsRes.data) ? myAppointmentsRes.data : [];
      const activeApp = myApps.find(a => a && !["completed", "cancelled"].includes(a.status));
      setMyAppointment(activeApp || null);
      
      const waitlistData = waitlistRes.data?.waitlists || waitlistRes.data?.waitlist_entries || [];
      setWaitlistEntries(waitlistData);
      setNotifications(Array.isArray(notificationsRes.data?.notifications) ? notificationsRes.data.notifications : []);
      setBillingRecords(Array.isArray(billingRes.data) ? billingRes.data : []);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (selectedDate && selectedProcedures.length > 0) {
      generateAvailableSlots();
    }
  }, [selectedDate, selectedProcedures, appointments]);

  useEffect(() => {
    if (tempBooking) {
      startCountdown();
    }
    return () => {
      if (countdownTimer) clearInterval(countdownTimer);
    };
  }, [tempBooking]);

  const startCountdown = () => {
    if (countdownTimer) clearInterval(countdownTimer);
    const timer = setInterval(() => {
      if (!tempBooking) {
        clearInterval(timer);
        return;
      }
      const remaining = tempBooking.expiresAt - Date.now();
      if (remaining <= 0) {
        clearInterval(timer);
        handleExpiredTempBooking();
      }
    }, 1000);
    setCountdownTimer(timer);
  };

  const handleExpiredTempBooking = () => {
    addNotification("Temporary booking expired! Slot released.", "warning");
    setTempBooking(null);
    if (selectedDate) generateAvailableSlots();
  };

  // Get booked appointments for the selected date
  const getBookedSlotsForDate = (date = selectedDate) => {
    const dateAppointments = appointments.filter(apt => apt.date === date);
    const bookedCount = {};
    
    dateAppointments.forEach(apt => {
      const time24h = apt.time?.substring(0, 5) || apt.time;
      bookedCount[time24h] = (bookedCount[time24h] || 0) + 1;
    });
    
    return bookedCount;
  };

  // Check if daily limit is reached for a specific date
  const isDailyLimitReached = (date = selectedDate) => {
    const dateAppointments = appointments.filter(apt => 
      apt.date === date && ['confirmed', 'pending'].includes(apt.status)
    );
    return dateAppointments.length >= DAILY_LIMIT;
  };

  // Check if a specific time slot is available
  const isSlotAvailable = (slotTime24h, bookedCount) => {
    const count = bookedCount[slotTime24h] || 0;
    return count < MAX_PER_SLOT;
  };

  // Check if slot crosses lunch break
  const crossesLunchBreak = (startHour, endHour) => {
    return startHour < LUNCH_END && endHour > LUNCH_START;
  };

  // Check if slot fits within clinic hours
  const fitsInClinicHours = (endHour, endMinute) => {
    return !(endHour > CLINIC_CLOSE || (endHour === CLINIC_CLOSE && endMinute > 0));
  };

  // Check if user has any active appointment
  const hasActiveAppointment = () => {
    return !!(tempBooking || confirmedBooking || myAppointment);
  };

  // Generate available slots
  const generateAvailableSlots = (date = selectedDate, procedures = selectedProcedures) => {
    if (!date || procedures.length === 0) return [];
    
    const totalDuration = procedures.reduce((sum, p) => sum + p.duration, 0);
    const bookedCount = getBookedSlotsForDate(date);
    const dailyFull = isDailyLimitReached(date);
    
    const generatedSlots = [];
    
    for (const slotTime24h of ALL_SLOTS_24H) {
      const [slotHour, slotMinute] = slotTime24h.split(':').map(Number);
      
      let endMinute = slotMinute + totalDuration;
      let endHour = slotHour + Math.floor(endMinute / 60);
      endMinute = endMinute % 60;
      
      if (!fitsInClinicHours(endHour, endMinute)) continue;
      if (crossesLunchBreak(slotHour, endHour)) continue;
      
      const isBooked = !isSlotAvailable(slotTime24h, bookedCount);
      const isPenciled = pencilReservations[`${date}_${slotTime24h}`] === true;
      const isMyPencil = pencilReservations[`${date}_${slotTime24h}`] === "mine";
      
      generatedSlots.push({
        slotId: `${date}_${slotTime24h}`,
        time: toAmPm(slotTime24h),
        endTime: toAmPm(`${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`),
        timeValue: `${slotHour.toString().padStart(2, '0')}:${slotMinute.toString().padStart(2, '0')}:00`,
        startHour: slotHour,
        startMinute: slotMinute,
        endHour: endHour,
        endMinute: endMinute,
        duration: totalDuration,
        isBooked: isBooked && !isPenciled && !isMyPencil,
        isPenciled: isPenciled,
        isMyPencil: isMyPencil,
        isFull: dailyFull
      });
    }
    
    return generatedSlots;
  };

  const handleDateSelect = (date) => {
    const formattedDate = date.toISOString().split('T')[0];
    setSelectedDate(formattedDate);
    showToast("Date selected! Now choose your procedures.", "info");
  };

  const toggleProcedure = (procedure) => {
    setSelectedProcedures(prev => {
      const exists = prev.find(p => p.id === procedure.id);
      if (exists) {
        return prev.filter(p => p.id !== procedure.id);
      } else {
        return [...prev, procedure];
      }
    });
  };

  const handleBookNow = async (slot) => {
    // Check if user already has an appointment
    if (hasActiveAppointment()) {
      addNotification("You already have an active booking. Cancel or reschedule it first.", "warning");
      return;
    }
    if (slot.isFull) {
      addNotification("Daily patient limit reached. Please join the waiting list.", "warning");
      return;
    }
    if (slot.isBooked) {
      addNotification("This time slot is already booked", "warning");
      return;
    }
    
    setLoading(true);
    try {
      const requestData = {
        date: selectedDate,
        time: slot.timeValue,
        service: getProcedureNames(),
        other_concern: description,
        total_price: getTotalPrice(),
        total_duration: getTotalDuration()
      };
      
      await AxiosInstance.post("appointments/", requestData);
      showToast("Appointment booked successfully!", "success");
      
      const billingRecord = {
        procedure: getProcedureNames(),
        total: getTotalPrice(),
        paid: getTotalPrice(),
        balance: 0,
        date: new Date().toLocaleDateString(),
        status: "Paid"
      };
      setBillingRecords(prev => [billingRecord, ...prev]);
      
      setConfirmedBooking({
        id: Date.now(),
        slotId: slot.slotId,
        date: selectedDate,
        time: slot.time,
        procedure: getProcedureNames(),
        description: description,
        price: getTotalPrice(),
        createdAt: Date.now()
      });
      
      setSelectedProcedures([]);
      setDescription("");
      await fetchData();
      generateAvailableSlots();
      
      addNotification(`Payment of ₱${getTotalPrice().toLocaleString()} confirmed! Appointment is now BOOKED.`, "success");
    } catch (error) {
      console.error("Booking error:", error);
      showToast(error.response?.data?.error || "Error booking appointment", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTempBooking = (slot) => {
    if (hasActiveAppointment()) {
      addNotification("You already have an active booking. Cancel or reschedule it first.", "warning");
      return;
    }
    if (slot.isFull) {
      addNotification("Daily limit reached. Join waiting list instead.", "warning");
      return;
    }
    if (slot.isBooked) {
      addNotification("This time slot is already booked", "warning");
      return;
    }
    
    const expiresAt = Date.now() + (PENCIL_BOOKING_HOURS * 60 * 60 * 1000);
    
    setPencilReservations(prev => ({
      ...prev,
      [`${selectedDate}_${slot.timeValue.substring(0, 5)}`]: "mine"
    }));
    
    setTempBooking({
      slotId: slot.slotId,
      date: selectedDate,
      time: slot.time,
      timeValue: slot.timeValue,
      procedure: getProcedureNames(),
      description: description,
      price: getTotalPrice(),
      expiresAt: expiresAt,
      procedures: [...selectedProcedures]
    });
    
    addNotification(`Temporary booking created for ${getProcedureNames()} on ${selectedDate} at ${slot.time}. You have 8 hours to complete payment.`, "info");
  };

  const handlePayTempBooking = async () => {
    if (!tempBooking) return;
    setLoading(true);
    try {
      const requestData = {
        date: tempBooking.date,
        time: tempBooking.timeValue,
        service: tempBooking.procedure,
        other_concern: tempBooking.description,
        total_price: tempBooking.price,
        total_duration: getTotalDuration()
      };
      
      await AxiosInstance.post("appointments/", requestData);
      showToast("Payment confirmed! Appointment booked.", "success");
      
      const billingRecord = {
        procedure: tempBooking.procedure,
        total: tempBooking.price,
        paid: tempBooking.price,
        balance: 0,
        date: new Date().toLocaleDateString(),
        status: "Paid"
      };
      setBillingRecords(prev => [billingRecord, ...prev]);
      
      setConfirmedBooking({ ...tempBooking, createdAt: Date.now() });
      setTempBooking(null);
      setSelectedProcedures([]);
      setDescription("");
      await fetchData();
      generateAvailableSlots();
      
      addNotification(`Appointment confirmed! Please arrive on time.`, "success");
    } catch (error) {
      showToast(error.response?.data?.error || "Error confirming booking", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTempBooking = () => {
    if (!tempBooking) return;
    setPencilReservations(prev => {
      const newPrev = { ...prev };
      delete newPrev[`${tempBooking.date}_${tempBooking.timeValue.substring(0, 5)}`];
      return newPrev;
    });
    setTempBooking(null);
    addNotification("Temporary booking cancelled. Slot released.", "info");
  };

  // Check if cancellation is allowed (not same day after payment)
  const isCancellationAllowed = (booking) => {
    if (!booking) return false;
    const bookingDate = new Date(booking.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // If booking is for today, don't allow cancellation
    if (bookingDate.getTime() === today.getTime()) {
      return false;
    }
    return true;
  };

  const handleCancelConfirmedBooking = async () => {
    if (!confirmedBooking) return;
    
    // Check if cancellation is allowed
    if (!isCancellationAllowed(confirmedBooking)) {
      addNotification("Cannot cancel appointment on the same day after payment. Please contact the clinic.", "warning");
      return;
    }
    
    setLoading(true);
    try {
      const hoursSinceBooking = (Date.now() - confirmedBooking.createdAt) / (1000 * 60 * 60);
      const applyNoShowFee = hoursSinceBooking <= 8;
      
      const appointmentToCancel = appointments.find(a => 
        a.date === confirmedBooking.date && a.service === confirmedBooking.procedure
      );
      
      if (appointmentToCancel) {
        await AxiosInstance.delete(`appointments/${appointmentToCancel.id}/`);
      }
      
      if (applyNoShowFee) {
        const feeRecord = {
          procedure: "No-Show Fee",
          total: NO_SHOW_FEE,
          paid: 0,
          balance: NO_SHOW_FEE,
          date: new Date().toLocaleDateString(),
          status: "Unpaid",
          notes: `Applied for cancellation of ${confirmedBooking.procedure} within 8 hours`
        };
        setBillingRecords(prev => [feeRecord, ...prev]);
        addNotification(`Cancellation within 8 hours. ₱${NO_SHOW_FEE} no-show fee has been added.`, "warning");
      } else {
        addNotification("Appointment cancelled successfully", "success");
      }
      
      setConfirmedBooking(null);
      await fetchData();
      generateAvailableSlots();
    } catch (error) {
      console.error("Cancel error:", error);
      showToast("Error cancelling appointment", "error");
    } finally {
      setLoading(false);
    }
  };

  // Reschedule Functions
  const openRescheduleModal = () => {
    const currentBooking = confirmedBooking || myAppointment;
    if (!currentBooking) return;
    
    // Check if rescheduling is allowed
    if (!isCancellationAllowed(currentBooking)) {
      addNotification("Cannot reschedule appointment on the same day after payment. Please contact the clinic.", "warning");
      return;
    }
    
    setRescheduleData(currentBooking);
    setShowRescheduleModal(true);
    // Generate slots for the next 7 days
    generateRescheduleSlots();
  };

  const generateRescheduleSlots = () => {
    const slots = [];
    const today = new Date();
    
    for (let i = 1; i <= 7; i++) {
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + i);
      const dateStr = futureDate.toISOString().split('T')[0];
      
      // Skip Sundays
      if (futureDate.getDay() === 0) continue;
      
      const bookedCount = getBookedSlotsForDate(dateStr);
      const dailyFull = isDailyLimitReached(dateStr);
      
      if (dailyFull) continue;
      
      for (const slotTime24h of ALL_SLOTS_24H) {
        const [slotHour, slotMinute] = slotTime24h.split(':').map(Number);
        
        // Use the duration from the original booking
        const totalDuration = rescheduleData?.duration || 60;
        let endMinute = slotMinute + totalDuration;
        let endHour = slotHour + Math.floor(endMinute / 60);
        endMinute = endMinute % 60;
        
        if (!fitsInClinicHours(endHour, endMinute)) continue;
        if (crossesLunchBreak(slotHour, endHour)) continue;
        
        const isBooked = !isSlotAvailable(slotTime24h, bookedCount);
        
        if (!isBooked) {
          slots.push({
            date: dateStr,
            time: toAmPm(slotTime24h),
            endTime: toAmPm(`${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`),
            timeValue: `${slotHour.toString().padStart(2, '0')}:${slotMinute.toString().padStart(2, '0')}:00`,
            duration: totalDuration
          });
        }
      }
    }
    
    setRescheduleSlots(slots);
  };

  const handleReschedule = async (newSlot) => {
    if (!rescheduleData) return;
    
    setLoading(true);
    try {
      // Cancel old appointment
      const appointmentToCancel = appointments.find(a => 
        a.date === rescheduleData.date && a.service === rescheduleData.procedure
      );
      
      if (appointmentToCancel) {
        await AxiosInstance.delete(`appointments/${appointmentToCancel.id}/`);
      }
      
      // Create new appointment
      const requestData = {
        date: newSlot.date,
        time: newSlot.timeValue,
        service: rescheduleData.procedure,
        other_concern: rescheduleData.description || "",
        total_price: rescheduleData.price,
        total_duration: newSlot.duration
      };
      
      await AxiosInstance.post("appointments/", requestData);
      
      addNotification(`Appointment rescheduled to ${newSlot.date} at ${newSlot.time}`, "success");
      
      // Update state
      setConfirmedBooking({
        ...rescheduleData,
        date: newSlot.date,
        time: newSlot.time,
        slotId: `${newSlot.date}_${newSlot.timeValue.substring(0, 5)}`
      });
      
      setShowRescheduleModal(false);
      setRescheduleData(null);
      await fetchData();
      generateAvailableSlots();
    } catch (error) {
      console.error("Reschedule error:", error);
      showToast(error.response?.data?.error || "Error rescheduling appointment", "error");
    } finally {
      setLoading(false);
    }
  };

  const joinWaitlist = async () => {
    // Don't allow waitlist if user has an active appointment
    if (hasActiveAppointment()) {
      addNotification("You already have an active appointment. Cannot join waiting list.", "warning");
      return;
    }
    
    if (!selectedDate) {
      showToast("Please select a date first", "warning");
      return;
    }
    if (selectedProcedures.length === 0) {
      showToast("Please select at least one procedure first", "warning");
      return;
    }
    
    setLoading(true);
    try {
      const requestData = {
        preferred_date: selectedDate,
        time_start: "09:00",
        time_end: "17:00",
        service: getProcedureNames(),
        description: description,
        urgency_level: 2
      };
      
      await AxiosInstance.post("appointments/join_waitlist/", requestData);
      showToast("Added to waitlist successfully!", "success");
      await fetchData();
    } catch (error) {
      console.error("Waitlist error:", error);
      showToast(error.response?.data?.error || "Error joining waitlist", "error");
    } finally {
      setLoading(false);
    }
  };

  const cancelWaitlist = async (entryId) => {
    setLoading(true);
    try {
      await AxiosInstance.delete(`waitlist/${entryId}/`);
      showToast("Removed from waitlist", "success");
      await fetchData();
    } catch (error) {
      console.error("Cancel waitlist error:", error);
      showToast("Error removing from waitlist", "error");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = { confirmed: '#4caf50', pending: '#ff9800', cancelled: '#f44336', completed: '#9e9e9e', pencil: '#d97706' };
    return colors[status] || '#757575';
  };

  const getStatusLabel = (status) => {
    const labels = { pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', pencil: 'Temporary' };
    return labels[status] || status;
  };

  const formatTimeRemaining = (expiresAt) => {
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) return "Expired";
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const getTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  };

  const tileDisabled = ({ date, view }) => {
    if (view === 'month') {
      if (date.getDay() === 0) return true;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date < today;
    }
    return false;
  };

  // Update available slots when procedures change
  useEffect(() => {
    if (selectedDate && selectedProcedures.length > 0) {
      const slots = generateAvailableSlots(selectedDate, selectedProcedures);
      setAvailableSlots(slots);
    }
  }, [selectedDate, selectedProcedures, appointments, pencilReservations]);

  return (
    <div className="appointment-scheduler">
      <div className="scheduler-bg-animation">
        <div className="scheduler-bg-circle scheduler-bg-circle-1"></div>
        <div className="scheduler-bg-circle scheduler-bg-circle-2"></div>
        <div className="scheduler-bg-circle scheduler-bg-circle-3"></div>
        <div className="scheduler-bg-circle scheduler-bg-circle-4"></div>
        <div className="scheduler-bg-circle scheduler-bg-circle-5"></div>
        <div className="scheduler-bg-circle scheduler-bg-circle-6"></div>
      </div>
      <div className="scheduler-particles"></div>

      <div className="scheduler-container">
        <div className="scheduler-header">
          <h1><i className="fas fa-tooth"></i> Barnabas Dental Clinic · Patient Portal</h1>
          <div className="scheduler-badge">
            <i className="fas fa-hourglass-half"></i> Book Now (Pay) | Temporary Booking (8hrs) | Multiple Procedures
          </div>
        </div>

        <div className="dashboard-grid">
          {/* LEFT COLUMN - Booking Section */}
          <div className="scheduler-card">
            <div className="scheduler-card-header">
              <h2><i className="fas fa-calendar-plus"></i> Request Appointment</h2>
            </div>
            <div className="scheduler-card-body">
              {/* Calendar Section */}
              <div className="calendar-container">
                <div className="calendar-header">
                  <i className="fas fa-calendar-alt"></i>
                  <span>Select Your Preferred Date</span>
                </div>
                <div className="calendar-wrapper">
                  <Calendar
                    onChange={handleDateSelect}
                    value={selectedDate ? new Date(selectedDate) : getTomorrow()}
                    minDate={new Date()}
                    tileDisabled={tileDisabled}
                    className="custom-calendar"
                    prevLabel={<i className="fas fa-chevron-left"></i>}
                    nextLabel={<i className="fas fa-chevron-right"></i>}
                    prev2Label={<i className="fas fa-chevron-double-left"></i>}
                    next2Label={<i className="fas fa-chevron-double-right"></i>}
                  />
                </div>
                <div className="selected-date-badge">
                  <i className="fas fa-calendar-check"></i>
                  {selectedDate ? `Selected: ${selectedDate}` : " Pick a date above to continue"}
                </div>
                <div className="clinic-hours-info">
                  <i className="fas fa-clock"></i>
                  <span>Mon-Sat: 9:00 AM - 6:00 PM | Lunch: 12:00 PM - 1:00 PM | Closed Sundays</span>
                </div>
              </div>

              {/* Procedures Selection */}
              <div className="form-row">
                <label><i className="fas fa-stethoscope"></i> Select Procedures (Multiple allowed)</label>
                <div className="procedures-grid">
                  {PROCEDURES.map(procedure => (
                    <div 
                      key={procedure.id} 
                      className={`procedure-card ${selectedProcedures.find(p => p.id === procedure.id) ? 'selected' : ''}`}
                      onClick={() => toggleProcedure(procedure)}
                    >
                      <i className={`fas ${procedure.icon}`}></i>
                      <h3>{procedure.name}</h3>
                      <p className="procedure-duration">{procedure.duration} minutes</p>
                      <p className="procedure-price">₱{procedure.price.toLocaleString()}</p>
                      {selectedProcedures.find(p => p.id === procedure.id) && (
                        <div className="selected-check"><i className="fas fa-check-circle"></i></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="selected-procedures-container">
                {selectedProcedures.length === 0 ? (
                  <span className="text-muted">No procedures selected yet. Click cards above to add.</span>
                ) : (
                  <>
                    <div className="selected-procedures-list">
                      {selectedProcedures.map((proc, idx) => (
                        <span key={idx} className="selected-procedure-tag">
                          {proc.name} ({proc.duration}min / ₱{proc.price.toLocaleString()})
                          <span className="remove-proc" onClick={() => toggleProcedure(proc)}>✕</span>
                        </span>
                      ))}
                    </div>
                    <div className="total-summary">
                      <strong>Total Duration: {Math.floor(getTotalDuration()/60)}hr {getTotalDuration()%60}min | Total Amount: ₱{getTotalPrice().toLocaleString()}</strong>
                    </div>
                  </>
                )}
              </div>

              {/* Additional Notes */}
              <div className="form-row">
                <label><i className="fas fa-comment-medical"></i> Additional Notes / Symptoms</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your symptoms, concerns, or any additional information you'd like to share with the dentist..."
                  rows="3"
                ></textarea>
              </div>

              {/* Refresh Button */}
              <div className="refresh-section">
                <span className="text-muted"><i className="fas fa-hourglass-half"></i> Online booking: 8hr pencil booking</span>
                <button onClick={() => generateAvailableSlots(selectedDate, selectedProcedures)} className="btn-small btn-outline">
                  <i className="fas fa-sync-alt"></i> Refresh Slots
                </button>
              </div>

              {/* Time Slots */}
              <div className="schedule-grid">
                {loading ? (
                  <div className="loading-slots">
                    <i className="fas fa-spinner fa-pulse"></i> Loading available slots...
                  </div>
                ) : !selectedDate ? (
                  <div className="empty-slots">
                    <i className="fas fa-calendar-day"></i>
                    <span>Select a date first</span>
                  </div>
                ) : selectedProcedures.length === 0 ? (
                  <div className="empty-slots">
                    <i className="fas fa-stethoscope"></i>
                    <span>Please select at least one procedure first</span>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="no-slots">
                    <i className="fas fa-calendar-times"></i>
                    <span>No available time slots for the selected procedures on this date.</span>
                    <button onClick={joinWaitlist} className="btn-small" disabled={hasActiveAppointment()}>
                      <i className="fas fa-plus-circle"></i> Join Waitlist
                    </button>
                  </div>
                ) : (
                  availableSlots.map((slot, idx) => {
                    const isTemp = tempBooking && tempBooking.slotId === slot.slotId;
                    const isConfirmed = confirmedBooking && confirmedBooking.slotId === slot.slotId;
                    const isBooked = slot.isBooked && !isTemp && !isConfirmed;
                    
                    return (
                      <div key={idx} className="slot-item">
                        <div className="slot-info">
                          <div className="slot-time">
                            <i className="far fa-clock"></i> {slot.time} - {slot.endTime}
                          </div>
                          <div className="slot-proc">
                            📋 {getProcedureNames()} ({Math.floor(getTotalDuration()/60)}hr {getTotalDuration()%60}min)
                          </div>
                          <div className="slot-price">💰 Total: ₱{getTotalPrice().toLocaleString()}</div>
                          <div className={`slot-status ${isBooked ? 'status-booked' : isTemp ? 'status-temp' : 'status-available'}`}>
                            {slot.isFull ? "Daily Limit Reached" : 
                             isBooked ? "Booked" : 
                             isTemp ? "Your Pencil (8hr reserve)" : 
                             "Available"}
                          </div>
                          {isTemp && tempBooking && (
                            <div className="timer-text">
                              ⏰ Payment expires in: {formatTimeRemaining(tempBooking.expiresAt)}
                            </div>
                          )}
                        </div>
                        <div className="slot-actions">
                          {!slot.isFull && !isBooked && !isTemp && !isConfirmed && !hasActiveAppointment() && (
                            <>
                              <button 
                                className="btn-small btn-outline" 
                                onClick={() => handleTempBooking(slot)}
                              >
                                <i className="fas fa-hourglass-half"></i> Temporary (8hrs)
                              </button>
                              <button 
                                className="btn-small btn-primary" 
                                onClick={() => handleBookNow(slot)}
                                disabled={loading}
                              >
                                <i className="fas fa-credit-card"></i> Book Now (Pay)
                              </button>
                            </>
                          )}
                          {isTemp && (
                            <>
                              <button 
                                className="btn-small btn-primary" 
                                onClick={handlePayTempBooking}
                                disabled={loading}
                              >
                                <i className="fas fa-check-circle"></i> Pay Now (Confirm)
                              </button>
                              <button 
                                className="btn-small danger-btn" 
                                onClick={handleCancelTempBooking}
                              >
                                <i className="fas fa-times"></i> Cancel
                              </button>
                            </>
                          )}
                          {isConfirmed && (
                            <span className="confirmed-badge">
                              <i className="fas fa-check-circle"></i> Paid & Confirmed
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="policy-notice">
                <i className="fas fa-info-circle"></i> 
                <strong>Clinic policy:</strong> 9AM-6PM | Lunch break 12PM-1PM blocked | 
                <strong> 8-hour cancellation policy:</strong> Cancelling within 8 hours incurs ₱{NO_SHOW_FEE} no-show fee. |
                <strong> Same-day cancellations not allowed after payment.</strong>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - My Appointments & Waiting List */}
          <div className="scheduler-card">
            <div className="scheduler-card-header">
              <h2><i className="fas fa-user-md"></i> My Appointment</h2>
            </div>
            <div className="scheduler-card-body">
              <div className="tab-bar">
                <button 
                  className={`tab-btn ${activeTab === 'appointment' ? 'active' : ''}`} 
                  onClick={() => setActiveTab('appointment')}
                >
                  <i className="fas fa-calendar-check"></i> Appointment
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'billing' ? 'active' : ''}`} 
                  onClick={() => setActiveTab('billing')}
                >
                  <i className="fas fa-receipt"></i> Billing
                </button>
              </div>

              {activeTab === 'appointment' && (
                <>
                  <div className="active-appointment-area">
                    {tempBooking ? (
                      <div className="appt-card temp-booking">
                        <div className="flex-between">
                          <div>
                            <strong><i className="fas fa-hourglass-half"></i> TEMPORARY BOOKING (Unpaid - 8hrs)</strong>
                            <br />
                            {tempBooking.procedure}
                            <br />
                            📅 {tempBooking.date} · ⏰ {tempBooking.time}
                            <br />
                            💵 Total Amount: ₱{tempBooking.price.toLocaleString()}
                            <br />
                            📝 {tempBooking.description.substring(0, 50)}
                          </div>
                          <div className="btn-group">
                            <button onClick={handlePayTempBooking} className="btn-small btn-primary">
                              <i className="fas fa-credit-card"></i> Pay Now
                            </button>
                            <button onClick={handleCancelTempBooking} className="btn-small danger-btn">
                              Cancel
                            </button>
                          </div>
                        </div>
                        <div className="timer-text mt-3">
                          <i className="fas fa-hourglass-half"></i> Pay within: {tempBooking && formatTimeRemaining(tempBooking.expiresAt)}
                        </div>
                      </div>
                    ) : confirmedBooking ? (
                      <div className="appt-card">
                        <div className="flex-between">
                          <div>
                            <strong><i className="fas fa-check-circle"></i> CONFIRMED & PAID</strong>
                            <br />
                            {confirmedBooking.procedure}
                            <br />
                            📅 {confirmedBooking.date} · ⏰ {confirmedBooking.time}
                            <br />
                            💰 Total Paid: ₱{confirmedBooking.price.toLocaleString()}
                          </div>
                          <div className="btn-group">
                            <button onClick={openRescheduleModal} className="btn-small btn-outline">
                              <i className="fas fa-calendar-alt"></i> Reschedule
                            </button>
                            <button onClick={handleCancelConfirmedBooking} className="btn-small danger-btn">
                              <i className="fas fa-ban"></i> Cancel
                            </button>
                          </div>
                        </div>
                        <div className="text-muted mt-3">
                          <i className="fas fa-clock"></i> 8-hour cancellation policy applies. Cancellation within 8 hours incurs ₱{NO_SHOW_FEE} no-show fee. Same-day cancellations not allowed.
                        </div>
                      </div>
                    ) : myAppointment && myAppointment.status === "pending" ? (
                      <div className="appt-card">
                        <div className="flex-between">
                          <div>
                            <strong><i className="fas fa-hourglass-half"></i> PENDING APPOINTMENT</strong>
                            <br />
                            {myAppointment.service || myAppointment.other_concern}
                            <br />
                            📅 {myAppointment.date} · ⏰ {myAppointment.time}
                            <br />
                            <span className="status-badge" style={{ backgroundColor: getStatusColor(myAppointment.status) }}>
                              {getStatusLabel(myAppointment.status)}
                            </span>
                          </div>
                          <div className="btn-group">
                            <button onClick={async () => {
                              await AxiosInstance.delete(`appointments/${myAppointment.id}/`);
                              await fetchData();
                              generateAvailableSlots();
                              showToast("Appointment cancelled", "success");
                            }} className="btn-small danger-btn">
                              <i className="fas fa-ban"></i> Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : myAppointment && myAppointment.status === "confirmed" ? (
                      <div className="appt-card">
                        <div className="flex-between">
                          <div>
                            <strong><i className="fas fa-check-circle"></i> CONFIRMED APPOINTMENT</strong>
                            <br />
                            {myAppointment.service || myAppointment.other_concern}
                            <br />
                            📅 {myAppointment.date} · ⏰ {myAppointment.time}
                            <br />
                            <span className="status-badge" style={{ backgroundColor: getStatusColor(myAppointment.status) }}>
                              {getStatusLabel(myAppointment.status)}
                            </span>
                          </div>
                          <div className="btn-group">
                            <button onClick={openRescheduleModal} className="btn-small btn-outline">
                              <i className="fas fa-calendar-alt"></i> Reschedule
                            </button>
                            <button onClick={async () => {
                              if (!isCancellationAllowed(myAppointment)) {
                                addNotification("Cannot cancel appointment on the same day. Please contact the clinic.", "warning");
                                return;
                              }
                              await AxiosInstance.delete(`appointments/${myAppointment.id}/`);
                              await fetchData();
                              generateAvailableSlots();
                              showToast("Appointment cancelled", "success");
                            }} className="btn-small danger-btn">
                              <i className="fas fa-ban"></i> Cancel
                            </button>
                          </div>
                        </div>
                        <div className="text-muted mt-3">
                          <i className="fas fa-clock"></i> Same-day cancellations not allowed.
                        </div>
                      </div>
                    ) : (
                      <div className="appt-card empty">
                        <div className="flex-between">
                          <span><i className="fas fa-calendar-times"></i> No active appointment</span>
                          <span className="text-muted">Book a slot above</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <hr />

                  <div className="flex-between">
                    <strong><i className="fas fa-list-ul"></i> Waiting List</strong>
                    <button onClick={joinWaitlist} className="btn-small btn-outline" disabled={!selectedDate || selectedProcedures.length === 0 || hasActiveAppointment()}>
                      <i className="fas fa-plus-circle"></i> Join waiting list
                    </button>
                  </div>
                  <div className="waiting-list-container">
                    {waitlistEntries.length === 0 ? (
                      <div className="notify">
                        <span className="text-muted"><i className="fas fa-hourglass"></i> Join waiting list if no slots available. You will be notified when a slot opens.</span>
                      </div>
                    ) : (
                      waitlistEntries.map(entry => (
                        <div key={entry.id} className="waiting-item">
                          <div className="waiting-info">
                            <strong><i className="fas fa-hourglass-half"></i> {entry.service_needed || entry.service}</strong>
                            <div className="text-muted">{entry.preferred_date || entry.targetDate}</div>
                            <div className="queue-position">Position: #{entry.position || '?'} in queue</div>
                          </div>
                          <button onClick={() => cancelWaitlist(entry.id)} className="btn-small cancel-waiting-btn">
                            <i className="fas fa-times-circle"></i> Cancel
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              {activeTab === 'billing' && (
                <div className="billing-display">
                  {billingRecords.length === 0 ? (
                    <div className="text-muted">💰 Payment history, down payments, and balances will appear here.</div>
                  ) : (
                    billingRecords.map((bill, idx) => (
                      <div key={idx} className="billing-card">
                        <strong>{bill.procedure}</strong> ({bill.date})
                        <br />
                        Total: ₱{bill.total.toLocaleString()} | Paid: ₱{bill.paid} | Balance: ₱{bill.balance}
                        {bill.status === "Unpaid" && (
                          <button className="btn-small btn-primary" style={{ marginTop: '8px' }}>
                            <i className="fas fa-credit-card"></i> Pay Now
                          </button>
                        )}
                      </div>
                    ))
                  )}
                  <div className="notify mt-3">
                    <i className="fas fa-credit-card"></i> Payment methods: Cash / GCash. Braces down payment requires clinic approval.
                  </div>
                </div>
              )}

              <hr />

              <div>
                <strong><i className="fas fa-bell"></i> Notifications</strong>
                <div className="notification-panel">
                  {notifications.length === 0 ? (
                    <div className="text-muted">✅ Email confirmations & reminders will appear here</div>
                  ) : (
                    notifications.slice(0, 5).map(notif => (
                      <div key={notif.id} className="notification-item">
                        <i className={`fas ${notif.notification_type === 'appointment_confirmation' ? 'fa-check-circle' : notif.notification_type === 'appointment_reminder' ? 'fa-clock' : 'fa-bell'}`}></i>
                        <div>
                          <strong>{notif.title}</strong>
                          <div className="text-muted">{notif.message}</div>
                          <small>{new Date(notif.created_at).toLocaleString()}</small>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="modal-overlay" onClick={() => setShowRescheduleModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-calendar-alt"></i> Reschedule Appointment</h3>
              <button className="modal-close" onClick={() => setShowRescheduleModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p><strong>Current Appointment:</strong> {rescheduleData?.date} at {rescheduleData?.time}</p>
              <p><strong>Procedure:</strong> {rescheduleData?.procedure}</p>
              <hr />
              <p><strong>Select New Time Slot:</strong></p>
              <div className="reschedule-slots">
                {rescheduleSlots.length === 0 ? (
                  <p className="text-muted">No available slots for the next 7 days. Please try again later.</p>
                ) : (
                  rescheduleSlots.map((slot, idx) => (
                    <div key={idx} className="reschedule-slot-item" onClick={() => handleReschedule(slot)}>
                      <div>
                        <strong>{slot.date}</strong>
                        <br />
                        <span>{slot.time} - {slot.endTime}</span>
                      </div>
                      <i className="fas fa-arrow-right"></i>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast-msg toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .appointment-scheduler {
          background: linear-gradient(135deg, #1a5f5d 0%, #2ca6a4 50%, #3dbebc 100%);
          font-family: 'Inter', sans-serif;
          color: #1a2c3e;
          overflow-x: hidden;
          min-height: 100vh;
          position: relative;
        }

        /* Animated Background */
        .scheduler-bg-animation {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          pointer-events: none;
        }

        .scheduler-bg-circle {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          animation: schedulerFloatAnim 20s infinite ease-in-out;
        }

        .scheduler-bg-circle-1 {
          width: 600px;
          height: 600px;
          top: -200px;
          right: -200px;
        }

        .scheduler-bg-circle-2 {
          width: 500px;
          height: 500px;
          bottom: -150px;
          left: -150px;
          animation-delay: -3s;
        }

        .scheduler-bg-circle-3 {
          width: 400px;
          height: 400px;
          top: 30%;
          left: 15%;
          animation-delay: -7s;
        }

        .scheduler-bg-circle-4 {
          width: 350px;
          height: 350px;
          bottom: 20%;
          right: 10%;
          animation-delay: -12s;
        }

        .scheduler-bg-circle-5 {
          width: 250px;
          height: 250px;
          top: 60%;
          left: 70%;
          animation-delay: -5s;
        }

        .scheduler-bg-circle-6 {
          width: 180px;
          height: 180px;
          bottom: 40%;
          left: 30%;
          animation-delay: -9s;
        }

        @keyframes schedulerFloatAnim {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(30px, -30px) scale(1.05);
          }
          50% {
            transform: translate(-20px, 20px) scale(0.95);
          }
          75% {
            transform: translate(20px, 30px) scale(1.02);
          }
        }

        .scheduler-particles {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .scheduler-particles::before {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          background-image: radial-gradient(circle at 10% 20%, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
          background-size: 30px 30px;
          animation: schedulerParticleDrift 20s linear infinite;
        }

        @keyframes schedulerParticleDrift {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-100px);
          }
        }

        /* Container */
        .scheduler-container {
          max-width: 1400px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
          padding: 24px;
        }

        /* Header */
        .scheduler-header {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 20px 32px;
          margin-bottom: 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(44, 166, 164, 0.2);
          animation: schedulerSlideDown 0.6s ease-out;
        }

        @keyframes schedulerSlideDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .scheduler-header h1 {
          font-family: 'Poppins', sans-serif;
          font-weight: 700;
          font-size: 1.9rem;
          background: linear-gradient(135deg, #1a5f5d, #2ca6a4);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          margin: 0;
        }

        .scheduler-badge {
          background: linear-gradient(135deg, #f8f9fa, #fff);
          padding: 10px 24px;
          border-radius: 50px;
          font-weight: 600;
          color: #1a5f5d;
          border: 1px solid rgba(44, 166, 164, 0.2);
          font-size: 0.85rem;
        }

        /* Dashboard Grid */
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 28px;
          margin-bottom: 32px;
        }

        @media (max-width: 880px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Cards */
        .scheduler-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid rgba(44, 166, 164, 0.15);
          transition: all 0.3s ease;
          animation: schedulerFadeUp 0.6s ease-out forwards;
          opacity: 0;
        }

        .scheduler-card:nth-child(1) {
          animation-delay: 0.05s;
        }

        .scheduler-card:nth-child(2) {
          animation-delay: 0.1s;
        }

        @keyframes schedulerFadeUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .scheduler-card-header {
          padding: 20px 24px;
          border-bottom: 2px solid rgba(44, 166, 164, 0.2);
          background: rgba(255, 255, 255, 0.5);
        }

        .scheduler-card-header h2 {
          font-size: 1.4rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #1a5f5d;
          margin: 0;
        }

        .scheduler-card-body {
          padding: 24px;
        }

        /* Form Elements */
        .form-row {
          margin-bottom: 20px;
        }

        .form-row label {
          font-weight: 600;
          font-size: 0.85rem;
          display: block;
          margin-bottom: 8px;
          color: #1a5f5d;
        }

        select, input, textarea {
          width: 100%;
          padding: 12px 16px;
          border-radius: 16px;
          border: 1px solid rgba(44, 166, 164, 0.2);
          font-size: 0.9rem;
          background: white;
          transition: all 0.3s ease;
        }

        select:focus, input:focus, textarea:focus {
          outline: none;
          border-color: #2ca6a4;
          box-shadow: 0 0 0 3px rgba(44, 166, 164, 0.1);
        }

        textarea {
          resize: vertical;
          min-height: 80px;
          font-family: 'Inter', sans-serif;
        }

        /* Buttons */
        button {
          background: linear-gradient(135deg, #2ca6a4, #1a5f5d);
          border: none;
          padding: 12px 20px;
          border-radius: 50px;
          font-weight: 600;
          font-size: 0.85rem;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        button:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(44, 166, 164, 0.4);
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .btn-outline {
          background: transparent;
          border: 1px solid rgba(44, 166, 164, 0.3);
          color: #1a5f5d;
        }

        .btn-outline:hover {
          background: rgba(44, 166, 164, 0.1);
          transform: translateY(-2px);
        }

        .btn-small {
          padding: 8px 16px;
          font-size: 0.75rem;
        }

        .danger-btn {
          background: linear-gradient(135deg, #ef4444, #dc2626);
        }

        .danger-btn:hover {
          box-shadow: 0 5px 15px rgba(239, 68, 68, 0.4);
        }

        /* Calendar */
        .calendar-wrapper {
          background: rgba(44, 166, 164, 0.05);
          border-radius: 20px;
          padding: 12px;
          margin-bottom: 20px;
        }

        .flatpickr-calendar.inline {
          box-shadow: none;
          width: 100%;
          border-radius: 20px;
          background: transparent;
        }

        .flatpickr-day.selected {
          background: #2ca6a4 !important;
          border-color: #2ca6a4 !important;
        }

        .selected-date-badge {
          font-size: 0.85rem;
          background: rgba(44, 166, 164, 0.1);
          padding: 10px 16px;
          border-radius: 50px;
          margin-top: 12px;
          text-align: center;
          font-weight: 600;
          color: #1a5f5d;
        }

        /* Procedures Grid */
        .procedures-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-top: 8px;
        }

        .procedure-card {
          background: white;
          border-radius: 20px;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 2px solid rgba(44, 166, 164, 0.15);
          position: relative;
        }

        .procedure-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(44, 166, 164, 0.15);
          border-color: #2ca6a4;
        }

        .procedure-card.selected {
          border-color: #2ca6a4;
          background: rgba(44, 166, 164, 0.05);
        }

        .procedure-card i {
          font-size: 2.5rem;
          color: #2ca6a4;
          margin-bottom: 12px;
        }

        .procedure-card h3 {
          font-size: 1rem;
          margin: 8px 0;
          color: #1a5f5d;
        }

        .procedure-duration {
          font-size: 0.75rem;
          color: #6c757d;
          margin: 4px 0;
        }

        .procedure-price {
          font-size: 0.85rem;
          font-weight: 700;
          color: #2ca6a4;
          margin: 4px 0;
        }

        .selected-check {
          position: absolute;
          top: 10px;
          right: 10px;
          color: #2ca6a4;
          font-size: 1.2rem;
        }

        /* Selected Procedures */
        .selected-procedures-container {
          background: rgba(44, 166, 164, 0.05);
          border-radius: 16px;
          padding: 12px;
          margin: 16px 0;
        }

        .selected-procedures-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }

        .selected-procedure-tag {
          background: rgba(44, 166, 164, 0.15);
          border-radius: 30px;
          padding: 6px 12px;
          font-size: 0.75rem;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .remove-proc {
          cursor: pointer;
          color: #ef4444;
          font-weight: bold;
          margin-left: 6px;
        }

        .remove-proc:hover {
          color: #dc2626;
        }

        .total-summary {
          font-size: 0.8rem;
          color: #1a5f5d;
          text-align: center;
          padding-top: 8px;
          border-top: 1px solid rgba(44, 166, 164, 0.2);
        }

        /* Schedule Grid */
        .schedule-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 420px;
          overflow-y: auto;
          padding-right: 6px;
        }

        .slot-item {
          background: white;
          border-radius: 20px;
          padding: 14px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border: 1px solid rgba(44, 166, 164, 0.15);
          flex-wrap: wrap;
          gap: 12px;
        }

        .slot-time {
          font-weight: 700;
          font-size: 1rem;
          color: #1a5f5d;
        }

        .slot-proc {
          font-size: 0.75rem;
          color: #6c757d;
          margin-top: 4px;
        }

        .slot-status {
          font-size: 0.7rem;
          padding: 4px 12px;
          border-radius: 50px;
          font-weight: 600;
          display: inline-block;
          margin-top: 6px;
        }

        .status-booked {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }

        .status-available {
          background: rgba(44, 166, 164, 0.15);
          color: #1a5f5d;
        }

        .status-temp {
          background: rgba(245, 158, 11, 0.15);
          color: #d97706;
        }

        .slot-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        /* Appt Card */
        .appt-card {
          background: rgba(44, 166, 164, 0.08);
          border-radius: 20px;
          padding: 18px;
          margin-bottom: 20px;
          border-left: 4px solid #2ca6a4;
        }

        .appt-card.temp-booking {
          border-left-color: #d97706;
        }

        .flex-between {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        /* Text Utilities */
        .text-muted {
          color: #6c757d;
          font-size: 0.75rem;
        }

        .mt-3 {
          margin-top: 16px;
        }

        .mt-1 {
          margin-top: 8px;
        }

        /* Notify */
        .notify {
          background: rgba(44, 166, 164, 0.08);
          border-radius: 20px;
          padding: 14px;
          margin-top: 16px;
          font-size: 0.8rem;
        }

        /* Divider */
        hr {
          margin: 16px 0;
          border: 0;
          height: 1px;
          background: rgba(44, 166, 164, 0.2);
        }

        /* Toast */
        .toast-msg {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: linear-gradient(135deg, #1a5f5d, #2ca6a4);
          color: white;
          padding: 12px 24px;
          border-radius: 50px;
          font-weight: 600;
          z-index: 1100;
          animation: toastFade 0.3s ease-out;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }

        .toast-warning {
          background: linear-gradient(135deg, #d97706, #b45309);
        }

        .toast-error {
          background: linear-gradient(135deg, #ef4444, #dc2626);
        }

        @keyframes toastFade {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        /* Waiting Item */
        .waiting-item {
          background: rgba(44, 166, 164, 0.08);
          border-radius: 16px;
          padding: 12px 15px;
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        /* Tabs */
        .tab-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(44, 166, 164, 0.2);
          padding-bottom: 8px;
          flex-wrap: wrap;
        }

        .tab-btn {
          background: transparent;
          color: #1a5f5d;
          box-shadow: none;
          border-radius: 40px;
          padding: 8px 20px;
        }

        .tab-btn.active {
          background: linear-gradient(135deg, #2ca6a4, #1a5f5d);
          color: white;
        }

        .tab-btn:hover {
          transform: translateY(-2px);
          background: rgba(44, 166, 164, 0.1);
        }

        /* Timer Text */
        .timer-text {
          font-family: monospace;
          font-weight: bold;
          color: #d97706;
          background: rgba(217, 119, 6, 0.1);
          padding: 4px 8px;
          border-radius: 20px;
          display: inline-block;
          font-size: 0.75rem;
        }

        /* Billing Card */
        .billing-card {
          background: rgba(44, 166, 164, 0.05);
          border-radius: 16px;
          padding: 12px;
          margin-bottom: 12px;
          font-size: 0.85rem;
        }

        /* Notification Panel */
        .notification-panel {
          max-height: 140px;
          overflow-y: auto;
          margin-top: 12px;
          font-size: 0.8rem;
        }

        .notification-item {
          background: rgba(44, 166, 164, 0.05);
          border-radius: 12px;
          padding: 10px;
          margin-bottom: 8px;
          display: flex;
          gap: 10px;
        }

        .notification-item i {
          color: #2ca6a4;
          margin-top: 2px;
        }

        /* Scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 10px;
        }

        ::-webkit-scrollbar-thumb {
          background: #2ca6a4;
          border-radius: 10px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #1a5f5d;
        }

        /* Responsive */
        @media (max-width: 600px) {
          .scheduler-container {
            padding: 16px;
          }
          
          .slot-item {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .procedures-grid {
            grid-template-columns: 1fr 1fr;
          }
          
          .scheduler-header {
            flex-direction: column;
            text-align: center;
          }
          
          .scheduler-header h1 {
            font-size: 1.3rem;
          }
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          animation: modalFadeIn 0.2s ease;
        }

        .modal-content {
          background: white;
          border-radius: 24px;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow: hidden;
          animation: modalSlideUp 0.3s ease;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid rgba(44, 166, 164, 0.2);
          background: linear-gradient(135deg, #f8f9fa, #fff);
        }

        .modal-header h3 {
          margin: 0;
          color: #1a5f5d;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .modal-close {
          background: transparent;
          color: #6c757d;
          font-size: 1.5rem;
          padding: 0;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-close:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          transform: none;
        }

        .modal-body {
          padding: 24px;
          max-height: 60vh;
          overflow-y: auto;
        }

        .reschedule-slots {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 16px;
        }

        .reschedule-slot-item {
          background: rgba(44, 166, 164, 0.05);
          border: 1px solid rgba(44, 166, 164, 0.15);
          border-radius: 16px;
          padding: 14px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .reschedule-slot-item:hover {
          background: rgba(44, 166, 164, 0.1);
          border-color: #2ca6a4;
          transform: translateX(4px);
        }

        .reschedule-slot-item i {
          color: #2ca6a4;
          font-size: 1.2rem;
        }

        @keyframes modalFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes modalSlideUp {
          from {
            transform: translateY(50px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        /* React Calendar Custom Styling */
        .custom-calendar {
          border: none !important;
          background: transparent !important;
          width: 100% !important;
          font-family: 'Inter', sans-serif !important;
        }

        /* Navigation */
        .custom-calendar .react-calendar__navigation {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          margin-bottom: 16px;
          background: rgba(44, 166, 164, 0.1);
          border-radius: 16px;
        }

        .custom-calendar .react-calendar__navigation button {
          background: transparent;
          color: #1a5f5d;
          font-size: 1rem;
          font-weight: 600;
          padding: 8px 12px;
          min-width: 40px;
          border-radius: 12px;
          transition: all 0.2s ease;
        }

        .custom-calendar .react-calendar__navigation button:hover {
          background: rgba(44, 166, 164, 0.2);
          transform: translateY(-2px);
        }

        .custom-calendar .react-calendar__navigation button:disabled {
          opacity: 0.3;
          transform: none;
        }

        .custom-calendar .react-calendar__navigation__label {
          font-size: 1rem;
          font-weight: 700;
          color: #1a5f5d;
        }

        /* Weekdays */
        .custom-calendar .react-calendar__month-view__weekdays {
          text-align: center;
          margin-bottom: 8px;
        }

        .custom-calendar .react-calendar__month-view__weekdays__weekday {
          padding: 8px 0;
          font-weight: 600;
          font-size: 0.8rem;
          color: #1a5f5d;
          text-decoration: none;
        }

        .custom-calendar .react-calendar__month-view__weekdays__weekday abbr {
          text-decoration: none;
          cursor: default;
        }

        /* Week numbers */
        .custom-calendar .react-calendar__month-view__weekNumbers .react-calendar__tile {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
          color: #2ca6a4;
        }

        /* Days grid */
        .custom-calendar .react-calendar__month-view__days {
          display: grid !important;
          grid-template-columns: repeat(7, 1fr) !important;
          gap: 6px;
        }

        /* Individual day tiles */
        .custom-calendar .react-calendar__tile {
          aspect-ratio: 1 / 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          font-size: 0.85rem;
          font-weight: 500;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 50% !important;
          transition: all 0.2s ease;
          color: #1a2c3e;
          width: 100%;
          max-width: 45px;
          margin: 0 auto;
        }

        /* Hover effect */
        .custom-calendar .react-calendar__tile:hover {
          background: rgba(44, 166, 164, 0.2) !important;
          transform: scale(1.05);
        }

        /* Selected day */
        .custom-calendar .react-calendar__tile--active,
        .custom-calendar .react-calendar__tile--hasActive {
          background: #2ca6a4 !important;
          color: white !important;
        }

        .custom-calendar .react-calendar__tile--active:hover {
          background: #1a5f5d !important;
        }

        /* Today's date */
        .custom-calendar .react-calendar__tile--now {
          background: rgba(44, 166, 164, 0.15) !important;
          border: 2px solid #2ca6a4 !important;
          font-weight: 700 !important;
        }

        .custom-calendar .react-calendar__tile--now.react-calendar__tile--active {
          background: #2ca6a4 !important;
          color: white !important;
          border: none !important;
        }

        /* Disabled days (Sundays and past dates) */
        .custom-calendar .react-calendar__tile--disabled {
          background: rgba(200, 200, 200, 0.3) !important;
          color: #b0b0b0 !important;
          cursor: not-allowed !important;
          text-decoration: line-through !important;
          opacity: 0.6;
        }

        .custom-calendar .react-calendar__tile--disabled:hover {
          transform: none;
          background: rgba(200, 200, 200, 0.3) !important;
        }

        /* Adjacent month days */
        .custom-calendar .react-calendar__month-view__days__day--neighboringMonth {
          opacity: 0.4;
        }

        /* Weekend days */
        .custom-calendar .react-calendar__month-view__days__day--weekend {
          color: inherit;
        }

        /* Navigation icons */
        .custom-calendar .react-calendar__navigation button i {
          font-size: 0.9rem;
        }

        /* Responsive calendar */
        @media (max-width: 768px) {
          .custom-calendar .react-calendar__tile {
            max-width: 35px;
            font-size: 0.7rem;
          }
          
          .custom-calendar .react-calendar__navigation button {
            padding: 4px 8px;
            font-size: 0.8rem;
          }
          
          .custom-calendar .react-calendar__navigation__label {
            font-size: 0.8rem;
          }
        }

        @media (max-width: 480px) {
          .custom-calendar .react-calendar__tile {
            max-width: 30px;
            font-size: 0.65rem;
          }
          
          .custom-calendar .react-calendar__month-view__days {
            gap: 3px;
          }
        }
      `}</style>
    </div>
  );
}