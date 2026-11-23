from django.urls import path
from .views import IncidentReportListCreateView, IncidentReportDetailView

urlpatterns = [
    path('', IncidentReportListCreateView.as_view(), name='incident_list_create'),
    path('<int:pk>/', IncidentReportDetailView.as_view(), name='incident_detail'),
]
