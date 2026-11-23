from rest_framework import serializers, generics, permissions
from .models import IncidentReport

class IncidentReportSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = IncidentReport
        fields = ['id', 'user', 'user_name', 'category', 'location_name', 'latitude', 'longitude', 'incident_timestamp', 'description', 'photo_url', 'status', 'upvotes', 'created_at']
        read_only_fields = ['user', 'status', 'upvotes', 'created_at']

class IncidentReportListCreateView(generics.ListCreateAPIView):
    queryset = IncidentReport.objects.all().order_by('-created_at')
    serializer_class = IncidentReportSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class IncidentReportDetailView(generics.RetrieveAPIView):
    queryset = IncidentReport.objects.all()
    serializer_class = IncidentReportSerializer
