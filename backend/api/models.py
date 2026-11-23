from django.db import models
from django.contrib.auth.models import User


# ============================================================
# DISTRICT
# ============================================================

class District(models.Model):
    name = models.CharField(max_length=100, unique=True)
    region = models.CharField(max_length=100, default='Karnataka')
    photo_url = models.URLField(blank=True, null=True)
    latitude = models.FloatField(default=12.9716)
    longitude = models.FloatField(default=77.5946)
    safety_index = models.FloatField(null=True, blank=True)
    description = models.TextField(blank=True, default='')

    def __str__(self):
        return self.name


# ============================================================
# TOURIST PLACE
# ============================================================

class Place(models.Model):
    
    district = models.ForeignKey(
        District, on_delete=models.CASCADE, related_name='places'
    )
    external_place_id = models.CharField(
        max_length=200, unique=True, null=True, blank=True
    )
    source = models.CharField(max_length=50, default='OpenStreetMap')
    name = models.CharField(max_length=200)

    # Primary image for this tourist destination
    image = models.ImageField(
        upload_to='places/',
        null=True,
        blank=True
    )

    category = models.CharField(max_length=100, blank=True, default='')
    latitude = models.FloatField()
    longitude = models.FloatField()
    description = models.TextField(blank=True, default='')
    website = models.URLField(blank=True, null=True)
    phone = models.CharField(max_length=100, blank=True, default='')
    opening_hours = models.CharField(max_length=500, blank=True, default='')
    address = models.TextField(blank=True, default='')
    fee = models.CharField(max_length=100, blank=True, default='')
    rating = models.FloatField(null=True, blank=True)
    review_count = models.PositiveIntegerField(default=0)
    safety_index = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


# ============================================================
# INCIDENT REPORT
# ============================================================

class IncidentReport(models.Model):
    INCIDENT_TYPES = [
        # Existing categories retained
        ('Harassment Report', 'Harassment Report'),
        ('Suspicious Activity', 'Suspicious Activity'),
        ('Poor Lighting', 'Poor Lighting'),
        ('Isolated Stretch', 'Isolated Stretch'),
        ('Road Hazard', 'Road Hazard'),

        # Additional community incident categories
        ('Theft / Pickpocketing', 'Theft / Pickpocketing'),
        ('Physical Assault', 'Physical Assault'),
        ('Verbal Abuse', 'Verbal Abuse'),
        ('Stalking', 'Stalking'),
        ('Unsafe or Isolated Area', 'Unsafe or Isolated Area'),
        ('Road Accident', 'Road Accident'),
        ('Emergency / Medical Help', 'Emergency / Medical Help'),
        ('Other Safety Concern', 'Other Safety Concern'),
    ]

    STATUS_CHOICES = [
        ('Verified', 'Verified'),
        ('Pending', 'Pending'),
        ('Resolved', 'Resolved'),
    ]

    reported_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='incident_reports',
        null=True,
        blank=True
    )

    place = models.ForeignKey(
        Place,
        on_delete=models.CASCADE,
        related_name='incidents',
        null=True,
        blank=True
    )

    district = models.ForeignKey(
        District,
        on_delete=models.CASCADE,
        related_name='incidents',
        null=True,
        blank=True
    )

    title = models.CharField(max_length=200)
    location_name = models.CharField(max_length=200)

    incident_type = models.CharField(
        max_length=50,
        choices=INCIDENT_TYPES,
        default='Harassment Report'
    )

    severity = models.CharField(max_length=20, default='Medium')
    description = models.TextField()
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    # Existing single image field retained for compatibility
    image = models.ImageField(
        upload_to='incident_reports/',
        null=True,
        blank=True
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='Pending'
    )

    reported_ago = models.CharField(max_length=50, default='Recently')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    lighting_level = models.IntegerField(default=3)
    crowd_density = models.IntegerField(default=3)

    def __str__(self):
        return f"{self.title} - {self.status}"


# ============================================================
# INCIDENT EVIDENCE PHOTOS
# Multiple photos can belong to one incident report.
# ============================================================

class IncidentPhoto(models.Model):

    incident = models.ForeignKey(
        IncidentReport,
        on_delete=models.CASCADE,
        related_name='evidence_photos'
    )

    image = models.ImageField(
        upload_to='incident_evidence/'
    )

    caption = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )

    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='uploaded_incident_photos',
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Evidence photo for Incident #{self.incident.id}"


# ============================================================
# INCIDENT COMMENTS
# ============================================================

class IncidentComment(models.Model):
    incident = models.ForeignKey(
        IncidentReport,
        on_delete=models.CASCADE,
        related_name='comments'
    )

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='incident_comments',
        null=True,
        blank=True
    )

    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        username = self.user.username if self.user else 'Deleted User'
        return f"Comment by {username} on {self.incident.title}"


# ============================================================
# PLACE REVIEW
# ============================================================

class Review(models.Model):
    place = models.ForeignKey(
        Place,
        on_delete=models.CASCADE,
        related_name='reviews'
    )

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='place_reviews',
        null=True,
        blank=True
    )

    user_name = models.CharField(max_length=100, default='Traveler')
    user_avatar = models.URLField(blank=True, null=True)
    rating = models.IntegerField(default=5)
    comment = models.TextField()
    is_solo_female = models.BooleanField(default=False)
    photos = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    helpful_count = models.IntegerField(default=0)

    def __str__(self):
        return f"Review by {self.user_name} for {self.place.name}"


# ============================================================
# PLACE PHOTO UPLOADS
# Normal tourist photos, separate from incident evidence.
# ============================================================

class PlacePhoto(models.Model):
    place = models.ForeignKey(
        Place,
        on_delete=models.CASCADE,
        related_name='uploaded_photos'
    )

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='place_photos',
        null=True,
        blank=True
    )

    image = models.ImageField(upload_to='place_photos/')
    caption = models.CharField(max_length=250, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Photo for {self.place.name}"


# ============================================================
# ROUTE SAFETY
# ============================================================

class RouteSafety(models.Model):
    from_district = models.ForeignKey(
        District,
        on_delete=models.CASCADE,
        related_name='routes_from'
    )

    to_district = models.ForeignKey(
        District,
        on_delete=models.CASCADE,
        related_name='routes_to'
    )

    recommended_route_name = models.CharField(
        max_length=200, default='Recommended Route'
    )
    recommended_duration = models.CharField(max_length=50, default='')
    recommended_distance = models.CharField(max_length=50, default='')
    recommended_safety_score = models.FloatField(null=True, blank=True)

    alt_route_name = models.CharField(
        max_length=200, default='Alternative Route'
    )
    alt_duration = models.CharField(max_length=50, default='')
    alt_distance = models.CharField(max_length=50, default='')
    alt_safety_score = models.FloatField(null=True, blank=True)

    safe_reasons = models.TextField(blank=True, default='')
    alt_warning_reasons = models.TextField(blank=True, default='')

    def __str__(self):
        return f"{self.from_district.name} -> {self.to_district.name}"


# ============================================================
# WOMEN SAFE HAVEN
# ============================================================

class WomenSafeHaven(models.Model):
    HAVEN_TYPES = [
        ('Police Station', 'Police Station'),
        ('Pink Booth', 'Pink Booth'),
        ('Women Stays', 'Women Stays'),
        ('Helpline Center', 'Helpline Center'),
    ]

    name = models.CharField(max_length=200)

    district = models.ForeignKey(
        District,
        on_delete=models.CASCADE,
        related_name='safe_havens'
    )

    haven_type = models.CharField(
        max_length=50,
        choices=HAVEN_TYPES,
        default='Police Station'
    )

    address = models.TextField()
    phone = models.CharField(max_length=50, default='112 / 1091')
    latitude = models.FloatField(default=12.9716)
    longitude = models.FloatField(default=77.5946)
    distance_km = models.FloatField(default=1.2)

    def __str__(self):
        return f"{self.name} ({self.haven_type})"