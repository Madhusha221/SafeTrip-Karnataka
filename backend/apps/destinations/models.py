from django.db import models
from django.conf import settings

class City(models.Model):
    name = models.CharField(max_length=100, unique=True) # e.g. Mangaluru, Mysuru, Coorg, Hampi, Bengaluru, Gokarna, Udupi, Chikkamagaluru, Hubballi, Shivamogga, Belagavi
    district = models.CharField(max_length=100)
    hero_image = models.URLField(blank=True, null=True)
    is_popular = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "Cities"

    def __str__(self):
        return f"{self.name}, {self.district}"

class Destination(models.Model):
    name = models.CharField(max_length=150)
    district = models.CharField(max_length=100)
    description = models.TextField()
    category = models.CharField(max_length=50) # Hill Station, Beach, Temple, Heritage
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    best_time_to_visit = models.CharField(max_length=100)
    rating = models.FloatField(default=4.5)
    review_count = models.IntegerField(default=0)
    thumbnail_url = models.URLField()
    is_trending = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.name}, {self.district}"

class TouristPlace(models.Model):
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name='tourist_places')
    name = models.CharField(max_length=150) # e.g. Tannirbhavi Beach, Panambur Beach, Kadri Temple
    category = models.CharField(max_length=50) # Beach, Temple, Nature, Waterfall, Heritage, Historical, Park, Food
    description = models.TextField()
    rating = models.FloatField(default=4.6)
    review_count = models.IntegerField(default=1100)
    best_time = models.CharField(max_length=100, default='Oct - Mar')
    entry_fee = models.CharField(max_length=50, default='Free')
    avg_visit_time = models.CharField(max_length=50, default='1-2 Hours')
    suitable_for = models.CharField(max_length=150, default='Families, Solo, Friends')
    hero_image = models.URLField()
    photo_gallery = models.JSONField(default=list, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, default=12.8910)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, default=74.8123)

    def __str__(self):
        return f"{self.name} ({self.city.name})"

class Review(models.Model):
    tourist_place = models.ForeignKey(TouristPlace, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews')
    user_name = models.CharField(max_length=100, blank=True)
    rating = models.IntegerField(default=5) # 1-5
    comment = models.TextField()
    photo_urls = models.JSONField(default=list, blank=True)
    video_url = models.URLField(blank=True, null=True)
    upvotes = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Review by {self.user_name or self.user.username} for {self.tourist_place.name}"

class RouteSuggestion(models.Model):
    tourist_place = models.ForeignKey(TouristPlace, on_delete=models.CASCADE, related_name='routes')
    start_city = models.CharField(max_length=100, default='Bengaluru')
    recommended_route_name = models.CharField(max_length=150, default='NH 75 Express Route')
    recommended_time = models.CharField(max_length=50, default='32 min')
    recommended_distance = models.CharField(max_length=50, default='12 km')
    recommended_safety_tag = models.CharField(max_length=50, default='Safe')
    recommended_reasons = models.JSONField(default=list) # e.g. ["Fewer reported incidents", "Well-lit roads", "Regular police patrolling"]
    alternative_route_name = models.CharField(max_length=150, default='Inner Coastal Road')
    alternative_time = models.CharField(max_length=50, default='38 min')
    alternative_distance = models.CharField(max_length=50, default='14 km')
    alternative_caution_reasons = models.JSONField(default=list) # e.g. ["Recent reports of harassment", "Poor lighting in some areas"]

    def __str__(self):
        return f"Route to {self.tourist_place.name} from {self.start_city}"
