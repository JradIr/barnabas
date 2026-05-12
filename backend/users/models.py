# models.py
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django_rest_passwordreset.signals import reset_password_token_created
from django.dispatch import receiver
from django.urls import reverse 
from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives
from django.utils.html import strip_tags
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import datetime
import uuid
from celery import shared_task
from django.core.mail import send_mail
from .ai_service import AIDentalScheduler


User = settings.AUTH_USER_MODEL


    
class CustomUserManager(BaseUserManager):
    def create_user(self, username, email, password=None, **extra_fields):
        if not username:
            raise ValueError("Username is required")
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(username, email, password, **extra_fields)

class CustomUser(AbstractBaseUser, PermissionsMixin):
    username = models.CharField(max_length=150, unique=True)
    firstname = models.CharField(max_length=150, null=True, blank=True)
    middlename = models.CharField(max_length=150, null=True, blank=True)
    lastname = models.CharField(max_length=150, null=True, blank=True)
    email = models.EmailField(unique=True)
    birthday = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = CustomUserManager()

    # Primary identifier for Django admin login
    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email"]  # superuser creation will ask for email too

    def __str__(self):
        return self.username or self.email

@receiver(reset_password_token_created)
def password_reset_token_created(reset_password_token, *args, **kwargs):
    sitelink = 'http://localhost:5173/'
    token = '{}'.format(reset_password_token.key)
    full_link = str(sitelink)+str('password_reset/')+str(token)

    print(full_link)
    print(token)

    context = {
        'full_link': full_link,
        'email_address': reset_password_token.user.email
    }
    html_message = render_to_string('backend/email.html', context=context)
    plain_message = strip_tags(html_message)

    msg = EmailMultiAlternatives(
        subject = 'request for resetting password for {title}'.format(title=reset_password_token.user.email),
        body=plain_message,
        from_email = 'sender@example.com',
        to=[reset_password_token.user.email]
    )
    msg.attach_alternative(html_message, 'text/html')
    msg.send()

# models.py

class Appointment(models.Model):
    STATUS_CHOICES = [
        ('pencil', 'Pencil Booking'),
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
        ('waiting', 'Waiting List'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='appointments'
    )
    date = models.DateField()
    time = models.TimeField()
    service = models.CharField(max_length=255, blank=True, null=True)
    other_concern = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='pending'
    )
    pencil_expires_at = models.DateTimeField(null=True, blank=True)
    waitlist_position = models.IntegerField(null=True, blank=True)
    ai_suggestion = models.TextField(blank=True, null=True)
    preferred_time = models.CharField(max_length=50, blank=True, null=True)
    urgency_level = models.IntegerField(
        default=1, 
        choices=[(1, 'Low'), (2, 'Medium'), (3, 'High')]
    )
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date', 'time']
        indexes = [
            models.Index(fields=['user', 'date', 'status']),
            models.Index(fields=['date', 'time', 'status']),
            models.Index(fields=['status', 'waitlist_position']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.date} {self.time} ({self.status})"

class Waitlist(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='waitlist_entries'
    )
    preferred_date = models.DateField()
    preferred_time_start = models.TimeField()
    preferred_time_end = models.TimeField()
    service_needed = models.CharField(max_length=255)
    urgency_level = models.IntegerField(
        choices=[(1, 'Low'), (2, 'Medium'), (3, 'High')],
        default=1
    )
    status = models.CharField(
        max_length=20, 
        default='active',
        choices=[('active', 'Active'), ('notified', 'Notified'), ('booked', 'Booked')]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-urgency_level', 'created_at']
        indexes = [
            models.Index(fields=['status', 'urgency_level']),
            models.Index(fields=['preferred_date', 'status']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.preferred_date} (Urgency: {self.get_urgency_level_display()})"

class AISuggestion(models.Model):
    SUGGESTION_TYPES = [
        ('time_optimization', 'Time Optimization'),
        ('service_recommendation', 'Service Recommendation'),
        ('cancellation_risk', 'Cancellation Risk'),
        ('trending_services', 'Trending Services'),
        ('waitlist_opportunity', 'Waitlist Opportunity'),
        ('reminder', 'Reminder'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ai_suggestions'
    )
    suggestion_type = models.CharField(max_length=50, choices=SUGGESTION_TYPES)
    title = models.CharField(max_length=255)
    description = models.TextField()
    priority = models.IntegerField(default=1)
    is_read = models.BooleanField(default=False)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-priority', '-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['suggestion_type', 'created_at']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.title}"

class BookingReservation(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reservations'
    )
    token = models.CharField(max_length=100, unique=True)
    date = models.DateField()
    time = models.TimeField()
    service = models.CharField(max_length=255, blank=True, null=True)
    expires_at = models.DateTimeField()
    is_confirmed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['token', 'is_confirmed']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.token} ({self.expires_at})"

@shared_task
def expire_pencil_booking(appointment_id):
    """Auto-expire pencil bookings after 15 minutes"""
    try:
        appointment = Appointment.objects.get(id=appointment_id, status='pencil')
        if appointment.pencil_expires_at < timezone.now():
            appointment.status = 'cancelled'
            appointment.save()
            
            # Notify user
            send_mail(
                'Pencil Booking Expired',
                f'Your pencil booking for {appointment.date} at {appointment.time} has expired.',
                'noreply@dentalclinic.com',
                [appointment.user.email],
                fail_silently=True,
            )
    except Appointment.DoesNotExist:
        pass

def generate_all_slots():
    """
    Generate all possible appointment slots for a clinic day.
    Clinic hours: 9:00 AM to 6:00 PM
    Lunch break: 12:00 PM to 1:00 PM
    Slot length: 30 minutes
    """
    from datetime import datetime, time, timedelta

    slots = []
    start_time = datetime.combine(datetime.today(), time(9, 0))
    end_time = datetime.combine(datetime.today(), time(18, 0))

    current = start_time
    while current < end_time:
        # Skip lunch break
        if current.time().hour == 12:
            current += timedelta(hours=1)
            continue

        slots.append({
            "hour": current.time().hour,
            "minute": current.time().minute,
            "time": current.strftime("%H:%M")
        })
        current += timedelta(minutes=30)

    return slots

@shared_task
def check_waitlist_for_slots():
    """Periodically check if waitlist users can be matched with open slots"""
    # Get all available slots for next 7 days
    from datetime import datetime, timedelta
    
    for days_ahead in range(7):
        check_date = timezone.now().date() + timedelta(days=days_ahead)
        
        # Get all appointments for this date
        appointments = Appointment.objects.filter(
            date=check_date,
            status__in=['confirmed', 'pending']
        )
        
        booked_slots = set([(apt.time.hour, apt.time.minute) for apt in appointments])
        all_slots = generate_all_slots()  # Generate all possible slots
        
        available_slots = [slot for slot in all_slots if slot not in booked_slots]
        
        # Check waitlist users
        waitlist_users = Waitlist.objects.filter(
            preferred_date=check_date,
            status='active'
        ).order_by('-urgency_level', 'created_at')
        
        for user in waitlist_users:
            matching_slots = []
            for slot in available_slots:
                slot_time = datetime.strptime(slot['time'], '%H:%M').time()
                if user.preferred_time_start <= slot_time <= user.preferred_time_end:
                    matching_slots.append(slot)
            
            if matching_slots:
                # Notify user
                AISuggestion.objects.create(
                    user=user.user,
                    suggestion_type='waitlist_match',
                    title='Waitlist Match Found!',
                    description=f'A slot has opened on {check_date}. Book now!',
                    priority=user.urgency_level
                )

@shared_task
def generate_ai_recommendations():
    """Generate AI recommendations for all users"""
    users = User.objects.filter(is_active=True)
    
    for user in users:
        user_appointments = Appointment.objects.filter(user=user)
        
        # Generate time optimization suggestion
        patterns = AIDentalScheduler.analyze_booking_patterns(user_appointments)
        if patterns and patterns.get('preferred_time'):
            AISuggestion.objects.create(
                user=user,
                suggestion_type='time_optimization',
                title='Optimal Booking Time',
                description=f"Based on your history, {patterns['preferred_time']}:00 works best for you.",
                priority=1
            )
        
        # Check for upcoming appointments
        upcoming = Appointment.objects.filter(
            user=user,
            date__gt=timezone.now().date(),
            status='pending'
        ).first()
        
        if upcoming:
            risk = AIDentalScheduler.predict_cancellation_risk(upcoming)
            if risk['risk_score'] > 50:
                AISuggestion.objects.create(
                    user=user,
                    suggestion_type='cancellation_risk',
                    title='Appointment Risk Alert',
                    description=f"Your appointment has a {risk['risk_score']}% cancellation risk.",
                    priority=2
                )
class PatientRecord(models.Model):
    """Patient medical records and history"""
    BLOOD_TYPES = [
        ('A+', 'A+'), ('A-', 'A-'), ('B+', 'B+'), ('B-', 'B-'),
        ('AB+', 'AB+'), ('AB-', 'AB-'), ('O+', 'O+'), ('O-', 'O-'),
    ]
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='patient_record'
    )
    blood_type = models.CharField(max_length=3, choices=BLOOD_TYPES, blank=True, null=True)
    allergies = models.TextField(blank=True, null=True, help_text="List any allergies (medications, latex, etc.)")
    medical_conditions = models.TextField(blank=True, null=True, help_text="Diabetes, Hypertension, etc.")
    current_medications = models.TextField(blank=True, null=True)
    emergency_contact_name = models.CharField(max_length=255, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True, null=True)
    emergency_contact_relation = models.CharField(max_length=100, blank=True, null=True)
    dental_insurance_provider = models.CharField(max_length=255, blank=True, null=True)
    insurance_id = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Record for {self.user.get_full_name() or self.user.username}"


class TreatmentHistory(models.Model):
    """Track patient treatment history"""
    TREATMENT_TYPES = [
        ('cleaning', 'Teeth Cleaning'),
        ('filling', 'Dental Filling'),
        ('extraction', 'Tooth Extraction'),
        ('root_canal', 'Root Canal'),
        ('crown', 'Crown'),
        ('bridge', 'Bridge'),
        ('braces', 'Braces/Orthodontic'),
        ('whitening', 'Teeth Whitening'),
        ('implant', 'Dental Implant'),
        ('checkup', 'Regular Checkup'),
        ('emergency', 'Emergency Treatment'),
        ('other', 'Other'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='treatment_history'
    )
    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='treatments'
    )
    treatment_type = models.CharField(max_length=50, choices=TREATMENT_TYPES)
    treatment_date = models.DateField()
    dentist_notes = models.TextField(blank=True, null=True)
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_status = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('partial', 'Partial'), ('paid', 'Paid')],
        default='pending'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.get_treatment_type_display()} - {self.treatment_date}"
    
    @property
    def balance(self):
        return self.cost - self.paid_amount
class Billing(models.Model):
    PAYMENT_METHODS = [
        ('cash', 'Cash'),
        ('gcash', 'GCash'),
        ('bank_transfer', 'Bank Transfer'),
    ]
    
    PAYMENT_STATUS = [
        ('pending', 'Pending'),
        ('partial', 'Partially Paid'),
        ('paid', 'Fully Paid'),
        ('overdue', 'Overdue'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bills'
    )
    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bills'
    )
    treatment = models.ForeignKey(
        TreatmentHistory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bills'
    )
    invoice_number = models.CharField(max_length=50, unique=True)
    description = models.CharField(max_length=255)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS, blank=True, null=True)
    payment_date = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='pending')
    due_date = models.DateField()
    notes = models.TextField(blank=True, null=True)
    braces_down_payment_approved = models.BooleanField(default=False)
    braces_down_payment_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Invoice {self.invoice_number} - {self.user.username} - {self.status}"
    
    @property
    def balance(self):
        return self.total_amount - self.paid_amount
    
    def save(self, *args, **kwargs):
        if not self.invoice_number:
            import uuid
            self.invoice_number = f"INV-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)


class PaymentTransaction(models.Model):
    """Record individual payment transactions"""
    bill = models.ForeignKey(Billing, on_delete=models.CASCADE, related_name='transactions')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=Billing.PAYMENT_METHODS)
    reference_number = models.CharField(max_length=100, blank=True, null=True)  # For GCash reference
    payment_date = models.DateTimeField(auto_now_add=True)
    processed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='processed_payments'
    )
    notes = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return f"Payment of {self.amount} for {self.bill.invoice_number}"
class Notification(models.Model):
    """
    Notification model for system alerts, appointment reminders,
    waitlist updates, and billing notifications.
    """
    
    NOTIFICATION_TYPES = [
        ('appointment_reminder', 'Appointment Reminder'),
        ('appointment_confirmed', 'Appointment Confirmed'),
        ('appointment_cancelled', 'Appointment Cancelled'),
        ('appointment_reminder_24h', '24 Hour Reminder'),
        ('appointment_reminder_1h', '1 Hour Reminder'),
        ('waitlist_match', 'Waitlist Match Found'),
        ('waitlist_position', 'Waitlist Position Update'),
        ('billing_created', 'New Bill Created'),
        ('billing_reminder', 'Payment Reminder'),
        ('payment_received', 'Payment Received'),
        ('payment_confirmed', 'Payment Confirmed'),
        ('overdue_payment', 'Overdue Payment Alert'),
        ('pencil_expiring', 'Pencil Booking Expiring'),
        ('reservation_expiring', 'Reservation Expiring'),
        ('ai_suggestion', 'AI Suggestion'),
        ('system_alert', 'System Alert'),
        ('promotion', 'Promotion/Announcement'),
        ('record_updated', 'Medical Record Updated'),
        ('treatment_plan', 'Treatment Plan Ready'),
    ]
    
    PRIORITY_LEVELS = [
        (1, 'Low'),
        (2, 'Medium'),
        (3, 'High'),
        (4, 'Urgent'),
    ]
    
    DELIVERY_CHANNELS = [
        ('in_app', 'In-App Notification'),
        ('email', 'Email'),
        ('both', 'Both'),
    ]
    
    # Relationships
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    
    # Notification details
    notification_type = models.CharField(
        max_length=50,
        choices=NOTIFICATION_TYPES,
        db_index=True
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    priority = models.IntegerField(choices=PRIORITY_LEVELS, default=1)
    delivery_channel = models.CharField(
        max_length=20,
        choices=DELIVERY_CHANNELS,
        default='in_app'
    )
    
    # Status tracking
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    is_delivered = models.BooleanField(default=False)
    delivered_at = models.DateTimeField(null=True, blank=True)
    is_email_sent = models.BooleanField(default=False)
    email_sent_at = models.DateTimeField(null=True, blank=True)
    
    # Action/Deep linking
    action_url = models.CharField(max_length=500, blank=True, null=True)
    action_type = models.CharField(max_length=100, blank=True, null=True)  # e.g., 'view_appointment', 'pay_bill'
    action_id = models.IntegerField(null=True, blank=True)  # ID of related object
    
    # Related objects (for reference without deep linking)
    appointment_id = models.IntegerField(null=True, blank=True)
    bill_id = models.IntegerField(null=True, blank=True)
    waitlist_id = models.IntegerField(null=True, blank=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)  # Store extra data
    expires_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-priority', '-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', '-created_at']),
            models.Index(fields=['user', 'notification_type']),
            models.Index(fields=['is_delivered', 'created_at']),
            models.Index(fields=['expires_at']),
            models.Index(fields=['user', 'priority', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.title} ({self.get_notification_type_display()})"
    
    def mark_as_read(self):
        """Mark notification as read"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
    
    def mark_as_delivered(self):
        """Mark notification as delivered"""
        if not self.is_delivered:
            self.is_delivered = True
            self.delivered_at = timezone.now()
            self.save(update_fields=['is_delivered', 'delivered_at'])
    
    def is_expired(self):
        """Check if notification has expired"""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False
    
    @property
    def time_ago(self):
        """Get human-readable time since creation"""
        from django.utils.timesince import timesince
        return timesince(self.created_at)


class UserNotificationPreference(models.Model):
    """
    User preferences for what notifications they want to receive
    and how they want to receive them.
    """
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_preferences'
    )
    
    # Channel preferences
    email_notifications = models.BooleanField(default=True)
    in_app_notifications = models.BooleanField(default=True)
    
    # Type preferences (which notifications to receive)
    # Appointment related
    notify_appointment_reminders = models.BooleanField(default=True)
    notify_appointment_confirmed = models.BooleanField(default=True)
    notify_appointment_cancelled = models.BooleanField(default=True)
    
    # Waitlist related
    notify_waitlist_match = models.BooleanField(default=True)
    notify_waitlist_position = models.BooleanField(default=True)
    
    # Billing related
    notify_billing_created = models.BooleanField(default=True)
    notify_billing_reminders = models.BooleanField(default=True)
    notify_payment_received = models.BooleanField(default=True)
    notify_overdue_payment = models.BooleanField(default=True)
    
    # AI and other
    notify_ai_suggestions = models.BooleanField(default=True)
    notify_system_alerts = models.BooleanField(default=True)
    notify_promotions = models.BooleanField(default=False)
    
    # Timing preferences
    reminder_hours_before = models.IntegerField(default=24)  # Hours before appointment
    digest_enabled = models.BooleanField(default=False)  # Daily digest instead of real-time
    quiet_hours_start = models.TimeField(null=True, blank=True)  # Start of quiet hours
    quiet_hours_end = models.TimeField(null=True, blank=True)  # End of quiet hours
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Preferences for {self.user.username}"
    
    def should_send_email(self, notification_type):
        """Check if email should be sent for this notification type"""
        if not self.email_notifications:
            return False
        
        mapping = {
            'appointment_reminder': self.notify_appointment_reminders,
            'appointment_confirmed': self.notify_appointment_confirmed,
            'appointment_cancelled': self.notify_appointment_cancelled,
            'waitlist_match': self.notify_waitlist_match,
            'waitlist_position': self.notify_waitlist_position,
            'billing_created': self.notify_billing_created,
            'billing_reminder': self.notify_billing_reminders,
            'payment_received': self.notify_payment_received,
            'overdue_payment': self.notify_overdue_payment,
            'ai_suggestion': self.notify_ai_suggestions,
            'system_alert': self.notify_system_alerts,
            'promotion': self.notify_promotions,
        }
        
        return mapping.get(notification_type, True)
    
    def should_send_in_app(self, notification_type):
        """Check if in-app notification should be sent"""
        if not self.in_app_notifications:
            return False
        
        # Same mapping as email but for in-app
        mapping = {
            'appointment_reminder': self.notify_appointment_reminders,
            'appointment_confirmed': self.notify_appointment_confirmed,
            'appointment_cancelled': self.notify_appointment_cancelled,
            'waitlist_match': self.notify_waitlist_match,
            'waitlist_position': self.notify_waitlist_position,
            'billing_created': self.notify_billing_created,
            'billing_reminder': self.notify_billing_reminders,
            'payment_received': self.notify_payment_received,
            'overdue_payment': self.notify_overdue_payment,
            'ai_suggestion': self.notify_ai_suggestions,
            'system_alert': self.notify_system_alerts,
            'promotion': self.notify_promotions,
        }
        
        return mapping.get(notification_type, True)


class NotificationLog(models.Model):
    """
    Log of all sent notifications for auditing and debugging
    """
    
    notification = models.ForeignKey(
        Notification,
        on_delete=models.CASCADE,
        related_name='logs'
    )
    
    # Delivery info
    channel = models.CharField(max_length=20, choices=Notification.DELIVERY_CHANNELS)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('failed', 'Failed'),
        ('read', 'Read'),
    ], default='pending')
    
    # Error tracking
    error_message = models.TextField(blank=True, null=True)
    retry_count = models.IntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['notification', 'status']),
            models.Index(fields=['channel', 'created_at']),
        ]
    
    def __str__(self):
        return f"Log for {self.notification.id} - {self.channel} - {self.status}"
# models.py - Add this to your existing models.py file

class ActivityLog(models.Model):
    """
    Comprehensive audit log for tracking all user and system activities.
    Used for security auditing, compliance, troubleshooting, and analytics.
    """
    
    # Action Types
    ACTION_TYPES = [
        # Authentication & Account
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('login_failed', 'Login Failed'),
        ('password_change', 'Password Change'),
        ('password_reset', 'Password Reset'),
        ('account_created', 'Account Created'),
        ('account_updated', 'Account Updated'),
        ('account_deactivated', 'Account Deactivated'),
        ('account_reactivated', 'Account Reactivated'),
        
        # Appointments
        ('appointment_created', 'Appointment Created'),
        ('appointment_updated', 'Appointment Updated'),
        ('appointment_cancelled', 'Appointment Cancelled'),
        ('appointment_rescheduled', 'Appointment Rescheduled'),
        ('appointment_confirmed', 'Appointment Confirmed'),
        ('appointment_completed', 'Appointment Completed'),
        ('appointment_no_show', 'Appointment No-Show'),
        ('pencil_booking_created', 'Pencil Booking Created'),
        ('pencil_booking_expired', 'Pencil Booking Expired'),
        ('pencil_booking_confirmed', 'Pencil Booking Confirmed'),
        
        # Waitlist
        ('waitlist_joined', 'Joined Waitlist'),
        ('waitlist_left', 'Left Waitlist'),
        ('waitlist_notified', 'Waitlist Notified'),
        ('waitlist_booked', 'Waitlist Booked'),
        
        # Billing & Payments
        ('payment_made', 'Payment Made'),
        ('payment_approved', 'Payment Approved'),
        ('payment_rejected', 'Payment Rejected'),
        ('payment_refunded', 'Payment Refunded'),
        ('invoice_created', 'Invoice Created'),
        ('invoice_updated', 'Invoice Updated'),
        ('invoice_paid', 'Invoice Paid'),
        ('braces_downpayment_approved', 'Braces Downpayment Approved'),
        ('bill_overdue', 'Bill Marked Overdue'),
        
        # Medical Records
        ('patient_record_created', 'Patient Record Created'),
        ('patient_record_updated', 'Patient Record Updated'),
        ('patient_record_viewed', 'Patient Record Viewed'),
        ('treatment_history_added', 'Treatment History Added'),
        ('treatment_history_updated', 'Treatment History Updated'),
        ('medical_certificate_issued', 'Medical Certificate Issued'),
        
        # AI & Notifications
        ('ai_suggestion_generated', 'AI Suggestion Generated'),
        ('notification_sent', 'Notification Sent'),
        ('notification_read', 'Notification Read'),
        ('email_sent', 'Email Sent'),
        ('sms_sent', 'SMS Sent'),
        
        # Admin Actions
        ('admin_login', 'Admin Login'),
        ('admin_logout', 'Admin Logout'),
        ('admin_user_created', 'Admin Created User'),
        ('admin_user_updated', 'Admin Updated User'),
        ('admin_user_deleted', 'Admin Deleted User'),
        ('admin_role_changed', 'Admin Role Changed'),
        ('admin_settings_updated', 'Admin Settings Updated'),
        ('admin_report_generated', 'Admin Report Generated'),
        ('admin_data_exported', 'Admin Data Exported'),
        ('admin_backup_created', 'Admin Backup Created'),
        
        # System Events
        ('system_error', 'System Error'),
        ('system_maintenance', 'System Maintenance'),
        ('database_backup', 'Database Backup'),
        ('cache_cleared', 'Cache Cleared'),
        ('celery_task_started', 'Celery Task Started'),
        ('celery_task_completed', 'Celery Task Completed'),
        ('celery_task_failed', 'Celery Task Failed'),
        
        # Security Events
        ('suspicious_activity', 'Suspicious Activity Detected'),
        ('api_key_created', 'API Key Created'),
        ('api_key_revoked', 'API Key Revoked'),
        ('rate_limit_exceeded', 'Rate Limit Exceeded'),
        ('permission_denied', 'Permission Denied'),
        
        # Data Changes
        ('data_import', 'Data Import'),
        ('data_export', 'Data Export'),
        ('data_deleted', 'Data Deleted'),
        ('bulk_operation', 'Bulk Operation'),
    ]
    
    # Severity Levels
    SEVERITY_LEVELS = [
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('critical', 'Critical'),
    ]
    
    # Entity Types (for tracking specific objects)
    ENTITY_TYPES = [
        ('user', 'User'),
        ('appointment', 'Appointment'),
        ('billing', 'Billing'),
        ('payment', 'Payment'),
        ('patient_record', 'Patient Record'),
        ('treatment_history', 'Treatment History'),
        ('waitlist', 'Waitlist'),
        ('notification', 'Notification'),
        ('ai_suggestion', 'AI Suggestion'),
        ('booking_reservation', 'Booking Reservation'),
        ('system', 'System'),
        ('admin', 'Admin Action'),
    ]
    
    # Basic Information
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activity_logs',
        db_index=True
    )
    
    action = models.CharField(
        max_length=50,
        choices=ACTION_TYPES,
        db_index=True
    )
    
    severity = models.CharField(
        max_length=20,
        choices=SEVERITY_LEVELS,
        default='info',
        db_index=True
    )
    
    # Related Entity Tracking
    entity_type = models.CharField(
        max_length=50,
        choices=ENTITY_TYPES,
        null=True,
        blank=True,
        db_index=True
    )
    
    entity_id = models.IntegerField(null=True, blank=True, db_index=True)
    entity_string = models.CharField(max_length=255, blank=True, null=True)
    
    # Detailed Information
    description = models.TextField()
    details = models.JSONField(default=dict, blank=True)  # Store additional structured data
    
    # Request Information
    ip_address = models.GenericIPAddressField(null=True, blank=True, db_index=True)
    user_agent = models.TextField(blank=True, null=True)
    request_method = models.CharField(max_length=10, blank=True, null=True)
    request_path = models.CharField(max_length=500, blank=True, null=True)
    request_data = models.JSONField(default=dict, blank=True)  # Sanitized request data
    
    # Performance Metrics
    duration_ms = models.IntegerField(null=True, blank=True, help_text="Request duration in milliseconds")
    database_queries = models.IntegerField(null=True, blank=True, help_text="Number of database queries")
    
    # Status
    is_success = models.BooleanField(default=True, db_index=True)
    error_message = models.TextField(blank=True, null=True)
    stack_trace = models.TextField(blank=True, null=True)
    
    # Session Tracking
    session_id = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    request_id = models.UUIDField(default=uuid.uuid4, editable=False, db_index=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Activity Log'
        verbose_name_plural = 'Activity Logs'
        indexes = [
            models.Index(fields=['user', 'action', '-created_at']),
            models.Index(fields=['entity_type', 'entity_id', '-created_at']),
            models.Index(fields=['severity', '-created_at']),
            models.Index(fields=['created_at']),
            models.Index(fields=['ip_address', '-created_at']),
            models.Index(fields=['session_id', '-created_at']),
            models.Index(fields=['request_id']),
            models.Index(fields=['is_success', '-created_at']),
        ]
    
    def __str__(self):
        user_str = self.user.username if self.user else 'Anonymous'
        return f"{user_str} - {self.get_action_display()} - {self.created_at}"
    
    @classmethod
    def log(cls, user, action, description, **kwargs):
        """
        Helper method to create an activity log entry
        
        Usage:
        ActivityLog.log(
            user=request.user,
            action='appointment_created',
            description=f"Appointment created for {appointment.date}",
            entity_type='appointment',
            entity_id=appointment.id,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
            request_path=request.path,
            details={'service': appointment.service}
        )
        """
        log_entry = cls(
            user=user,
            action=action,
            description=description,
            entity_type=kwargs.get('entity_type'),
            entity_id=kwargs.get('entity_id'),
            entity_string=kwargs.get('entity_string'),
            details=kwargs.get('details', {}),
            severity=kwargs.get('severity', 'info'),
            ip_address=kwargs.get('ip_address'),
            user_agent=kwargs.get('user_agent'),
            request_method=kwargs.get('request_method'),
            request_path=kwargs.get('request_path'),
            request_data=kwargs.get('request_data', {}),
            duration_ms=kwargs.get('duration_ms'),
            database_queries=kwargs.get('database_queries'),
            is_success=kwargs.get('is_success', True),
            error_message=kwargs.get('error_message'),
            stack_trace=kwargs.get('stack_trace'),
            session_id=kwargs.get('session_id'),
        )
        log_entry.save()
        return log_entry
    
    @classmethod
    def log_error(cls, user, action, error_message, description=None, **kwargs):
        """Helper method to log errors"""
        return cls.log(
            user=user,
            action=action,
            description=description or f"Error during {action}: {error_message[:200]}",
            severity='error',
            is_success=False,
            error_message=error_message,
            stack_trace=kwargs.get('stack_trace'),
            **kwargs
        )
    
    @classmethod
    def log_system_event(cls, action, description, **kwargs):
        """Helper method to log system events (no user)"""
        return cls.log(
            user=None,
            action=action,
            description=description,
            severity=kwargs.get('severity', 'info'),
            **kwargs
        )
    
    @classmethod
    def get_user_activity(cls, user_id, days=30, action=None):
        """Get activity logs for a specific user"""
        from django.utils import timezone
        from datetime import timedelta
        
        since = timezone.now() - timedelta(days=days)
        queryset = cls.objects.filter(user_id=user_id, created_at__gte=since)
        
        if action:
            queryset = queryset.filter(action=action)
        
        return queryset
    
    @classmethod
    def get_entity_history(cls, entity_type, entity_id):
        """Get all activity for a specific entity (e.g., an appointment)"""
        return cls.objects.filter(
            entity_type=entity_type,
            entity_id=entity_id
        ).select_related('user').order_by('-created_at')
    
    @classmethod
    def get_recent_activities(cls, limit=100, severity=None):
        """Get recent activities across the system"""
        queryset = cls.objects.select_related('user').all()
        
        if severity:
            queryset = queryset.filter(severity=severity)
        
        return queryset[:limit]
    
    @classmethod
    def get_activity_stats(cls, days=30):
        """Get activity statistics"""
        from django.utils import timezone
        from datetime import timedelta
        from django.db.models import Count
        
        since = timezone.now() - timedelta(days=days)
        
        stats = {
            'total': cls.objects.filter(created_at__gte=since).count(),
            'by_action': cls.objects.filter(created_at__gte=since).values('action').annotate(count=Count('id')).order_by('-count')[:10],
            'by_severity': cls.objects.filter(created_at__gte=since).values('severity').annotate(count=Count('id')),
            'by_user': cls.objects.filter(created_at__gte=since).values('user__username').annotate(count=Count('id')).order_by('-count')[:10],
            'errors': cls.objects.filter(created_at__gte=since, is_success=False).count(),
            'daily_average': cls.objects.filter(created_at__gte=since).count() / days,
        }
        
        return stats


class AuditLog(models.Model):
    """
    Simplified audit log focused on data changes for compliance.
    Tracks before/after states of model changes.
    """
    
    OPERATION_TYPES = [
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs'
    )
    
    model_name = models.CharField(max_length=100, db_index=True)
    object_id = models.IntegerField(db_index=True)
    object_repr = models.CharField(max_length=200)
    
    operation = models.CharField(max_length=10, choices=OPERATION_TYPES)
    changes = models.JSONField(default=dict)  # {'field_name': {'old': 'value', 'new': 'value'}}
    
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['model_name', 'object_id', '-created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['operation', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.operation} {self.model_name} {self.object_id} by {self.user}"


# Signals to automatically log changes to important models
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver

@receiver(post_save, sender=Appointment)
def log_appointment_change(sender, instance, created, **kwargs):
    """Automatically log appointment changes"""
    if created:
        action = 'appointment_created'
        description = f"Appointment created for {instance.user.username} on {instance.date} at {instance.time}"
    else:
        action = 'appointment_updated'
        description = f"Appointment {instance.id} updated - Status: {instance.status}"
    
    ActivityLog.log(
        user=instance.user,
        action=action,
        description=description,
        entity_type='appointment',
        entity_id=instance.id,
        details={
            'date': str(instance.date),
            'time': str(instance.time),
            'status': instance.status,
            'service': instance.service
        }
    )

@receiver(post_save, sender=Billing)
def log_billing_change(sender, instance, created, **kwargs):
    """Automatically log billing changes"""
    if created:
        action = 'invoice_created'
        description = f"Invoice {instance.invoice_number} created for {instance.user.username}"
    else:
        action = 'invoice_updated'
        description = f"Invoice {instance.invoice_number} updated - Status: {instance.status}"
    
    ActivityLog.log(
        user=instance.user,
        action=action,
        description=description,
        entity_type='billing',
        entity_id=instance.id,
        details={
            'invoice_number': instance.invoice_number,
            'amount': str(instance.total_amount),
            'status': instance.status
        }
    )

@receiver(post_save, sender=PaymentTransaction)
def log_payment_transaction(sender, instance, created, **kwargs):
    """Automatically log payment transactions"""
    if created:
        ActivityLog.log(
            user=instance.processed_by,
            action='payment_made',
            description=f"Payment of {instance.amount} recorded for invoice {instance.bill.invoice_number}",
            entity_type='payment',
            entity_id=instance.id,
            details={
                'amount': str(instance.amount),
                'method': instance.payment_method,
                'invoice': instance.bill.invoice_number
            }
        )