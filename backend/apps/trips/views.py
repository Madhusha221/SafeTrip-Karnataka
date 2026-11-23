from rest_framework import serializers, generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Trip, TripDestination
from apps.destinations.serializers import DestinationSerializer
from apps.incidents.models import IncidentReport
from apps.ai_engine.risk_calculator import calculate_spatial_risk

class TripDestinationSerializer(serializers.ModelSerializer):
    destination_details = DestinationSerializer(source='destination', read_only=True)

    class Meta:
        model = TripDestination
        fields = ['id', 'destination', 'destination_details', 'order']

class TripSerializer(serializers.ModelSerializer):
    destinations = TripDestinationSerializer(many=True, read_only=True)

    class Meta:
        model = Trip
        fields = ['id', 'user', 'title', 'start_date', 'end_date', 'start_time', 'end_time', 'overall_risk_level', 'risk_score', 'destinations', 'created_at']
        read_only_fields = ['user', 'risk_score', 'overall_risk_level', 'created_at']

class PlanTripView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        title = request.data.get('title', 'Karnataka Trip')
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        start_time = request.data.get('start_time')
        end_time = request.data.get('end_time')
        destination_ids = request.data.get('destination_ids', [])

        # Create Trip
        trip = Trip.objects.create(
            user=request.user,
            title=title,
            start_date=start_date,
            end_date=end_date,
            start_time=start_time,
            end_time=end_time
        )

        for idx, dest_id in enumerate(destination_ids):
            TripDestination.objects.create(trip=trip, destination_id=dest_id, order=idx+1)

        # Calculate AI Risk Score
        incidents = IncidentReport.objects.all()
        target_lat = 12.2958 # Default Coorg / Mysore regional center
        target_lng = 75.7382
        
        is_evening = False
        if start_time and ("18:" in str(start_time) or "19:" in str(start_time) or "20:" in str(start_time)):
            is_evening = True

        risk_assessment = calculate_spatial_risk(target_lat, target_lng, incidents, is_evening=is_evening)
        trip.risk_score = risk_assessment['score']
        trip.overall_risk_level = risk_assessment['level']
        trip.save()

        serializer = TripSerializer(trip)
        return Response({
            'trip': serializer.data,
            'safety_brief': {
                'overall_risk_level': risk_assessment['level'],
                'risk_score': risk_assessment['score'],
                'recent_reports_count': risk_assessment['incident_count'],
                'common_categories': ['Road Safety', 'Harassment'],
                'safety_tips': [
                    'Avoid isolated areas late at night',
                    'Travel in groups where possible',
                    'Keep emergency contact numbers handy',
                    'Stay updated with local alerts'
                ]
            }
        })

class UserTripListView(generics.ListAPIView):
    serializer_class = TripSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Trip.objects.filter(user=self.request.user).order_by('-created_at')
