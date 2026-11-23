from django.urls import path
from .views import (
    CityListView, DestinationListView, DestinationDetailView,
    TouristPlaceListView, TouristPlaceDetailView, ReviewListCreateView
)

urlpatterns = [
    path('cities/', CityListView.as_view(), name='city_list'),
    path('places/', TouristPlaceListView.as_view(), name='tourist_place_list'),
    path('places/<int:pk>/', TouristPlaceDetailView.as_view(), name='tourist_place_detail'),
    path('reviews/', ReviewListCreateView.as_view(), name='review_list_create'),
    path('legacy/', DestinationListView.as_view(), name='destination_list'),
    path('legacy/<int:pk>/', DestinationDetailView.as_view(), name='destination_detail'),
]
