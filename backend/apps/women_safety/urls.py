from django.urls import path
from .views import TriggerSOSToggleView, ToggleWomenModeView

urlpatterns = [
    path('sos/', TriggerSOSToggleView.as_view(), name='trigger_sos'),
    path('toggle-mode/', ToggleWomenModeView.as_view(), name='toggle_women_mode'),
]
