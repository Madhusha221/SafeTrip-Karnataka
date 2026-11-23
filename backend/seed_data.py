import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.authentication.models import User
from apps.destinations.models import City, Destination, TouristPlace, Review, RouteSuggestion
from apps.incidents.models import IncidentReport
from django.utils import timezone

def seed():
    print("Seeding Cities in Karnataka...")
    cities_data = [
        {"name": "Mangaluru", "district": "Dakshina Kannada", "hero_image": "https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5"},
        {"name": "Mysuru", "district": "Mysuru", "hero_image": "https://images.unsplash.com/photo-1600100397608-f010e423b971"},
        {"name": "Coorg", "district": "Kodagu", "hero_image": "https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5"},
        {"name": "Hampi", "district": "Vijayanagara", "hero_image": "https://images.unsplash.com/photo-1600100397608-f010e423b971"},
        {"name": "Bengaluru", "district": "Bengaluru Urban", "hero_image": "https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5"},
        {"name": "Gokarna", "district": "Uttara Kannada", "hero_image": "https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5"},
        {"name": "Udupi", "district": "Udupi", "hero_image": "https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5"},
        {"name": "Chikkamagaluru", "district": "Chikkamagaluru", "hero_image": "https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5"},
    ]

    city_objs = {}
    for c in cities_data:
        city_obj, _ = City.objects.get_or_create(name=c["name"], defaults=c)
        city_objs[c["name"]] = city_obj

    print("Seeding Tourist Places for Mangaluru and other cities...")
    places_data = [
        # Mangaluru Places
        {
            "city": city_objs["Mangaluru"],
            "name": "Tannirbhavi Beach",
            "category": "Beach",
            "description": "Tannirbhavi Beach is a serene and picturesque beach in Mangaluru, known for its clean shores, stunning sunsets, and peaceful environment.",
            "rating": 4.6,
            "review_count": 1100,
            "best_time": "Oct - Mar",
            "entry_fee": "Free",
            "avg_visit_time": "1-2 Hours",
            "suitable_for": "Families, Solo, Friends",
            "hero_image": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
            "photo_gallery": [
                "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
                "https://images.unsplash.com/photo-1519046904884-53103b34b206",
                "https://images.unsplash.com/photo-1473116763249-2faaef81ccda"
            ],
            "latitude": 12.8910,
            "longitude": 74.8123
        },
        {
            "city": city_objs["Mangaluru"],
            "name": "Panambur Beach",
            "category": "Beach",
            "description": "Popular beach with water sports, lifeguards, food stalls, and annual kite festival.",
            "rating": 4.5,
            "review_count": 920,
            "best_time": "Oct - Mar",
            "entry_fee": "Free",
            "avg_visit_time": "2-3 Hours",
            "suitable_for": "Families, Groups",
            "hero_image": "https://images.unsplash.com/photo-1519046904884-53103b34b206",
            "photo_gallery": ["https://images.unsplash.com/photo-1519046904884-53103b34b206"],
            "latitude": 12.9431,
            "longitude": 74.8094
        },
        {
            "city": city_objs["Mangaluru"],
            "name": "Kadri Manjunatha Temple",
            "category": "Temple",
            "description": "Ancient historic temple located on Kadri hills dating back to the 10th century.",
            "rating": 4.7,
            "review_count": 820,
            "best_time": "All Year",
            "entry_fee": "Free",
            "avg_visit_time": "1 Hour",
            "suitable_for": "Pilgrims, Families",
            "hero_image": "https://images.unsplash.com/photo-1600100397608-f010e423b971",
            "photo_gallery": ["https://images.unsplash.com/photo-1600100397608-f010e423b971"],
            "latitude": 12.8833,
            "longitude": 74.8556
        },
        {
            "city": city_objs["Mangaluru"],
            "name": "Sultan Battery",
            "category": "Historical",
            "description": "Watchtower constructed by Tipu Sultan made of black stone overlooking Gurupura river.",
            "rating": 4.3,
            "review_count": 410,
            "best_time": "Nov - Feb",
            "entry_fee": "Free",
            "avg_visit_time": "1 Hour",
            "suitable_for": "History Buffs, Solo",
            "hero_image": "https://images.unsplash.com/photo-1600100397608-f010e423b971",
            "photo_gallery": ["https://images.unsplash.com/photo-1600100397608-f010e423b971"],
            "latitude": 12.8790,
            "longitude": 74.8210
        },
        {
            "city": city_objs["Mangaluru"],
            "name": "Someshwara Beach",
            "category": "Beach",
            "description": "Known for large rocks called Rudra Shile and Someshwara Temple near Netravati river mouth.",
            "rating": 4.4,
            "review_count": 630,
            "best_time": "Oct - Mar",
            "entry_fee": "Free",
            "avg_visit_time": "1-2 Hours",
            "suitable_for": "Nature Lovers, Couples",
            "hero_image": "https://images.unsplash.com/photo-1473116763249-2faaef81ccda",
            "photo_gallery": ["https://images.unsplash.com/photo-1473116763249-2faaef81ccda"],
            "latitude": 12.7930,
            "longitude": 74.8460
        },
        {
            "city": city_objs["Mangaluru"],
            "name": "Pilikula Nisargadhama",
            "category": "Nature Park",
            "description": "Eco-educational tourism park with biological park, heritage village, and lake side boating.",
            "rating": 4.6,
            "review_count": 712,
            "best_time": "Sep - Feb",
            "entry_fee": "₹50",
            "avg_visit_time": "3-4 Hours",
            "suitable_for": "Families, Kids",
            "hero_image": "https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5",
            "photo_gallery": ["https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5"],
            "latitude": 12.9240,
            "longitude": 74.8980
        },
        # Mysuru Places
        {
            "city": city_objs["Mysuru"],
            "name": "Mysuru Palace",
            "category": "Heritage",
            "description": "Grand royal palace of the Wodeyar dynasty renowned for architectural splendor and illumination.",
            "rating": 4.8,
            "review_count": 4500,
            "best_time": "Oct - Mar",
            "entry_fee": "₹100",
            "avg_visit_time": "2-3 Hours",
            "suitable_for": "Everyone",
            "hero_image": "https://images.unsplash.com/photo-1600100397608-f010e423b971",
            "photo_gallery": ["https://images.unsplash.com/photo-1600100397608-f010e423b971"],
            "latitude": 12.3052,
            "longitude": 76.6552
        },
        # Coorg Places
        {
            "city": city_objs["Coorg"],
            "name": "Abbey Falls",
            "category": "Waterfall",
            "description": "Cascading waterfall nestled amidst private coffee plantations and spice estates.",
            "rating": 4.7,
            "review_count": 1800,
            "best_time": "Sep - Jan",
            "entry_fee": "₹30",
            "avg_visit_time": "1-2 Hours",
            "suitable_for": "Nature Lovers, Solo",
            "hero_image": "https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5",
            "photo_gallery": ["https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5"],
            "latitude": 12.4542,
            "longitude": 75.7189
        }
    ]

    tannirbhavi_obj = None
    for p in places_data:
        place_obj, _ = TouristPlace.objects.get_or_create(name=p["name"], city=p["city"], defaults=p)
        if p["name"] == "Tannirbhavi Beach":
            tannirbhavi_obj = place_obj

    # Create Default User for seed reviews
    demo_user, _ = User.objects.get_or_create(username="priya_s", defaults={
        "email": "priya@example.com",
        "first_name": "Priya",
        "last_name": "S",
        "is_women_mode_enabled": True
    })

    demo_user2, _ = User.objects.get_or_create(username="rahul_k", defaults={
        "email": "rahul@example.com",
        "first_name": "Rahul",
        "last_name": "K"
    })

    if tannirbhavi_obj:
        print("Seeding Persistent Community Reviews for Tannirbhavi Beach...")
        Review.objects.get_or_create(
            tourist_place=tannirbhavi_obj,
            user=demo_user,
            defaults={
                "user_name": "Priya S.",
                "rating": 5,
                "comment": "Beautiful and peaceful beach. Felt safe even in the evening. Great place for solo female travelers!",
                "photo_urls": ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e"],
                "upvotes": 42
            }
        )
        Review.objects.get_or_create(
            tourist_place=tannirbhavi_obj,
            user=demo_user2,
            defaults={
                "user_name": "Rahul K.",
                "rating": 4,
                "comment": "Clean beach and well maintained. Parking is available. Police patrolling is visible during peak hours.",
                "photo_urls": ["https://images.unsplash.com/photo-1519046904884-53103b34b206"],
                "upvotes": 28
            }
        )

        print("Seeding Route Suggestion to Tannirbhavi Beach...")
        RouteSuggestion.objects.get_or_create(
            tourist_place=tannirbhavi_obj,
            start_city="Bengaluru",
            defaults={
                "recommended_route_name": "NH 75 Express Route",
                "recommended_time": "32 min • 12 km",
                "recommended_distance": "12 km",
                "recommended_safety_tag": "Safe",
                "recommended_reasons": [
                    "Fewer reported incidents",
                    "Well-lit roads",
                    "Regular police patrolling",
                    "Popular among travelers"
                ],
                "alternative_route_name": "Inner Coastal Road",
                "alternative_time": "38 min • 14 km",
                "alternative_distance": "14 km",
                "alternative_caution_reasons": [
                    "Recent reports of harassment",
                    "Poor lighting in some areas",
                    "Less crowd and isolated stretches"
                ]
            }
        )

    print("Data Seeding Finished Successfully!")

if __name__ == '__main__':
    seed()
