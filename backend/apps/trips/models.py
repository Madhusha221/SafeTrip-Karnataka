from django.db import models
from django.conf import settings
from apps.destinations.models import Destination

class Trip(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='trips')
    title = models.CharField(max_length=150) # e.g. Karnataka Weekend Trip
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    overall_risk_level = models.CharField(max_length=30, default='Low to Moderate')
    risk_score = models.FloatField(default=25.0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.user.username}"

class TripDestination(models.Model):
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='destinations')
    destination = models.ForeignKey(Destination, on_delete=models.CASCADE)
    order = models.PositiveIntegerField(default=1)
