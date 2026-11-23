from django.db import models
from django.conf import settings

class SOSAlert(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sos_alerts')
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    address = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=20, default='ACTIVE') # ACTIVE, RESOLVED
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"SOS by {self.user.username} at {self.created_at}"
