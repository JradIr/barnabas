from rest_framework import serializers
from .models import *
from django.conf import settings
from django.contrib.auth import get_user_model, authenticate
from datetime import timedelta, date, datetime
User = get_user_model()

# serializers.py
from rest_framework import serializers
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Appointment, Waitlist, AISuggestion, BookingReservation

class AppointmentSerializer(serializers.ModelSerializer):
    user_username = serializers.ReadOnlyField(source='user.username')
    user_email = serializers.ReadOnlyField(source='user.email')
    formatted_date = serializers.SerializerMethodField()
    formatted_time = serializers.SerializerMethodField()
    time_until_expiry = serializers.SerializerMethodField()
    
    class Meta:
        model = Appointment
        fields = [
            'id', 'user', 'user_username', 'user_email', 'date', 'time',
            'service', 'other_concern', 'status', 'pencil_expires_at',
            'waitlist_position', 'ai_suggestion', 'preferred_time',
            'urgency_level', 'notes', 'created_at', 'updated_at',
            'formatted_date', 'formatted_time', 'time_until_expiry'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'pencil_expires_at']
    
    def get_formatted_date(self, obj):
        return obj.date.strftime('%B %d, %Y')
    
    def get_formatted_time(self, obj):
        return obj.time.strftime('%I:%M %p')
    
    def get_time_until_expiry(self, obj):
        if obj.pencil_expires_at and obj.status == 'pencil':
            remaining = (obj.pencil_expires_at - timezone.now()).total_seconds()
            if remaining > 0:
                return int(remaining // 60)
        return None
    
    def validate_date(self, value):
        if value < timezone.now().date():
            raise serializers.ValidationError("Cannot book appointments for past dates")
        return value
    
    def validate(self, data):
        date = data.get('date')
        time = data.get('time')
        service = data.get('service')
        
        if date.weekday() == 6:
            raise serializers.ValidationError({"date": "Clinic is closed on Sundays"})
        
        hour = time.hour
        if hour < 9 or hour >= 18:
            raise serializers.ValidationError({"time": "Clinic hours are 9:00 AM to 6:00 PM"})
        
        if hour == 12:
            raise serializers.ValidationError({"time": "Clinic is closed for lunch from 12:00 PM to 1:00 PM"})
        
        existing_count = Appointment.objects.filter(
            date=date,
            time=time,
            status__in=['pending', 'confirmed', 'pencil']
        ).exclude(id=self.instance.id if self.instance else None).count()
        
        if existing_count >= 2:
            raise serializers.ValidationError({"time": "This time slot is fully booked"})
        
        if service == "Orthodontic Procedure":
            end_time = (datetime.combine(date, time) + timedelta(hours=3)).time()
            
            if time.hour < 12 and end_time.hour > 12:
                raise serializers.ValidationError(
                    {"time": "Orthodontic procedure cannot cross lunch break"}
                )
            
            if end_time.hour > 18 or (end_time.hour == 18 and end_time.minute > 0):
                raise serializers.ValidationError(
                    {"time": "Orthodontic procedure must end by 6:00 PM"}
                )
            
            current_time = time
            for _ in range(6):
                existing = Appointment.objects.filter(
                    date=date,
                    time=current_time,
                    status__in=['pending', 'confirmed', 'pencil']
                ).exclude(id=self.instance.id if self.instance else None).count()
                
                if existing >= 2:
                    raise serializers.ValidationError(
                        {"time": f"Time slot {current_time.strftime('%I:%M %p')} is already booked"}
                    )
                
                current_time = (datetime.combine(date, current_time) + timedelta(minutes=30)).time()
        
        return data
    
    def create(self, validated_data):
        validated_data['status'] = 'pending'
        return super().create(validated_data)

class WaitlistSerializer(serializers.ModelSerializer):
    user_username = serializers.ReadOnlyField(source='user.username')
    position = serializers.SerializerMethodField()
    urgency_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Waitlist
        fields = [
            'id', 'user', 'user_username', 'preferred_date', 
            'preferred_time_start', 'preferred_time_end', 'service_needed',
            'urgency_level', 'urgency_display', 'status', 'position', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'status']
    
    def get_position(self, obj):
        return Waitlist.objects.filter(
            preferred_date=obj.preferred_date,
            urgency_level__gt=obj.urgency_level,
            created_at__lt=obj.created_at,
            status='active'
        ).count() + 1
    
    def get_urgency_display(self, obj):
        return dict(Waitlist._meta.get_field('urgency_level').choices).get(obj.urgency_level)

class AISuggestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AISuggestion
        fields = [
            'id', 'user', 'suggestion_type', 'title', 'description',
            'priority', 'is_read', 'metadata', 'created_at', 'expires_at'
        ]
        read_only_fields = ['id', 'created_at']

class BookingReservationSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingReservation
        fields = ['id', 'user', 'token', 'date', 'time', 'service', 'expires_at', 'is_confirmed', 'created_at']
        read_only_fields = ['id', 'token', 'created_at']



class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()
    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret.pop('password', None)
        return ret

class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')
        extra_kwargs = {'password': {'write_only':True}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user
class PatientRecordSerializer(serializers.ModelSerializer):
    user_username = serializers.ReadOnlyField(source='user.username')
    user_email = serializers.ReadOnlyField(source='user.email')
    user_fullname = serializers.SerializerMethodField()
    
    class Meta:
        model = PatientRecord
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_user_fullname(self, obj):
        return f"{obj.user.firstname or ''} {obj.user.lastname or ''}".strip()


class TreatmentHistorySerializer(serializers.ModelSerializer):
    user_username = serializers.ReadOnlyField(source='user.username')
    balance = serializers.ReadOnlyField()
    
    class Meta:
        model = TreatmentHistory
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'balance']
class BillingSerializer(serializers.ModelSerializer):
    user_username = serializers.ReadOnlyField(source='user.username')
    balance = serializers.ReadOnlyField()
    
    class Meta:
        model = Billing
        fields = '__all__'
        read_only_fields = ['id', 'invoice_number', 'created_at', 'updated_at', 'balance']


class PaymentTransactionSerializer(serializers.ModelSerializer):
    bill_invoice = serializers.ReadOnlyField(source='bill.invoice_number')
    processed_by_name = serializers.ReadOnlyField(source='processed_by.username')
    
    class Meta:
        model = PaymentTransaction
        fields = '__all__'
        read_only_fields = ['id', 'payment_date']
from .models import Notification, UserNotificationPreference, NotificationLog

class NotificationSerializer(serializers.ModelSerializer):
    time_ago = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'notification_type', 'title', 'message',
            'priority', 'delivery_channel', 'is_read', 'read_at',
            'is_delivered', 'delivered_at', 'is_email_sent', 'email_sent_at',
            'action_url', 'action_type', 'action_id',
            'appointment_id', 'bill_id', 'waitlist_id',
            'metadata', 'expires_at', 'created_at', 'updated_at',
            'time_ago', 'is_expired'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'time_ago', 'is_expired']


class UserNotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserNotificationPreference
        exclude = ['user']
        read_only_fields = ['id', 'created_at', 'updated_at']


class NotificationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationLog
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class MarkNotificationsReadSerializer(serializers.Serializer):
    notification_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )
    mark_all = serializers.BooleanField(default=False)