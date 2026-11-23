from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from .models import SOSAlert

class TriggerSOSToggleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        latitude = request.data.get('latitude', 12.9716) # Default Bengaluru coordinates if missing
        longitude = request.data.get('longitude', 77.5946)
        address = request.data.get('address', 'MG Road, Bengaluru')

        sos = SOSAlert.objects.create(
            user=request.user,
            latitude=latitude,
            longitude=longitude,
            address=address
        )

        # Retrieve emergency contacts
        contacts = request.user.emergency_contacts.all()
        contact_list = [c.phone_number for c in contacts]

        return Response({
            'status': 'ALERT_DISPATCHED',
            'sos_id': sos.id,
            'message': 'Emergency SOS alert activated! Live tracking sent to emergency contacts & Karnataka Tourist Police Control Room.',
            'notified_contacts': contact_list,
            'live_tracking_url': f"https://safetrip.karnataka.gov.in/live-sos/{sos.id}"
        }, status=status.HTTP_201_CREATED)

class ToggleWomenModeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        enabled = request.data.get('enabled', True)
        user = request.user
        user.is_women_mode_enabled = enabled
        user.save()
        return Response({
            'is_women_mode_enabled': user.is_women_mode_enabled,
            'message': f"Women Traveler Mode {'enabled' if enabled else 'disabled'} successfully."
        })
