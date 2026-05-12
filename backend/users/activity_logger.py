# utils/activity_logger.py

import time
import logging
from functools import wraps
from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger(__name__)

class ActivityLogger:
    """Utility class for easy activity logging"""
    
    @staticmethod
    def log_user_action(user, action, request=None, **kwargs):
        """Log user action with request context"""
        from .models import ActivityLog
        
        log_kwargs = {
            'user': user,
            'action': action,
            'description': kwargs.get('description', ''),
            'entity_type': kwargs.get('entity_type'),
            'entity_id': kwargs.get('entity_id'),
            'entity_string': kwargs.get('entity_string'),
            'details': kwargs.get('details', {}),
            'severity': kwargs.get('severity', 'info'),
            'is_success': kwargs.get('is_success', True),
            'error_message': kwargs.get('error_message'),
        }
        
        if request:
            log_kwargs.update({
                'ip_address': ActivityLogger.get_client_ip(request),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'request_method': request.method,
                'request_path': request.path,
                'session_id': request.session.session_key,
            })
        
        return ActivityLog.log(**log_kwargs)
    
    @staticmethod
    def get_client_ip(request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    @staticmethod
    def log_performance(user, action, duration_ms, **kwargs):
        """Log performance metrics"""
        from .models import ActivityLog
        
        return ActivityLog.log(
            user=user,
            action=action,
            description=kwargs.get('description', f'Performance metric for {action}'),
            details={**kwargs.get('details', {}), 'duration_ms': duration_ms},
            duration_ms=duration_ms,
            entity_type=kwargs.get('entity_type'),
            entity_id=kwargs.get('entity_id'),
        )
    
    @staticmethod
    def log_bulk_operation(user, operation_type, items_affected, **kwargs):
        """Log bulk operations"""
        from .models import ActivityLog
        
        return ActivityLog.log(
            user=user,
            action='bulk_operation',
            description=f"Bulk {operation_type} operation affected {items_affected} items",
            details={
                'operation_type': operation_type,
                'items_affected': items_affected,
                **kwargs.get('details', {})
            },
            severity='warning' if items_affected > 100 else 'info'
        )


def audit_log(action):
    """Decorator to automatically log function/method calls"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            from .models import ActivityLog
            
            start_time = time.time()
            user = None
            request = None
            
            # Try to extract user and request from arguments
            for arg in args:
                if hasattr(arg, 'user'):
                    user = arg.user
                if hasattr(arg, 'META'):  # This is likely a request object
                    request = arg
            
            try:
                result = func(*args, **kwargs)
                duration_ms = int((time.time() - start_time) * 1000)
                
                ActivityLogger.log_user_action(
                    user=user,
                    action=action,
                    request=request,
                    description=f"Successfully executed {func.__name__}",
                    duration_ms=duration_ms,
                    is_success=True
                )
                return result
            except Exception as e:
                duration_ms = int((time.time() - start_time) * 1000)
                ActivityLogger.log_user_action(
                    user=user,
                    action=action,
                    request=request,
                    description=f"Error in {func.__name__}: {str(e)}",
                    severity='error',
                    is_success=False,
                    error_message=str(e),
                    duration_ms=duration_ms
                )
                raise
        
        return wrapper
    return decorator


class AuditContext:
    """Context manager for auditing long-running operations"""
    
    def __init__(self, user, action, description=None, **kwargs):
        self.user = user
        self.action = action
        self.description = description or f"Performing {action}"
        self.kwargs = kwargs
        self.start_time = None
        self.log_entry = None
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration_ms = int((time.time() - self.start_time) * 1000)
        
        from .models import ActivityLog
        
        self.log_entry = ActivityLog.log(
            user=self.user,
            action=self.action,
            description=self.description,
            duration_ms=duration_ms,
            is_success=exc_type is None,
            error_message=str(exc_val) if exc_val else None,
            **self.kwargs
        )


# Usage example in views:
"""
from utils.activity_logger import ActivityLogger, audit_log, AuditContext

class AppointmentViewSet(viewsets.ModelViewSet):
    
    @audit_log('appointment_created')
    def create(self, request):
        # Your create logic here
        pass
    
    def reschedule_appointment(self, request, pk):
        with AuditContext(
            user=request.user,
            action='appointment_rescheduled',
            description=f"Rescheduling appointment {pk}"
        ) as audit:
            # Your reschedule logic here
            appointment = self.get_object()
            # ... perform reschedule
            audit.description = f"Appointment {pk} rescheduled successfully"
        return Response(...)
"""