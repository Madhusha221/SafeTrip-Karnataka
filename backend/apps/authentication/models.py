from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    class Role(models.TextChoices):
        TOURIST = 'TOURIST', 'Tourist'
        MODERATOR = 'MODERATOR', 'Moderator'
        ADMIN = 'ADMIN', 'Admin'

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.TOURIST)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    is_women_mode_enabled = models.BooleanField(default=False)
    avatar_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

class EmergencyContact(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='emergency_contacts')
    name = models.CharField(max_length=100)
    relationship = models.CharField(max_length=50)
    phone_number = models.CharField(max_length=15)
    is_primary = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.name} - {self.phone_number}"
