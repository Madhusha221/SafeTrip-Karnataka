import requests

class POIService:
    """
    Dynamic POI & Tourist Places Service for SafeTrip Karnataka.
    Provides curated Karnataka tourist destinations across districts, enriched with OpenStreetMap Overpass live data.
    """

    KARNATAKA_DISTRICTS = [
        {"name": "Mangaluru", "region": "Coastal Karnataka", "lat": 12.9141, "lng": 74.8560, "safety": 4.8},
        {"name": "Bengaluru", "region": "South Karnataka", "lat": 12.9716, "lng": 77.5946, "safety": 4.9},
        {"name": "Mysuru", "region": "Heritage Zone", "lat": 12.2958, "lng": 76.6394, "safety": 4.9},
        {"name": "Coorg", "region": "Western Ghats", "lat": 12.4244, "lng": 75.7382, "safety": 4.7},
        {"name": "Hampi", "region": "UNESCO World Heritage", "lat": 15.3350, "lng": 76.4600, "safety": 4.7},
        {"name": "Udupi", "region": "Coastal Karnataka", "lat": 13.3409, "lng": 74.7421, "safety": 4.8},
        {"name": "Gokarna", "region": "Uttara Kannada", "lat": 14.5479, "lng": 74.3188, "safety": 4.6},
        {"name": "Chikkamagaluru", "region": "Coffee Hills", "lat": 13.3161, "lng": 75.7720, "safety": 4.7},
        {"name": "Hubballi", "region": "North Karnataka", "lat": 15.3647, "lng": 75.1240, "safety": 4.5},
        {"name": "Shivamogga", "region": "Malnad Region", "lat": 13.9299, "lng": 75.5681, "safety": 4.6},
        {"name": "Belagavi", "region": "North Karnataka", "lat": 15.8497, "lng": 74.4977, "safety": 4.6},
        {"name": "Badami", "region": "Bagalkote Heritage", "lat": 15.9149, "lng": 75.6768, "safety": 4.5},
        {"name": "Hassan", "region": "Belur-Halebidu Heritage", "lat": 13.0068, "lng": 76.1004, "safety": 4.7},
        {"name": "Vijayapura", "region": "Gol Gumbaz Realm", "lat": 16.8302, "lng": 75.7100, "safety": 4.4},
        {"name": "Bidar", "region": "Deccan Fort Realm", "lat": 17.9104, "lng": 77.5199, "safety": 4.5}
    ]

    SEED_PLACES = [
        # Mangaluru Places (Matches Reference Design)
        {
            "district": "Mangaluru",
            "name": "Tannirbhavi Beach",
            "category": "Beaches",
            "rating": 4.6,
            "review_count": 1100,
            "latitude": 12.8941,
            "longitude": 74.8110,
            "image_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
            "description": "Tannirbhavi Beach is a serene and picturesque beach in Mangaluru, known for its clean shores, stunning sunsets, and peaceful environment. Features lifeguards and well-lit entry driveways.",
            "best_time": "Oct - Mar",
            "entry_fee": "Free",
            "avg_visit": "1-2 Hours",
            "suitable_for": "Families, Solo, Friends",
            "safety_index": 4.8
        },
        {
            "district": "Mangaluru",
            "name": "Panambur Beach",
            "category": "Beaches",
            "rating": 4.5,
            "review_count": 920,
            "latitude": 12.9530,
            "longitude": 74.8030,
            "image_url": "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80",
            "description": "One of the safest and most popular beaches in Karnataka. Equipped with 24x7 beach patrol, jet-ski sports, food stalls, and ample parking facilities.",
            "best_time": "Oct - Apr",
            "entry_fee": "Free",
            "avg_visit": "2-3 Hours",
            "suitable_for": "Families, Solo Travelers",
            "safety_index": 4.7
        },
        {
            "district": "Mangaluru",
            "name": "Kadri Manjunatha Temple",
            "category": "Temples",
            "rating": 4.7,
            "review_count": 820,
            "latitude": 12.8872,
            "longitude": 74.8580,
            "image_url": "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?auto=format&fit=crop&w=1200&q=80",
            "description": "Historic 10th-century Vijayanagara style temple complex located at Kadri hills with natural water springs and vibrant cultural atmosphere.",
            "best_time": "All Year",
            "entry_fee": "Free",
            "avg_visit": "1 Hour",
            "suitable_for": "Pilgrims, Solo, Families",
            "safety_index": 4.9
        },
        {
            "district": "Mangaluru",
            "name": "Sultan Battery",
            "category": "Historical",
            "rating": 4.3,
            "review_count": 410,
            "latitude": 12.8931,
            "longitude": 74.8290,
            "image_url": "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=1200&q=80",
            "description": "Watchtower built by Tipu Sultan in 1784 constructed from black stone. Offers panoramic river views and boat rides to Tannirbhavi.",
            "best_time": "Oct - Mar",
            "entry_fee": "₹20",
            "avg_visit": "45 Mins",
            "suitable_for": "History Buffs, Solo",
            "safety_index": 4.4
        },
        {
            "district": "Mangaluru",
            "name": "Someshwara Beach",
            "category": "Beaches",
            "rating": 4.4,
            "review_count": 630,
            "latitude": 12.7930,
            "longitude": 74.8540,
            "image_url": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80",
            "description": "Famous for large natural rock formations called 'Rudra Shile'. Peaceful golden sands with an ancient Shiva temple nearby.",
            "best_time": "Nov - Feb",
            "entry_fee": "Free",
            "avg_visit": "1-2 Hours",
            "suitable_for": "Photographers, Solo",
            "safety_index": 4.5
        },
        {
            "district": "Mangaluru",
            "name": "Pilikula Nisargadhama",
            "category": "Nature",
            "rating": 4.6,
            "review_count": 712,
            "latitude": 12.9280,
            "longitude": 74.9010,
            "image_url": "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80",
            "description": "Eco-tourism destination with a biological park, heritage village, botanical garden, lake boating, and 3D planetarium.",
            "best_time": "Sep - Mar",
            "entry_fee": "₹100",
            "avg_visit": "3-4 Hours",
            "suitable_for": "Families, Solo, Nature Lovers",
            "safety_index": 4.9
        },
        # Mysuru Places
        {
            "district": "Mysuru",
            "name": "Mysore Palace",
            "category": "Historical",
            "rating": 4.8,
            "review_count": 3100,
            "latitude": 12.3052,
            "longitude": 76.6552,
            "image_url": "https://images.unsplash.com/photo-1600100397608-f010e423b971?auto=format&fit=crop&w=1200&q=80",
            "description": "The official residence of the Wadiyar dynasty. Famous for Indo-Saracenic architecture and Sunday evening illumination with 100,000 bulbs.",
            "best_time": "Oct - Mar",
            "entry_fee": "₹100",
            "avg_visit": "2-3 Hours",
            "suitable_for": "All Travelers, Solo Women",
            "safety_index": 4.9
        },
        {
            "district": "Mysuru",
            "name": "Chamundi Hill Temple",
            "category": "Temples",
            "rating": 4.7,
            "review_count": 2100,
            "latitude": 12.2753,
            "longitude": 76.6706,
            "image_url": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80",
            "description": "Perched atop Chamundi Hill, dedicated to Goddess Chamundeshwari with a massive stone monolith Nandi statue halfway up.",
            "best_time": "All Year",
            "entry_fee": "Free",
            "avg_visit": "1-2 Hours",
            "suitable_for": "Pilgrims, Solo",
            "safety_index": 4.8
        },
        # Coorg Places
        {
            "district": "Coorg",
            "name": "Abbey Falls",
            "category": "Waterfalls",
            "rating": 4.6,
            "review_count": 980,
            "latitude": 12.4578,
            "longitude": 75.7196,
            "image_url": "https://images.unsplash.com/photo-1434394354979-a235cd36269d?auto=format&fit=crop&w=1200&q=80",
            "description": "Spectacular waterfall nestled amidst private coffee plantations and spice estates with a hanging bridge view.",
            "best_time": "Jul - Oct",
            "entry_fee": "₹30",
            "avg_visit": "1 Hour",
            "suitable_for": "Nature Enthusiasts, Solo",
            "safety_index": 4.7
        },
        # Hampi Places
        {
            "district": "Hampi",
            "name": "Virupaksha Temple",
            "category": "UNESCO",
            "rating": 4.8,
            "review_count": 1400,
            "latitude": 15.3358,
            "longitude": 76.4602,
            "image_url": "https://images.unsplash.com/photo-1627894483216-2138af692e32?auto=format&fit=crop&w=1200&q=80",
            "description": "Part of the Group of Monuments at Hampi UNESCO site, dedicated to Lord Virupaksha. Active worship site continuously functioning since the 7th century.",
            "best_time": "Oct - Feb",
            "entry_fee": "₹50",
            "avg_visit": "2 Hours",
            "suitable_for": "Heritage Explorers, Solo",
            "safety_index": 4.7
        }
    ]

    @classmethod
    def fetch_live_osm_places(cls, district_name, lat, lng):
        """
        Dynamically query OpenStreetMap Overpass API for real POIs in Karnataka districts.
        """
        query = f"""
        [out:json][timeout:10];
        (
          node["tourism"="attraction"](around:15000, {lat}, {lng});
          node["tourism"="viewpoint"](around:15000, {lat}, {lng});
          node["historic"](around:15000, {lat}, {lng});
        );
        out body 8;
        """
        url = "https://overpass-api.de/api/interpreter"
        try:
            resp = requests.post(url, data={"data": query}, timeout=4)
            if resp.status_code == 200:
                data = resp.json()
                places = []
                for item in data.get("elements", []):
                    tags = item.get("tags", {})
                    name = tags.get("name") or tags.get("name:en")
                    if name:
                        places.append({
                            "district": district_name,
                            "name": name,
                            "category": tags.get("tourism", "Nature").capitalize(),
                            "rating": 4.5,
                            "review_count": 150,
                            "latitude": item.get("lat"),
                            "longitude": item.get("lon"),
                            "image_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
                            "description": f"Discovered tourist destination in {district_name}, Karnataka.",
                            "best_time": "Oct - Mar",
                            "entry_fee": "Free",
                            "avg_visit": "1-2 Hours",
                            "suitable_for": "Solo Travelers & Families",
                            "safety_index": 4.6
                        })
                return places
        except Exception as e:
            print(f"OSM Overpass query fallback: {e}")
        return []
