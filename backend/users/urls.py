from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

# Set up router for standard viewsets
router = DefaultRouter()
router.register('register', RegisterViewset, basename='register')
router.register('login', LoginViewset, basename='login')
router.register('admin-login', AdminLoginViewset, basename='admin-login')
router.register('staff-login', StaffLoginViewset, basename='staff-login')
router.register('users', UserViewset, basename='users')
router.register('appointments', AppointmentViewSet, basename='appointments')
router.register('patient-records', PatientRecordViewSet, basename='patient-records')
router.register('treatment-history', TreatmentHistoryViewSet, basename='treatment-history')
router.register('billing', BillingViewSet, basename='billing')
router.register('payments', PaymentTransactionViewSet, basename='payments') 
router.register('notifications', NotificationViewSet, basename='notifications')
router.register('notification-logs', NotificationLogViewSet, basename='notification-logs')


# Add custom appointment endpoints
custom_appointment_urls = [
    path('appointments/pencil_booking/', AppointmentViewSet.as_view({'post': 'pencil_booking'})),
    path('appointments/confirm_pencil_booking/', AppointmentViewSet.as_view({'post': 'confirm_pencil_booking'})),
    path('appointments/join_waitlist/', AppointmentViewSet.as_view({'post': 'join_waitlist'})),
    path('appointments/waitlist_status/', AppointmentViewSet.as_view({'get': 'waitlist_status'})),
    path('appointments/ai_suggestions/', AppointmentViewSet.as_view({'get': 'ai_suggestions'})),
    path('appointments/check_pencil_booking/', AppointmentViewSet.as_view({'get': 'check_pencil_booking'})),
]

urlpatterns = [
    path('admin/', admin.site.urls),
    # Include router-generated URLs
    path('', include(router.urls)),
    # Include custom appointment URLs
    *custom_appointment_urls,
]
