from django.db import models
from django.conf import settings

class IncidentReport(models.Model):
    class Category(models.TextChoices):
        THEFT = 'THEFT', 'Theft'
        HARASSMENT = 'HARASSMENT', 'Harassment'
        ACCIDENT = 'ACCIDENT', 'Accident'
        UNSAFE_ROAD = 'UNSAFE_ROAD', 'Unsafe Road'
        SCAM = 'SCAM', 'Scam'
        MEDICAL = 'MEDICAL', 'Medical'
        LOST_ITEM = 'LOST_ITEM', 'Lost Item'
        OTHER = 'OTHER', 'Other'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        VERIFIED = 'VERIFIED', 'Verified'
        REJECTED = 'REJECTED', 'Rejected'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='incidents')
    category = models.CharField(max_length=30, choices=Category.choices)
    location_name = models.CharField(max_length=255)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    incident_timestamp = models.DateTimeField()
    description = models.TextField()
    photo_url = models.URLField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    upvotes = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.category} at {self.location_name} ({self.status})"
