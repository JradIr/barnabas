# ai_service.py
import google.generativeai as genai
from django.conf import settings
from datetime import datetime, timedelta
import json

# Configure Gemini API
# Add GEMINI_API_KEY to your settings.py
genai.configure(api_key=settings.GEMINI_API_KEY)

class AIDentalScheduler:
    """AI-powered dental scheduling assistant using Gemini API"""
    
    @staticmethod
    def get_waitlist_recommendation(waitlist_entries, available_slots):
        """
        Use Gemini API to recommend optimal waitlist matching
        
        Args:
            waitlist_entries: List of waitlist dicts with user preferences
            available_slots: List of available time slots
        
        Returns:
            List of recommendations with match scores
        """
        if not waitlist_entries or not available_slots:
            return []
        
        # Prepare data for Gemini
        waitlist_data = []
        for entry in waitlist_entries:
            waitlist_data.append({
                'user_id': entry['user_id'],
                'username': entry['username'],
                'preferred_date': entry['preferred_date'],
                'preferred_time_start': entry['preferred_time_start'],
                'preferred_time_end': entry['preferred_time_end'],
                'urgency_level': entry['urgency_level'],
                'service_needed': entry['service_needed'],
                'days_waiting': entry.get('days_waiting', 0)
            })
        
        prompt = f"""
        You are an AI dental clinic scheduler. Analyze the following waitlist patients and available slots.
        
        WAITLIST PATIENTS:
        {json.dumps(waitlist_data, indent=2)}
        
        AVAILABLE SLOTS:
        {json.dumps(available_slots, indent=2)}
        
        For each waitlist patient, determine if they can be matched with any available slot.
        Consider:
        1. Time preference match (within preferred window)
        2. Urgency level (3=high urgency should get priority)
        3. Days waiting (longer wait = higher priority)
        4. Service type compatibility
        
        Return a JSON array of recommendations with this exact structure:
        [
            {{
                "user_id": 1,
                "recommended_slot": "09:00",
                "match_score": 95,
                "reason": "Matches preferred time exactly and high urgency",
                "priority": 3
            }}
        ]
        
        Only return valid JSON, no other text.
        """
        
        try:
            model = genai.GenerativeModel('gemini-pro')
            response = model.generate_content(prompt)
            
            # Parse Gemini response
            recommendations = json.loads(response.text)
            return recommendations
        except Exception as e:
            print(f"Gemini API error: {e}")
            # Fallback to simple rule-based matching
            return AIDentalScheduler._fallback_matching(waitlist_data, available_slots)
    
    @staticmethod
    def _fallback_matching(waitlist_entries, available_slots):
        """Fallback matching algorithm if Gemini API fails"""
        recommendations = []
        
        # Sort by urgency (highest first) then days waiting
        sorted_entries = sorted(
            waitlist_entries, 
            key=lambda x: (-x['urgency_level'], -x.get('days_waiting', 0))
        )
        
        for entry in sorted_entries:
            best_match = None
            best_score = 0
            
            for slot in available_slots:
                score = 0
                slot_time = slot.get('timeValue', slot.get('time', ''))
                
                # Check time preference match
                start = entry['preferred_time_start']
                end = entry['preferred_time_end']
                if start <= slot_time <= end:
                    score += 50
                
                # Urgency bonus
                score += entry['urgency_level'] * 10
                
                # Days waiting bonus
                score += min(entry.get('days_waiting', 0), 30)
                
                if score > best_score:
                    best_score = score
                    best_match = slot
            
            if best_match and best_score > 30:
                recommendations.append({
                    'user_id': entry['user_id'],
                    'recommended_slot': best_match.get('timeValue', best_match.get('time')),
                    'match_score': best_score,
                    'reason': f"Matched based on time preference and urgency level {entry['urgency_level']}",
                    'priority': entry['urgency_level']
                })
        
        return recommendations
    
    @staticmethod
    def predict_best_booking_time(user_history):
        """Suggest optimal booking time based on user's history"""
        if not user_history:
            return "10:00 AM (most popular time)"
        
        # Analyze patterns
        time_counts = {}
        for apt in user_history:
            hour = apt['time'].split(':')[0] if ':' in apt['time'] else str(apt['time'].hour)
            time_counts[hour] = time_counts.get(hour, 0) + 1
        
        if time_counts:
            best_hour = max(time_counts, key=time_counts.get)
            return f"{int(best_hour)}:00 - Your most booked time"
        
        return "Morning slots recommended"
    
    @staticmethod
    def analyze_booking_patterns(appointments):
        """Analyze user booking patterns for AI suggestions"""
        if not appointments:
            return None
        
        # Extract hour preferences
        hours = [apt.time.hour for apt in appointments]
        if hours:
            from collections import Counter
            most_common_hour = Counter(hours).most_common(1)[0][0]
            return {
                'preferred_time': most_common_hour,
                'total_bookings': len(appointments),
                'most_frequent_hour': most_common_hour
            }
        return None
    
    @staticmethod
    def predict_cancellation_risk(appointment):
        """Predict if an appointment is likely to be cancelled"""
        # Simple risk calculation based on lead time
        days_until = (appointment.date - datetime.now().date()).days
        
        risk_score = 0
        if days_until > 14:
            risk_score = 70
        elif days_until > 7:
            risk_score = 40
        elif days_until > 3:
            risk_score = 20
        else:
            risk_score = 10
        
        return {
            'risk_score': risk_score,
            'risk_level': 'High' if risk_score > 50 else 'Medium' if risk_score > 25 else 'Low'
        }