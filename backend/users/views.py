# views.py - Updated with ActivityLog integration

from django.shortcuts import render, redirect
from rest_framework import viewsets, permissions, status
from .serializers import *
from .models import *
from rest_framework.response import Response
from django.contrib.auth import get_user_model, authenticate
from knox.models import AuthToken
from django.conf import settings
from .forms import AppointmentForm
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from collections import Counter
from .ai_service import AIDentalScheduler
from .tasks import (
    expire_pencil_booking, expire_reservation, 
    check_waitlist_for_slots, generate_ai_recommendations
)
from decimal import Decimal
import uuid
from datetime import datetime, timedelta
from django.db import models
from django.db.models import Count, Q
from rest_framework.exceptions import PermissionDenied
from django.utils import timezone

User = get_user_model()


class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.is_staff or user.is_superuser:
            queryset = Appointment.objects.all().select_related('user')
        else:
            queryset = Appointment.objects.filter(user=user)
        
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        user_id = self.request.query_params.get('user_id', None)
        if user_id and (user.is_staff or user.is_superuser):
            queryset = queryset.filter(user_id=user_id)
        
        return queryset.order_by('-date', 'time')
    
    def get_object(self):
        obj = super().get_object()
        
        if self.request.user.is_staff or self.request.user.is_superuser:
            return obj
        
        if obj.user != self.request.user:
            raise PermissionDenied("You don't have permission to access this appointment")
        
        return obj
    
    def create(self, request, *args, **kwargs):
        """Create a new appointment"""
        data = request.data.copy()
        data['user'] = request.user.id
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Log the appointment creation
        ActivityLog.log(
            user=request.user,
            action='appointment_created',
            description=f"Created appointment on {data.get('date')} at {data.get('time')} for {data.get('service')}",
            entity_type='appointment',
            entity_id=serializer.instance.id,
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            request_path=request.path,
            details={
                'date': str(data.get('date')),
                'time': str(data.get('time')),
                'service': data.get('service'),
                'total_price': data.get('total_price'),
                'total_duration': data.get('total_duration')
            }
        )
        
        generate_ai_recommendations.delay()
        
        return Response({
            'message': 'Appointment reserved successfully',
            'appointment': serializer.data
        }, status=status.HTTP_201_CREATED)
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    @action(detail=False, methods=['post'])
    def pencil_booking(self, request):
        """Create a temporary pencil booking (holds slot for 15 minutes)"""
        user = request.user
        date = request.data.get('date')
        time_slot = request.data.get('time')
        service = request.data.get('service')
        
        existing = Appointment.objects.filter(
            date=date,
            time=time_slot,
            status__in=['confirmed', 'pending', 'pencil']
        ).count()
        
        if existing >= 2:
            return Response(
                {'error': 'Slot is no longer available'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        pencil_appt = Appointment.objects.create(
            user=user,
            date=date,
            time=time_slot,
            service=service,
            status='pencil',
            pencil_expires_at=timezone.now() + timedelta(minutes=15)
        )
        
        # Log pencil booking
        ActivityLog.log(
            user=user,
            action='pencil_booking_created',
            description=f"Created pencil booking for {date} at {time_slot}",
            entity_type='appointment',
            entity_id=pencil_appt.id,
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            details={'date': date, 'time': time_slot, 'service': service}
        )
        
        expire_pencil_booking.apply_async(
            args=[pencil_appt.id],
            countdown=900
        )
        
        return Response({
            'message': 'Pencil booking created! You have 15 minutes to confirm.',
            'expires_at': pencil_appt.pencil_expires_at,
            'appointment_id': pencil_appt.id
        })
    
    @action(detail=False, methods=['post'])
    def confirm_pencil_booking(self, request):
        """Convert pencil booking to confirmed appointment"""
        appointment_id = request.data.get('appointment_id')
        
        try:
            appointment = Appointment.objects.get(
                id=appointment_id, 
                user=request.user
            )
            
            if appointment.status != 'pencil':
                return Response(
                    {'error': 'Not a pencil booking'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if appointment.pencil_expires_at < timezone.now():
                appointment.status = 'cancelled'
                appointment.save()
                
                ActivityLog.log(
                    user=request.user,
                    action='pencil_booking_expired',
                    description=f"Pencil booking {appointment_id} expired",
                    entity_type='appointment',
                    entity_id=appointment_id,
                    severity='warning'
                )
                
                return Response(
                    {'error': 'Pencil booking has expired'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            appointment.status = 'pending'
            appointment.pencil_expires_at = None
            appointment.save()
            
            ActivityLog.log(
                user=request.user,
                action='pencil_booking_confirmed',
                description=f"Confirmed pencil booking {appointment_id}",
                entity_type='appointment',
                entity_id=appointment_id,
                details={'old_status': 'pencil', 'new_status': 'pending'}
            )
            
            return Response({
                'message': 'Appointment confirmed successfully!',
                'appointment': AppointmentSerializer(appointment).data
            })
        except Appointment.DoesNotExist:
            return Response(
                {'error': 'Appointment not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'])
    def join_waitlist(self, request):
        """Add user to waitlist"""
        user = request.user
        
        waitlist_entry = Waitlist.objects.create(
            user=user,
            preferred_date=request.data.get('preferred_date'),
            preferred_time_start=request.data.get('time_start'),
            preferred_time_end=request.data.get('time_end'),
            service_needed=request.data.get('service'),
            urgency_level=request.data.get('urgency_level', 1)
        )
        
        position = Waitlist.objects.filter(
            preferred_date=waitlist_entry.preferred_date,
            urgency_level__gte=waitlist_entry.urgency_level,
            created_at__lt=waitlist_entry.created_at,
            status='active'
        ).count() + 1
        
        # Log waitlist join
        ActivityLog.log(
            user=user,
            action='waitlist_joined',
            description=f"Joined waitlist for {waitlist_entry.preferred_date}",
            entity_type='waitlist',
            entity_id=waitlist_entry.id,
            details={
                'preferred_date': str(waitlist_entry.preferred_date),
                'urgency_level': waitlist_entry.urgency_level,
                'position': position
            }
        )
        
        serializer = WaitlistSerializer(waitlist_entry)
        
        return Response({
            'message': 'Added to waitlist successfully',
            'position': position,
            'waitlist': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def waitlist_status(self, request):
        """Get user's position in waitlist"""
        user = request.user
        waitlist_entries = Waitlist.objects.filter(user=user, status='active')
        
        serializer = WaitlistSerializer(waitlist_entries, many=True)
        
        return Response({'waitlist_entries': serializer.data})
    
    @action(detail=False, methods=['get'])
    def ai_suggestions(self, request):
        """Get AI-powered suggestions for the user"""
        user = request.user
        suggestions = AISuggestion.objects.filter(user=user, is_read=False)
        serializer = AISuggestionSerializer(suggestions, many=True)
        
        return Response({'suggestions': serializer.data})
    
    @action(detail=False, methods=['post'])
    def mark_suggestion_read(self, request):
        """Mark AI suggestion as read"""
        suggestion_id = request.data.get('suggestion_id')
        
        try:
            suggestion = AISuggestion.objects.get(
                id=suggestion_id, 
                user=request.user
            )
            suggestion.is_read = True
            suggestion.save()
            
            ActivityLog.log(
                user=request.user,
                action='notification_read',
                description=f"Marked AI suggestion {suggestion_id} as read",
                entity_type='ai_suggestion',
                entity_id=suggestion_id
            )
            
            return Response({'message': 'Suggestion marked as read'})
        except AISuggestion.DoesNotExist:
            return Response(
                {'error': 'Suggestion not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def check_pencil_booking(self, request):
        """Check if user has an active pencil booking"""
        user = request.user
        pencil_booking = Appointment.objects.filter(
            user=user,
            status='pencil',
            pencil_expires_at__gt=timezone.now()
        ).first()
        
        if pencil_booking:
            time_left = (pencil_booking.pencil_expires_at - timezone.now()).seconds // 60
            return Response({
                'has_pencil': True,
                'appointment_id': pencil_booking.id,
                'minutes_left': time_left,
                'expires_at': pencil_booking.pencil_expires_at
            })
        
        return Response({'has_pencil': False})
    
    @action(detail=False, methods=['get'])
    def get_available_slots(self, request):
        """Get available time slots for a specific date"""
        date_str = request.query_params.get('date')
        
        if not date_str:
            return Response(
                {'error': 'Date is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            selected_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if selected_date.weekday() == 6:
            return Response({
                'date': date_str,
                'available_slots': [],
                'detailed_slots': [],
                'daily_booked_count': 0,
                'daily_limit': 10,
                'message': 'Clinic is closed on Sundays'
            })
        
        duration_param = request.query_params.get('duration')
        duration = int(duration_param) if duration_param else 60
        
        all_slots_24h = [
            '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
            '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
            '16:00', '16:30', '17:00', '17:30'
        ]
        
        booked_appointments = Appointment.objects.filter(
            date=selected_date,
            status__in=['confirmed', 'pending', 'pencil']
        )
        
        booked_times = [apt.time.strftime('%H:%M') for apt in booked_appointments]
        booked_count = Counter(booked_times)
        
        daily_booked_count = Appointment.objects.filter(
            date=selected_date,
            status__in=['confirmed', 'pending']
        ).count()
        DAILY_LIMIT = 10
        
        def to_ampm(time_24h):
            try:
                hour = int(time_24h.split(':')[0])
                minute = time_24h.split(':')[1]
                ampm = 'AM' if hour < 12 else 'PM'
                hour_12 = hour if hour <= 12 else hour - 12
                if hour_12 == 0:
                    hour_12 = 12
                return f"{hour_12}:{minute} {ampm}"
            except:
                return time_24h
        
        available_time_strings = []
        detailed_slots = []
        
        for slot_time in all_slots_24h:
            slot_hour = int(slot_time.split(':')[0])
            slot_minute = int(slot_time.split(':')[1])
            
            end_minute = slot_minute + duration
            end_hour = slot_hour + (end_minute // 60)
            end_minute = end_minute % 60
            
            end_time_24h = f"{end_hour:02d}:{end_minute:02d}"
            
            if end_hour > 18 or (end_hour == 18 and end_minute > 0):
                continue
            
            starts_before_lunch = slot_hour < 12 or (slot_hour == 12 and slot_minute == 0)
            ends_after_lunch = end_hour > 12 or (end_hour == 12 and end_minute > 0)
            
            if starts_before_lunch and ends_after_lunch:
                continue
            
            count = booked_count.get(slot_time, 0)
            
            if count < 2 and daily_booked_count < DAILY_LIMIT:
                start_ampm = to_ampm(slot_time)
                end_ampm = to_ampm(end_time_24h)
                
                available_time_strings.append(slot_time)
                detailed_slots.append({
                    'time': start_ampm,
                    'timeValue': slot_time,
                    'endTime': end_ampm,
                    'endTimeValue': end_time_24h,
                    'available_spots': 2 - count,
                    'duration': duration,
                    'startHour': slot_hour,
                    'startMinute': slot_minute,
                    'endHour': end_hour,
                    'endMinute': end_minute
                })
        
        all_slots_ampm = [to_ampm(slot) for slot in all_slots_24h]
        
        return Response({
            'date': date_str,
            'available_slots': available_time_strings,
            'available_slots_ampm': [to_ampm(slot) for slot in available_time_strings],
            'detailed_slots': detailed_slots,
            'all_slots': all_slots_ampm,
            'daily_booked_count': daily_booked_count,
            'daily_limit': DAILY_LIMIT,
            'total_duration': duration,
            'clinic_hours': {
                'open': '9:00 AM',
                'close': '6:00 PM',
                'lunch_start': '12:00 PM',
                'lunch_end': '1:00 PM'
            }
        })
    
    @action(detail=False, methods=['post'])
    def create_reservation(self, request):
        """Create a booking reservation with unique token"""
        user = request.user
        token = str(uuid.uuid4())[:8]
        
        reservation = BookingReservation.objects.create(
            user=user,
            token=token,
            date=request.data.get('date'),
            time=request.data.get('time'),
            service=request.data.get('service'),
            expires_at=timezone.now() + timedelta(minutes=30)
        )
        
        ActivityLog.log(
            user=user,
            action='api_key_created',
            description=f"Created reservation with token {token}",
            entity_type='booking_reservation',
            entity_id=reservation.id,
            details={'token': token, 'expires_at': str(reservation.expires_at)}
        )
        
        expire_reservation.apply_async(
            args=[token],
            countdown=1800
        )
        
        serializer = BookingReservationSerializer(reservation)
        
        return Response({
            'message': 'Reservation created successfully',
            'reservation': serializer.data,
            'token': token
        })
    
    @action(detail=False, methods=['post'])
    def confirm_reservation(self, request):
        """Confirm a reservation and convert to appointment"""
        token = request.data.get('token')
        
        try:
            reservation = BookingReservation.objects.get(
                token=token,
                is_confirmed=False,
                expires_at__gt=timezone.now()
            )
            
            appointment = Appointment.objects.create(
                user=reservation.user,
                date=reservation.date,
                time=reservation.time,
                service=reservation.service,
                status='pending'
            )
            
            reservation.is_confirmed = True
            reservation.save()
            
            ActivityLog.log(
                user=request.user,
                action='appointment_created',
                description=f"Confirmed reservation {token} into appointment {appointment.id}",
                entity_type='appointment',
                entity_id=appointment.id,
                details={'token': token, 'reservation_id': reservation.id}
            )
            
            return Response({
                'message': 'Reservation confirmed successfully',
                'appointment': AppointmentSerializer(appointment).data
            })
        except BookingReservation.DoesNotExist:
            return Response(
                {'error': 'Invalid or expired reservation token'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def admin_all_appointments(self, request):
        """Admin endpoint to get all appointments with user details"""
        if not (request.user.is_staff or request.user.is_superuser):
            ActivityLog.log(
                user=request.user,
                action='permission_denied',
                description="Attempted to access admin_all_appointments without admin rights",
                severity='warning'
            )
            return Response(
                {'error': 'Admin access required'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        queryset = Appointment.objects.all().select_related('user').order_by('-date', 'time')
        
        status_filter = request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        start_date = request.query_params.get('start_date', None)
        end_date = request.query_params.get('end_date', None)
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        user_id = request.query_params.get('user_id', None)
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Log admin report generation
        ActivityLog.log(
            user=request.user,
            action='admin_report_generated',
            description="Generated appointments report",
            details={
                'filters': {
                    'status': status_filter,
                    'start_date': start_date,
                    'end_date': end_date,
                    'user_id': user_id
                },
                'count': queryset.count()
            }
        )
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'count': queryset.count(),
            'appointments': serializer.data
        })
    
    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated])
    def admin_update_status(self, request, pk=None):
        """Admin endpoint to update any appointment's status"""
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {'error': 'Admin access required'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        appointment = self.get_object()
        new_status = request.data.get('status')
        
        valid_statuses = ['pending', 'confirmed', 'cancelled', 'completed', 'pencil', 'waiting']
        if new_status not in valid_statuses:
            return Response(
                {'error': f'Invalid status. Must be one of: {valid_statuses}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_status = appointment.status
        appointment.status = new_status
        
        if new_status == 'confirmed' and appointment.pencil_expires_at:
            appointment.pencil_expires_at = None
        
        appointment.save()
        
        # Log status change
        ActivityLog.log(
            user=request.user,
            action='appointment_updated',
            description=f"Admin changed appointment {pk} status from {old_status} to {new_status}",
            entity_type='appointment',
            entity_id=appointment.id,
            details={'old_status': old_status, 'new_status': new_status}
        )
        
        return Response({
            'message': f'Appointment status changed from {old_status} to {new_status}',
            'appointment': AppointmentSerializer(appointment).data
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def admin_confirm(self, request, pk=None):
        """Admin endpoint to confirm an appointment"""
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {'error': 'Admin access required'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        appointment = self.get_object()
        
        if appointment.status not in ['pending', 'pencil']:
            return Response(
                {'error': f'Cannot confirm appointment with status: {appointment.status}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        appointment.status = 'confirmed'
        if appointment.pencil_expires_at:
            appointment.pencil_expires_at = None
        appointment.save()
        
        ActivityLog.log(
            user=request.user,
            action='appointment_confirmed',
            description=f"Admin confirmed appointment {pk}",
            entity_type='appointment',
            entity_id=appointment.id
        )
        
        return Response({
            'message': 'Appointment confirmed successfully',
            'appointment': AppointmentSerializer(appointment).data
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def admin_cancel(self, request, pk=None):
        """Admin endpoint to cancel an appointment"""
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {'error': 'Admin access required'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        appointment = self.get_object()
        
        if appointment.status in ['completed', 'cancelled']:
            return Response(
                {'error': f'Cannot cancel appointment with status: {appointment.status}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        appointment.status = 'cancelled'
        appointment.save()
        
        ActivityLog.log(
            user=request.user,
            action='appointment_cancelled',
            description=f"Admin cancelled appointment {pk}",
            entity_type='appointment',
            entity_id=appointment.id,
            details={'reason': request.data.get('reason', 'No reason provided')}
        )
        
        check_waitlist_for_slots.delay()
        
        return Response({
            'message': 'Appointment cancelled successfully',
            'appointment': AppointmentSerializer(appointment).data
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def admin_complete(self, request, pk=None):
        """Admin endpoint to mark appointment as completed"""
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {'error': 'Admin access required'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        appointment = self.get_object()
        
        if appointment.status != 'confirmed':
            return Response(
                {'error': f'Only confirmed appointments can be completed. Current status: {appointment.status}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        appointment.status = 'completed'
        appointment.save()
        
        ActivityLog.log(
            user=request.user,
            action='appointment_completed',
            description=f"Admin marked appointment {pk} as completed",
            entity_type='appointment',
            entity_id=appointment.id
        )
        
        return Response({
            'message': 'Appointment marked as completed',
            'appointment': AppointmentSerializer(appointment).data
        })
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def admin_stats(self, request):
        """Get comprehensive statistics for admin dashboard"""
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {'error': 'Admin access required'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Basic stats
        stats = {
            'total': Appointment.objects.count(),
            'pending': Appointment.objects.filter(status='pending').count(),
            'pencil': Appointment.objects.filter(status='pencil').count(),
            'confirmed': Appointment.objects.filter(status='confirmed').count(),
            'completed': Appointment.objects.filter(status='completed').count(),
            'cancelled': Appointment.objects.filter(status='cancelled').count(),
            'waiting': Appointment.objects.filter(status='waiting').count(),
        }
        
        today = timezone.now().date()
        stats['today'] = Appointment.objects.filter(date=today).exclude(status='cancelled').count()
        
        next_week = today + timedelta(days=7)
        stats['upcoming'] = Appointment.objects.filter(
            date__range=[today, next_week]
        ).exclude(status='cancelled').count()
        
        users_data = Appointment.objects.values('user__username', 'user__email').annotate(
            total=Count('id'),
            pending=Count('id', filter=Q(status='pending')),
            confirmed=Count('id', filter=Q(status='confirmed')),
            completed=Count('id', filter=Q(status='completed')),
            cancelled=Count('id', filter=Q(status='cancelled'))
        ).order_by('-total')[:10]
        
        stats['top_users'] = list(users_data)
        
        last_30_days = today - timedelta(days=30)
        daily_stats = Appointment.objects.filter(
            date__gte=last_30_days
        ).values('date').annotate(
            count=Count('id')
        ).order_by('date')
        
        stats['daily'] = list(daily_stats)
        stats['waitlist_active'] = Waitlist.objects.filter(status='active').count()
        stats['waitlist_notified'] = Waitlist.objects.filter(status='notified').count()
        stats['unread_suggestions'] = AISuggestion.objects.filter(is_read=False).count()
        stats['total_suggestions'] = AISuggestion.objects.count()
        
        # Log stats access
        ActivityLog.log(
            user=request.user,
            action='admin_report_generated',
            description="Generated admin statistics dashboard",
            details={'stats_summary': stats}
        )
        
        return Response(stats)
    
    def update(self, request, *args, **kwargs):
        """Update appointment status (allows status updates for both admin and users)"""
        instance = self.get_object()
        
        is_admin = request.user.is_staff or request.user.is_superuser
        is_owner = instance.user == request.user
        
        if not (is_admin or is_owner):
            return Response(
                {'error': 'You do not have permission to update this appointment'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if 'status' in request.data:
            new_status = request.data['status']
            old_status = instance.status
            
            if not is_admin:
                if new_status not in ['cancelled']:
                    return Response(
                        {'error': 'Regular users can only cancel appointments'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                if old_status not in ['pending', 'confirmed']:
                    return Response(
                        {'error': 'Only pending or confirmed appointments can be cancelled'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            instance.status = new_status
            instance.save()
            
            ActivityLog.log(
                user=request.user,
                action='appointment_updated',
                description=f"User updated appointment {instance.id} status from {old_status} to {new_status}",
                entity_type='appointment',
                entity_id=instance.id,
                details={'old_status': old_status, 'new_status': new_status}
            )
            
            serializer = self.get_serializer(instance)
            return Response({
                'message': f'Appointment {instance.status} successfully',
                'appointment': serializer.data
            })
        
        return Response(
            {'error': 'Only status updates are allowed'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    def destroy(self, request, *args, **kwargs):
        """Cancel an appointment"""
        instance = self.get_object()
        
        is_admin = request.user.is_staff or request.user.is_superuser
        is_owner = instance.user == request.user
        
        if not (is_admin or is_owner):
            return Response(
                {'error': 'You do not have permission to cancel this appointment'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if instance.status in ['pending', 'confirmed']:
            old_status = instance.status
            instance.status = 'cancelled'
            instance.save()
            
            ActivityLog.log(
                user=request.user,
                action='appointment_cancelled',
                description=f"User cancelled appointment {instance.id}",
                entity_type='appointment',
                entity_id=instance.id,
                details={'old_status': old_status, 'new_status': 'cancelled'}
            )
            
            if is_admin:
                check_waitlist_for_slots.delay()
            
            return Response({
                'message': 'Appointment cancelled successfully'
            }, status=status.HTTP_200_OK)
        
        return Response(
            {'error': f'Cannot cancel appointment with status: {instance.status}'}, 
            status=status.HTTP_400_BAD_REQUEST
        )


class LoginViewset(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]
    serializer_class = LoginSerializer
    
    def create(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']
            user = authenticate(request, email=email, password=password)

            if user:
                _, token = AuthToken.objects.create(user)
                
                # Log successful login
                ActivityLog.log(
                    user=user,
                    action='login',
                    description=f"User {user.email} logged in successfully",
                    ip_address=self.get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    details={'email': email}
                )
                
                return Response(
                    {
                        'user': {'id': user.id, 'email': user.email},
                        'token': token
                    }
                )
            else:
                # Log failed login attempt
                ActivityLog.log_system_event(
                    action='login_failed',
                    description=f"Failed login attempt for email: {email}",
                    ip_address=self.get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    severity='warning',
                    details={'email': email}
                )
                
                return Response({'error': 'invalid credentials'}, status=401)
        else:
            return Response(serializer.errors, status=400)
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class RegisterViewset(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]
    queryset = User.objects.all()
    serializer_class = RegisterSerializer

    def create(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Log account creation
            ActivityLog.log(
                user=user,
                action='account_created',
                description=f"New account created for {user.email}",
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                details={'email': user.email, 'username': user.username}
            )
            
            return Response(serializer.data)
        else:
            return Response(serializer.errors, status=400)
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class UserViewset(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = User.objects.all()
    serializer_class = RegisterSerializer

    def list(self, request):
        queryset = User.objects.all()
        serializer = self.serializer_class(queryset, many=True)
        return Response(serializer.data)
    
    def retrieve(self, request, pk=None):
        """Get user by ID with logging"""
        try:
            user = User.objects.get(pk=pk)
            
            # Check if user has permission to view this user
            if not (request.user.is_staff or request.user.is_superuser or request.user.id == user.id):
                ActivityLog.log(
                    user=request.user,
                    action='permission_denied',
                    description=f"Attempted to access user {pk} without permission",
                    severity='warning'
                )
                return Response({'error': 'Permission denied'}, status=403)
            
            serializer = self.serializer_class(user)
            
            ActivityLog.log(
                user=request.user,
                action='patient_record_viewed',
                description=f"Viewed user profile for {user.email}",
                entity_type='user',
                entity_id=user.id
            )
            
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

# Add this to your views.py file

class StaffLoginViewset(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]
    serializer_class = LoginSerializer
    
    def create(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']
            user = authenticate(request, email=email, password=password)
            
            # Check if user exists, is active, and is staff (not superuser)
            if user and user.is_active and (user.is_staff or not user.is_superuser):
                _, token = AuthToken.objects.create(user)
                
                # Log staff login
                ActivityLog.log(
                    user=user,
                    action='login',
                    description=f"Staff {user.email} logged in",
                    ip_address=self.get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    severity='info',
                    details={
                        'email': email, 
                        'is_staff': user.is_staff,
                        'user_id': user.id
                    }
                )
                
                return Response(
                    {
                        'user': {
                            'id': user.id, 
                            'email': user.email, 
                            'username': user.username,
                            'firstname': user.firstname,
                            'lastname': user.lastname,
                            'is_staff': user.is_staff,
                            'is_superuser': user.is_superuser,
                            'is_active': user.is_active
                        },
                        'token': token
                    }
                )
            else:
                # Determine if user exists but is inactive or not staff
                error_message = 'Invalid credentials'
                
                try:
                    existing_user = User.objects.get(email=email)
                    if not existing_user.is_active:
                        error_message = 'Account is deactivated. Please contact administrator.'
                    elif not existing_user.is_staff and not existing_user.is_superuser:
                        error_message = 'Access denied. Staff privileges required.'
                except User.DoesNotExist:
                    pass
                
                # Log failed staff login attempt
                ActivityLog.log_system_event(
                    action='login_failed',
                    description=f"Failed staff login attempt for email: {email}",
                    ip_address=self.get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    severity='warning',
                    details={
                        'email': email, 
                        'attempted_staff': True,
                        'reason': error_message
                    }
                )
                
                return Response({'error': error_message}, status=status.HTTP_401_UNAUTHORIZED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
class AdminLoginViewset(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]
    serializer_class = LoginSerializer
    
    def create(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']
            user = authenticate(request, email=email, password=password)

            if user and user.is_superuser:
                _, token = AuthToken.objects.create(user)
                
                # Log admin login
                ActivityLog.log(
                    user=user,
                    action='admin_login',
                    description=f"Admin {user.email} logged in",
                    ip_address=self.get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    severity='info',
                    details={'email': email, 'is_superuser': user.is_superuser}
                )
                
                return Response(
                    {
                        'user': {'id': user.id, 'email': user.email, 'is_superuser': user.is_superuser},
                        'token': token
                    }
                )
            else:
                # Log failed admin login
                ActivityLog.log_system_event(
                    action='login_failed',
                    description=f"Failed admin login attempt for email: {email}",
                    ip_address=self.get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    severity='warning',
                    details={'email': email, 'attempted_admin': True}
                )
                
                return Response({'error': 'invalid credentials'}, status=401)
        else:
            return Response(serializer.errors, status=400)
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class PatientRecordViewSet(viewsets.ModelViewSet):
    serializer_class = PatientRecordSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return PatientRecord.objects.all().select_related('user')
        return PatientRecord.objects.filter(user=user)
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        transformed_data = []
        for item in serializer.data:
            transformed_data.append({
                'id': item.get('id'),
                'patient': item.get('user_fullname') or item.get('user_username'),
                'contact': item.get('emergency_contact_phone') or 'N/A',
                'medical_history': item.get('medical_conditions') or item.get('allergies') or '',
                'last_visit': self._get_last_visit_date(item.get('user')),
                'email': item.get('user_email'),
                'blood_type': item.get('blood_type'),
                'allergies': item.get('allergies')
            })
        
        ActivityLog.log(
            user=request.user,
            action='patient_record_viewed',
            description=f"Viewed patient records list, found {len(transformed_data)} records",
            details={'count': len(transformed_data)}
        )
        
        return Response(transformed_data)
    
    def _get_last_visit_date(self, user_id):
        last_appointment = Appointment.objects.filter(
            user_id=user_id,
            status='completed'
        ).order_by('-date').first()
        
        if last_appointment:
            return last_appointment.date.strftime('%Y-%m-%d')
        return None
    
    def get_object(self):
        obj = super().get_object()
        if not (self.request.user.is_staff or self.request.user.is_superuser or obj.user == self.request.user):
            raise PermissionDenied("You don't have permission to access this record")
        return obj
    
    @action(detail=False, methods=['get', 'post'])
    def my_record(self, request):
        """Get or create current user's patient record"""
        record, created = PatientRecord.objects.get_or_create(user=request.user)
        
        if created:
            ActivityLog.log(
                user=request.user,
                action='patient_record_created',
                description=f"Created patient record for {request.user.email}",
                entity_type='patient_record',
                entity_id=record.id
            )
        
        serializer = self.get_serializer(record)
        return Response(serializer.data)
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        ActivityLog.log(
            user=request.user,
            action='patient_record_updated',
            description=f"Updated patient record for {instance.user.email}",
            entity_type='patient_record',
            entity_id=instance.id,
            details={'updated_fields': list(request.data.keys())}
        )
        
        return Response(serializer.data)


class TreatmentHistoryViewSet(viewsets.ModelViewSet):
    """Manage patient treatment history"""
    serializer_class = TreatmentHistorySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return TreatmentHistory.objects.all().select_related('user', 'appointment')
        return TreatmentHistory.objects.filter(user=user)
    
    def perform_create(self, serializer):
        treatment = serializer.save(user=self.request.user)
        
        ActivityLog.log(
            user=self.request.user,
            action='treatment_history_added',
            description=f"Added treatment history: {treatment.get_treatment_type_display()}",
            entity_type='treatment_history',
            entity_id=treatment.id,
            details={
                'treatment_type': treatment.treatment_type,
                'cost': str(treatment.cost),
                'treatment_date': str(treatment.treatment_date)
            }
        )
    
    @action(detail=False, methods=['get'])
    def patient_history(self, request):
        """Get treatment history for a specific patient (admin only)"""
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({'error': 'Admin access required'}, status=403)
        
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response({'error': 'user_id required'}, status=400)
        
        history = TreatmentHistory.objects.filter(user_id=user_id)
        serializer = self.get_serializer(history, many=True)
        
        ActivityLog.log(
            user=request.user,
            action='patient_record_viewed',
            description=f"Admin viewed treatment history for user {user_id}",
            details={'user_id': user_id, 'records_count': history.count()}
        )
        
        return Response(serializer.data)


class BillingViewSet(viewsets.ModelViewSet):
    serializer_class = BillingSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return Billing.objects.all().select_related('user', 'appointment', 'treatment')
        return Billing.objects.filter(user=user)
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        transformed_data = []
        for item in serializer.data:
            transformed_data.append({
                'id': item.get('id'),
                'invoice_number': item.get('invoice_number'),
                'amount': str(item.get('total_amount')),
                'status': item.get('status'),
                'patient_name': item.get('user_username'),
                'due_date': item.get('due_date'),
                'balance': str(item.get('balance'))
            })
        
        return Response(transformed_data)
    
    @action(detail=False, methods=['get'])
    def my_bills(self, request):
        """Get current user's bills"""
        bills = Billing.objects.filter(user=request.user)
        serializer = self.get_serializer(bills, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def record_payment(self, request, pk=None):
        """Record a payment for a bill"""
        bill = self.get_object()
        
        amount = request.data.get('amount')
        payment_method = request.data.get('payment_method')
        reference_number = request.data.get('reference_number', '')
        notes = request.data.get('notes', '')
        
        if not amount or not payment_method:
            return Response({'error': 'Amount and payment method required'}, status=400)
        
        amount = Decimal(str(amount))
        
        if amount <= 0:
            return Response({'error': 'Amount must be positive'}, status=400)
        
        if bill.paid_amount + amount > bill.total_amount:
            return Response({'error': 'Payment exceeds total amount'}, status=400)
        
        transaction = PaymentTransaction.objects.create(
            bill=bill,
            amount=amount,
            payment_method=payment_method,
            reference_number=reference_number,
            processed_by=request.user,
            notes=notes
        )
        
        bill.paid_amount += amount
        bill.payment_method = payment_method
        bill.payment_date = timezone.now()
        
        if bill.paid_amount >= bill.total_amount:
            bill.status = 'paid'
        elif bill.paid_amount > 0:
            bill.status = 'partial'
        
        bill.save()
        
        # Log payment
        ActivityLog.log(
            user=request.user,
            action='payment_made',
            description=f"Payment of {amount} recorded for invoice {bill.invoice_number}",
            entity_type='payment',
            entity_id=transaction.id,
            details={
                'amount': str(amount),
                'payment_method': payment_method,
                'invoice_number': bill.invoice_number,
                'reference_number': reference_number
            }
        )
        
        if 'braces' in bill.description.lower() and not bill.braces_down_payment_approved:
            AISuggestion.objects.create(
                user=bill.user,
                suggestion_type='reminder',
                title='Braces Down Payment',
                description=f"Braces down payment of ₱{bill.braces_down_payment_amount} requires approval.",
                priority=2
            )
        
        return Response({
            'message': 'Payment recorded successfully',
            'transaction': PaymentTransactionSerializer(transaction).data,
            'bill': self.get_serializer(bill).data
        })
    
    @action(detail=True, methods=['post'])
    def approve_braces_down_payment(self, request, pk=None):
        """Admin approves braces down payment"""
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({'error': 'Admin access required'}, status=403)
        
        bill = self.get_object()
        bill.braces_down_payment_approved = True
        bill.save()
        
        ActivityLog.log(
            user=request.user,
            action='braces_downpayment_approved',
            description=f"Approved braces down payment for invoice {bill.invoice_number}",
            entity_type='billing',
            entity_id=bill.id,
            details={'invoice_number': bill.invoice_number, 'amount': str(bill.total_amount)}
        )
        
        return Response({'message': 'Braces down payment approved'})
    
    @action(detail=False, methods=['get'])
    def pending_payments(self, request):
        """Get all pending/overdue payments (admin only)"""
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({'error': 'Admin access required'}, status=403)
        
        pending_bills = Billing.objects.filter(status__in=['pending', 'partial', 'overdue'])
        serializer = self.get_serializer(pending_bills, many=True)
        
        ActivityLog.log(
            user=request.user,
            action='admin_report_generated',
            description=f"Generated pending payments report, found {pending_bills.count()} items",
            details={'pending_count': pending_bills.count()}
        )
        
        return Response(serializer.data)


class PaymentTransactionViewSet(viewsets.ModelViewSet):
    """ViewSet for payment transactions"""
    serializer_class = PaymentTransactionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return PaymentTransaction.objects.all().select_related('bill', 'processed_by')
        return PaymentTransaction.objects.filter(bill__user=user)
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        transformed_data = []
        for item in serializer.data:
            transformed_data.append({
                'id': item.get('id'),
                'amount': item.get('amount'),
                'method': item.get('payment_method'),
                'transaction_id': item.get('reference_number'),
                'payment_date': item.get('payment_date'),
                'bill_id': item.get('bill'),
                'status': 'completed'
            })
        
        return Response(transformed_data)


class NotificationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing user notifications"""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.is_staff or user.is_superuser:
            queryset = Notification.objects.all()
        else:
            queryset = Notification.objects.filter(user=user)
        
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            is_read_bool = is_read.lower() == 'true'
            queryset = queryset.filter(is_read=is_read_bool)
        
        notification_type = self.request.query_params.get('type')
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        
        priority = self.request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)
        
        include_expired = self.request.query_params.get('include_expired', 'false')
        if include_expired.lower() != 'true':
            queryset = queryset.filter(
                models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=timezone.now())
            )
        
        return queryset
    
    def perform_create(self, serializer):
        notification = serializer.save()
        
        try:
            prefs = UserNotificationPreference.objects.get(user=notification.user)
        except UserNotificationPreference.DoesNotExist:
            prefs = None
        
        channels = []
        if prefs:
            if prefs.should_send_in_app(notification.notification_type):
                channels.append('in_app')
            if prefs.should_send_email(notification.notification_type):
                channels.append('email')
        else:
            channels = ['in_app', 'email']
        
        for channel in channels:
            NotificationLog.objects.create(
                notification=notification,
                channel=channel,
                status='pending'
            )
            
            if channel == 'email' and notification.delivery_channel in ['email', 'both']:
                from .tasks import send_notification_email
                send_notification_email.delay(notification.id)
        
        ActivityLog.log(
            user=notification.user,
            action='notification_sent',
            description=f"Notification sent: {notification.title}",
            entity_type='notification',
            entity_id=notification.id,
            details={
                'notification_type': notification.notification_type,
                'priority': notification.priority,
                'channels': channels
            }
        )
    
    @action(detail=False, methods=['post'])
    def mark_read(self, request):
        """Mark one or more notifications as read"""
        serializer = MarkNotificationsReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        notification_ids = serializer.validated_data.get('notification_ids', [])
        mark_all = serializer.validated_data.get('mark_all', False)
        
        if mark_all:
            updated = Notification.objects.filter(
                user=user,
                is_read=False
            ).update(is_read=True, read_at=timezone.now())
            
            ActivityLog.log(
                user=user,
                action='notification_read',
                description=f"Marked all {updated} notifications as read",
                details={'count': updated, 'mark_all': True}
            )
            
            return Response({
                'message': f'Marked {updated} notifications as read'
            })
        
        if notification_ids:
            notifications = Notification.objects.filter(
                id__in=notification_ids,
                user=user
            )
            count = notifications.count()
            notifications.update(is_read=True, read_at=timezone.now())
            
            for notif in notifications:
                NotificationLog.objects.filter(
                    notification=notif,
                    channel='in_app'
                ).update(status='read')
            
            ActivityLog.log(
                user=user,
                action='notification_read',
                description=f"Marked {count} notifications as read",
                details={'notification_ids': notification_ids, 'count': count}
            )
            
            return Response({
                'message': f'Marked {count} notifications as read'
            })
        
        return Response(
            {'error': 'No notifications specified'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications"""
        user = request.user
        count = Notification.objects.filter(
            user=user,
            is_read=False
        ).exclude(
            expires_at__lt=timezone.now()
        ).count()
        
        return Response({'unread_count': count})
    
    @action(detail=False, methods=['get'])
    def preferences(self, request):
        """Get or create user's notification preferences"""
        prefs, created = UserNotificationPreference.objects.get_or_create(
            user=request.user
        )
        serializer = UserNotificationPreferenceSerializer(prefs)
        return Response(serializer.data)
    
    @action(detail=False, methods=['put', 'patch'])
    def update_preferences(self, request):
        """Update user's notification preferences"""
        prefs, created = UserNotificationPreference.objects.get_or_create(
            user=request.user
        )
        serializer = UserNotificationPreferenceSerializer(
            prefs,
            data=request.data,
            partial=request.method == 'PATCH'
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        ActivityLog.log(
            user=request.user,
            action='account_updated',
            description="Updated notification preferences",
            details={'updated_preferences': list(request.data.keys())}
        )
        
        return Response(serializer.data)


class NotificationLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing notification logs (admin only)"""
    serializer_class = NotificationLogSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return NotificationLog.objects.all().select_related('notification')
        return NotificationLog.objects.none()


# AI Waitlist Recommendations Action
@action(detail=False, methods=['get'])
def ai_waitlist_recommendations(self, request):
    """Get AI-powered waitlist recommendations using Gemini API"""
    user = request.user
    
    if not (user.is_staff or user.is_superuser):
        return Response({'error': 'Admin access required'}, status=403)
    
    waitlist_entries = Waitlist.objects.filter(status='active').select_related('user')
    
    if not waitlist_entries.exists():
        return Response({'message': 'No active waitlist entries', 'recommendations': []})
    
    from datetime import datetime, timedelta
    available_slots = []
    
    for days_ahead in range(7):
        check_date = timezone.now().date() + timedelta(days=days_ahead)
        
        all_slots = [
            '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
            '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
            '16:00', '16:30', '17:00', '17:30'
        ]
        
        booked = Appointment.objects.filter(
            date=check_date,
            status__in=['confirmed', 'pending', 'pencil']
        ).values_list('time', flat=True)
        
        booked_times = [t.strftime('%H:%M') for t in booked]
        booked_count = Counter(booked_times)
        
        for slot in all_slots:
            if booked_count.get(slot, 0) < 2:
                available_slots.append({
                    'date': check_date.strftime('%Y-%m-%d'),
                    'time': slot,
                    'timeValue': slot
                })
    
    waitlist_data = []
    for wl in waitlist_entries:
        days_waiting = (timezone.now().date() - wl.created_at.date()).days
        waitlist_data.append({
            'user_id': wl.user.id,
            'username': wl.user.username,
            'preferred_date': wl.preferred_date.strftime('%Y-%m-%d'),
            'preferred_time_start': wl.preferred_time_start.strftime('%H:%M'),
            'preferred_time_end': wl.preferred_time_end.strftime('%H:%M'),
            'urgency_level': wl.urgency_level,
            'service_needed': wl.service_needed,
            'days_waiting': days_waiting
        })
    
    recommendations = AIDentalScheduler.get_waitlist_recommendation(
        waitlist_data, 
        available_slots[:50]
    )
    
    for rec in recommendations:
        try:
            target_user = User.objects.get(id=rec['user_id'])
            AISuggestion.objects.create(
                user=target_user,
                suggestion_type='waitlist_opportunity',
                title='Waitlist Slot Available!',
                description=f"AI recommends booking at {rec['recommended_slot']}. {rec.get('reason', 'Match found')}",
                priority=rec.get('priority', 1),
                metadata={'slot': rec['recommended_slot'], 'score': rec['match_score']}
            )
        except User.DoesNotExist:
            pass
    
    ActivityLog.log(
        user=request.user,
        action='ai_suggestion_generated',
        description=f"Generated {len(recommendations)} AI waitlist recommendations",
        details={'recommendations_count': len(recommendations), 'waitlist_count': waitlist_entries.count()}
    )
    
    return Response({
        'recommendations': recommendations,
        'waitlist_count': waitlist_entries.count(),
        'available_slots_count': len(available_slots)
    })