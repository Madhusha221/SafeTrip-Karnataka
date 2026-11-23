from django.urls import path
from .views import PlanTripView, UserTripListView

urlpatterns = [
    path('plan/', PlanTripView.as_view(), name='plan_trip'),
    path('my-trips/', UserTripListView.as_view(), name='user_trips'),
]
