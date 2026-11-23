from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import City, Destination, TouristPlace, Review, RouteSuggestion
from .serializers import CitySerializer, DestinationSerializer, TouristPlaceSerializer, ReviewSerializer, RouteSuggestionSerializer

class CityListView(generics.ListAPIView):
    queryset = City.objects.all().order_by('name')
    serializer_class = CitySerializer

class DestinationListView(generics.ListAPIView):
    queryset = Destination.objects.all()
    serializer_class = DestinationSerializer

class DestinationDetailView(generics.RetrieveAPIView):
    queryset = Destination.objects.all()
    serializer_class = DestinationSerializer

class TouristPlaceListView(generics.ListAPIView):
    serializer_class = TouristPlaceSerializer

    def get_queryset(self):
        queryset = TouristPlace.objects.all().select_related('city').prefetch_related('reviews', 'routes')
        city_name = self.request.query_params.get('city')
        city_id = self.request.query_params.get('city_id')
        category = self.request.query_params.get('category')
        search = self.request.query_params.get('search')

        if city_name:
            queryset = queryset.filter(city__name__iexact=city_name)
        if city_id:
            queryset = queryset.filter(city_id=city_id)
        if category and category.lower() != 'all':
            queryset = queryset.filter(category__iexact=category)
        if search:
            queryset = queryset.filter(name__icontains=search) | queryset.filter(city__name__icontains=search)
        return queryset

class TouristPlaceDetailView(generics.RetrieveAPIView):
    queryset = TouristPlace.objects.all().select_related('city').prefetch_related('reviews', 'routes')
    serializer_class = TouristPlaceSerializer

class ReviewListCreateView(generics.ListCreateAPIView):
    serializer_class = ReviewSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        queryset = Review.objects.all().order_by('-created_at')
        place_id = self.request.query_params.get('place_id')
        if place_id:
            queryset = queryset.filter(tourist_place_id=place_id)
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        display_name = (user.first_name + " " + user.last_name).strip() or user.username
        serializer.save(user=user, user_name=display_name)
