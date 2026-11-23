from rest_framework import serializers
from .models import City, Destination, TouristPlace, Review, RouteSuggestion

class DestinationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Destination
        fields = '__all__'

class CitySerializer(serializers.ModelSerializer):
    tourist_places_count = serializers.SerializerMethodField()

    class Meta:
        model = City
        fields = ['id', 'name', 'district', 'hero_image', 'is_popular', 'tourist_places_count']

    def get_tourist_places_count(self, obj):
        return obj.tourist_places.count()

class ReviewSerializer(serializers.ModelSerializer):
    user_display_name = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ['id', 'tourist_place', 'user', 'user_name', 'user_display_name', 'rating', 'comment', 'photo_urls', 'video_url', 'upvotes', 'created_at']
        read_only_fields = ['user', 'upvotes', 'created_at']

    def get_user_display_name(self, obj):
        return obj.user_name or (obj.user.first_name + " " + obj.user.last_name).strip() or obj.user.username

class RouteSuggestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RouteSuggestion
        fields = '__all__'

class TouristPlaceSerializer(serializers.ModelSerializer):
    city_name = serializers.ReadOnlyField(source='city.name')
    district = serializers.ReadOnlyField(source='city.district')
    reviews = ReviewSerializer(many=True, read_only=True)
    routes = RouteSuggestionSerializer(many=True, read_only=True)

    class Meta:
        model = TouristPlace
        fields = [
            'id', 'city', 'city_name', 'district', 'name', 'category', 'description', 
            'rating', 'review_count', 'best_time', 'entry_fee', 'avg_visit_time', 
            'suitable_for', 'hero_image', 'photo_gallery', 'latitude', 'longitude',
            'reviews', 'routes'
        ]
