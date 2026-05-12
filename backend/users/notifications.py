# notifications_helper.py
from django.utils import timezone
from datetime import timedelta
from .models import Notification, UserNotificationPreference

def create_notification(user, notification_type, title, message, **kwargs):
    """
    Helper function to create a notification
    
    Args:
        user: User instance
        notification_type: Type from NOTIFICATION_TYPES
        title: Notification title
        message: Notification message
        **kwargs: Optional fields (priority, action_url, appointment_id, etc.)
    """
    
    # Check if user wants this type of notification
    try:
        prefs = UserNotificationPreference.objects.get(user=user)
        should_create = False
        
        type_mapping = {
            'appointment_reminder': prefs.notify_appointment_reminders,
            'appointment_confirmed': prefs.notify_appointment_confirmed,
            'appointment_cancelled': prefs.notify_appointment_cancelled,
            'waitlist_match': prefs.notify_waitlist_match,
            'waitlist_position': prefs.notify_waitlist_position,
            'billing_created': prefs.notify_billing_created,
            'billing_reminder': prefs.notify_billing_reminders,
            'payment_received': prefs.notify_payment_received,
            'overdue_payment': prefs.notify_overdue_payment,
            'ai_suggestion': prefs.notify_ai_suggestions,
            'system_alert': prefs.notify_system_alerts,
        }
        
        should_create = type_mapping.get(notification_type, True)
        
        if not should_create:
            return None
    except UserNotificationPreference.DoesNotExist:
        pass  # Default to create
    
    # Determine priority based on notification type if not specified
    priority = kwargs.get('priority')
    if not priority:
        priority_map = {
            'overdue_payment': 4,
            'appointment_reminder_1h': 4,
            'appointment_cancelled': 3,
            'waitlist_match': 3,
            'billing_reminder': 3,
            'appointment_reminder': 2,
            'appointment_confirmed': 2,
            'payment_received': 2,
            'waitlist_position': 1,
            'ai_suggestion': 1,
        }
        priority = priority_map.get(notification_type, 1)
    
    # Set expiration for time-sensitive notifications
    expires_at = kwargs.get('expires_at')
    if not expires_at:
        expiration_map = {
            'appointment_reminder_1h': timezone.now() + timedelta(hours=2),
            'pencil_expiring': timezone.now() + timedelta(minutes=30),
            'reservation_expiring': timezone.now() + timedelta(hours=1),
        }
        expires_at = expiration_map.get(notification_type)
    
    # Create notification
    notification = Notification.objects.create(
        user=user,
        notification_type=notification_type,
        title=title,
        message=message,
        priority=priority,
        expires_at=expires_at,
        action_url=kwargs.get('action_url'),
        action_type=kwargs.get('action_type'),
        action_id=kwargs.get('action_id'),
        appointment_id=kwargs.get('appointment_id'),
        bill_id=kwargs.get('bill_id'),
        waitlist_id=kwargs.get('waitlist_id'),
        metadata=kwargs.get('metadata', {}),
        delivery_channel=kwargs.get('delivery_channel', 'both')
    )
    
    return notification


def send_appointment_reminders():
    """Send reminders for upcoming appointments"""
    from .models import Appointment
    
    # Get appointments for tomorrow
    tomorrow = timezone.now().date() + timedelta(days=1)
    appointments = Appointment.objects.filter(
        date=tomorrow,
        status='confirmed'
    )
    
    for apt in appointments:
        create_notification(
            user=apt.user,
            notification_type='appointment_reminder',
            title='Appointment Tomorrow',
            message=f"You have a {apt.service or 'dental'} appointment tomorrow at {apt.time.strftime('%I:%M %p')}",
            appointment_id=apt.id,
            action_url=f'/appointments/{apt.id}',
            action_type='view_appointment',
            priority=2
        )
    
    # Get appointments for next hour
    now = timezone.now()
    next_hour = now + timedelta(hours=1)
    appointments_hour = Appointment.objects.filter(
        date=now.date(),
        time__gte=now.time(),
        time__lte=next_hour.time(),
        status='confirmed'
    )
    
    for apt in appointments_hour:
        create_notification(
            user=apt.user,
            notification_type='appointment_reminder_1h',
            title='Appointment in 1 Hour',
            message=f"Your {apt.service or 'dental'} appointment is in 1 hour at {apt.time.strftime('%I:%M %p')}",
            appointment_id=apt.id,
            action_url=f'/appointments/{apt.id}',
            action_type='view_appointment',
            priority=4  # Urgent
        )