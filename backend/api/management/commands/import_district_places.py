"""SafeTrip Karnataka curated tourist-place import.

Imports up to 20 attraction candidates for each of 14 destinations.
Mangaluru is deliberately excluded.
Existing places, reviews, and photos are not deleted.
"""

import json
import time
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from api.models import District, Place


# Each destination has 20 attraction candidates.
# New coordinates are looked up using OpenStreetMap Nominatim.
# Existing starter coordinates are approximate and should be verified.
ATTRACTIONS = {
    "Badami": [
        ("Badami Cave Temples", "historic", 15.9186, 75.6840),
        ("Agastya Lake", "natural", 15.9167, 75.6810),
        ("Bhutanatha Temples", "historic", 15.9160, 75.6815),
        ("Badami Fort", "historic", None, None),
        ("Malegitti Shivalaya Temple", "temple", None, None),
        ("Banashankari Amma Temple", "temple", None, None),
        ("Pattadakal Virupaksha Temple", "temple", None, None),
        ("Pattadakal Mallikarjuna Temple", "temple", None, None),
        ("Pattadakal Sangameshwara Temple", "temple", None, None),
        ("Pattadakal Papanatha Temple", "temple", None, None),
        ("Aihole Durga Temple", "temple", None, None),
        ("Aihole Lad Khan Temple", "temple", None, None),
        ("Aihole Meguti Jain Temple", "temple", None, None),
        ("Aihole Ravana Phadi Cave", "historic", None, None),
        ("Aihole Huchimalli Temple", "temple", None, None),
        ("Aihole Kontigudi Temples", "temple", None, None),
        ("Mahakuta Temples", "temple", None, None),
        ("Siddhanakolla", "natural", None, None),
        ("Upper Shivalaya Badami", "temple", None, None),
        ("Lower Shivalaya Badami", "temple", None, None),
    ],

    "Belagavi": [
        ("Belagavi Fort", "historic", 15.8589, 74.5215),
        ("Kamal Basti", "historic", 15.8620, 74.5220),
        ("Kittur Fort", "historic", 15.5910, 74.7960),
        ("Gokak Falls", "waterfall", None, None),
        ("Godachinmalki Falls", "waterfall", None, None),
        ("Yellamma Temple Saundatti", "temple", None, None),
        ("Kapileshwar Temple Belagavi", "temple", None, None),
        ("Military Mahadeva Temple", "temple", None, None),
        ("Shri Hari Mandir Belagavi", "temple", None, None),
        ("Jamboti Hills", "natural", None, None),
        ("Vajrapoha Falls", "waterfall", None, None),
        ("Sural Falls", "waterfall", None, None),
        ("Hidkal Dam", "natural", None, None),
        ("Rakaskop Reservoir", "natural", None, None),
        ("Kittur Rani Chennamma Memorial", "historic", None, None),
        ("Kittur Palace Museum", "museum", None, None),
        ("Nandgad Fort", "historic", None, None),
        ("Parasgad Fort", "historic", None, None),
        ("Navilutirtha Dam", "natural", None, None),
        ("Ramakrishna Mission Ashrama Belagavi", "historic", None, None),
    ],

    "Bengaluru": [
        ("Lalbagh Botanical Garden", "garden", 12.9507, 77.5848),
        ("Cubbon Park", "park", 12.9763, 77.5929),
        ("Bangalore Palace", "historic", 12.9987, 77.5920),
        ("Bannerghatta Biological Park", "nature", None, None),
        ("Tipu Sultan Summer Palace", "historic", None, None),
        ("ISKCON Temple Rajajinagar", "temple", None, None),
        ("Vidhana Soudha", "historic", None, None),
        ("National Gallery of Modern Art Bengaluru", "museum", None, None),
        ("Visvesvaraya Industrial and Technological Museum", "museum", None, None),
        ("Jawaharlal Nehru Planetarium Bengaluru", "museum", None, None),
        ("Ulsoor Lake", "natural", None, None),
        ("Sankey Tank", "natural", None, None),
        ("Bangalore Fort", "historic", None, None),
        ("Bull Temple Basavanagudi", "temple", None, None),
        ("Dodda Ganapathi Temple", "temple", None, None),
        ("Freedom Park Bengaluru", "park", None, None),
        ("Government Museum Bengaluru", "museum", None, None),
        ("Venkatappa Art Gallery", "museum", None, None),
        ("JP Park Bengaluru", "park", None, None),
        ("Lumbini Gardens Nagawara", "park", None, None),
    ],

    "Bidar": [
        ("Bidar Fort", "historic", 17.9133, 77.5301),
        ("Mahmud Gawan Madrasa", "historic", 17.9130, 77.5190),
        ("Bahmani Tombs", "historic", 17.9270, 77.5360),
        ("Chaubara Clock Tower", "historic", None, None),
        ("Narasimha Jhira Cave Temple", "temple", None, None),
        ("Papnash Shiva Temple", "temple", None, None),
        ("Rangeen Mahal", "historic", None, None),
        ("Barid Shahi Tombs", "historic", None, None),
        ("Solah Khamba Mosque", "historic", None, None),
        ("Takht Mahal", "historic", None, None),
        ("Gagan Mahal Bidar", "historic", None, None),
        ("Tarkash Mahal", "historic", None, None),
        ("Jami Masjid Bidar Fort", "historic", None, None),
        ("Gurudwara Nanak Jhira Sahib", "religious", None, None),
        ("Basavakalyan Fort", "historic", None, None),
        ("Anubhava Mantapa Basavakalyan", "historic", None, None),
        ("Chaukhandi of Hazrat Khalil Ullah", "historic", None, None),
        ("Ashtur Tombs", "historic", None, None),
        ("Bidar Archaeological Museum", "museum", None, None),
        ("Karez Qanat Bidar", "historic", None, None),
    ],

    "Chikkamagaluru": [
        ("Mullayanagiri Peak", "natural", 13.3900, 75.7200),
        ("Baba Budangiri", "natural", 13.4300, 75.7700),
        ("Hirekolale Lake", "natural", 13.3400, 75.7200),
        ("Kudremukh Peak", "natural", None, None),
        ("Kemmanagundi", "viewpoint", None, None),
        ("Kalhatti Falls", "waterfall", None, None),
        ("Bhadra Wildlife Sanctuary", "nature", None, None),
        ("Jhari Falls", "waterfall", None, None),
        ("Hebbe Falls", "waterfall", None, None),
        ("Z Point Kemmanagundi", "viewpoint", None, None),
        ("Manikyadhara Falls", "waterfall", None, None),
        ("Seethalayyanagiri", "viewpoint", None, None),
        ("Deviramma Temple", "temple", None, None),
        ("Ayyanakere Lake", "natural", None, None),
        ("Belavadi Veera Narayana Temple", "temple", None, None),
        ("Sringeri Sharadamba Temple", "temple", None, None),
        ("Horanadu Annapoorneshwari Temple", "temple", None, None),
        ("Ballalarayana Durga Fort", "historic", None, None),
        ("Kyatanamakki Hill", "viewpoint", None, None),
        ("Hanuman Gundi Falls", "waterfall", None, None),
    ],

    "Coorg": [
        ("Abbey Falls", "waterfall", 12.4580, 75.7210),
        ("Raja's Seat", "viewpoint", 12.4200, 75.7380),
        ("Madikeri Fort", "historic", 12.4230, 75.7380),
        ("Talacauvery", "natural", None, None),
        ("Bhagamandala Temple", "temple", None, None),
        ("Dubare Elephant Camp", "nature", None, None),
        ("Cauvery Nisargadhama", "nature", None, None),
        ("Mandalpatti Viewpoint", "viewpoint", None, None),
        ("Iruppu Falls", "waterfall", None, None),
        ("Nagarhole National Park", "nature", None, None),
        ("Omkareshwara Temple Madikeri", "temple", None, None),
        ("Golden Temple Bylakuppe", "religious", None, None),
        ("Harangi Dam", "natural", None, None),
        ("Chelavara Falls", "waterfall", None, None),
        ("Nalknad Palace", "historic", None, None),
        ("Tadiandamol Peak", "natural", None, None),
        ("Pushpagiri Wildlife Sanctuary", "nature", None, None),
        ("Chiklihole Reservoir", "natural", None, None),
        ("Mallalli Falls", "waterfall", None, None),
        ("Raja Tomb Gaddige", "historic", None, None),
    ],

    "Gokarna": [
        ("Om Beach", "beach", 14.5150, 74.3180),
        ("Kudle Beach", "beach", 14.5350, 74.3200),
        ("Mahabaleshwar Temple", "temple", 14.5430, 74.3180),
        ("Half Moon Beach", "beach", None, None),
        ("Paradise Beach Gokarna", "beach", None, None),
        ("Mirjan Fort", "historic", None, None),
        ("Yana Caves", "natural", None, None),
        ("Gokarna Main Beach", "beach", None, None),
        ("Kotitirtha", "natural", None, None),
        ("Maha Ganapati Temple Gokarna", "temple", None, None),
        ("Bhadrakali Temple Gokarna", "temple", None, None),
        ("Shiva Cave Gokarna", "natural", None, None),
        ("Nirvana Beach", "beach", None, None),
        ("Belekan Beach", "beach", None, None),
        ("Baada Beach", "beach", None, None),
        ("Kumta Beach", "beach", None, None),
        ("Apsarakonda Falls", "waterfall", None, None),
        ("Apsarakonda Beach", "beach", None, None),
        ("Vibhooti Falls", "waterfall", None, None),
        ("Kagal Fort", "historic", None, None),
    ],

    "Hampi": [
        ("Virupaksha Temple", "temple", 15.3350, 76.4600),
        ("Vijaya Vittala Temple", "historic", 15.3470, 76.4770),
        ("Hemakuta Hill", "viewpoint", 15.3300, 76.4600),
        ("Lotus Mahal", "historic", None, None),
        ("Elephant Stables", "historic", None, None),
        ("Queen's Bath", "historic", None, None),
        ("Achyutaraya Temple", "temple", None, None),
        ("Sasivekalu Ganesha", "temple", None, None),
        ("Kadalekalu Ganesha", "temple", None, None),
        ("Lakshmi Narasimha Statue", "historic", None, None),
        ("Badavilinga Temple", "temple", None, None),
        ("Hazara Rama Temple", "temple", None, None),
        ("Stepped Tank Hampi", "historic", None, None),
        ("Mahanavami Dibba", "historic", None, None),
        ("Royal Enclosure Hampi", "historic", None, None),
        ("Matanga Hill", "viewpoint", None, None),
        ("Anjanadri Hill", "viewpoint", None, None),
        ("Tungabhadra Dam", "natural", None, None),
        ("Hampi Archaeological Museum Kamalapura", "museum", None, None),
        ("Krishna Temple Hampi", "temple", None, None),
    ],

    "Hassan": [
        ("Chennakeshava Temple Belur", "temple", 13.1620, 75.8650),
        ("Hoysaleswara Temple Halebidu", "temple", 13.2120, 75.9950),
        ("Shettihalli Rosary Church", "historic", 12.9500, 76.0000),
        ("Hasanamba Temple", "temple", None, None),
        ("Shravanabelagola Gomateshwara Statue", "historic", None, None),
        ("Manjarabad Fort", "historic", None, None),
        ("Gorur Dam", "natural", None, None),
        ("Mosale Nageshwara Temple", "temple", None, None),
        ("Lakshmi Devi Temple Doddagaddavalli", "temple", None, None),
        ("Kedareshwara Temple Halebidu", "temple", None, None),
        ("Jain Basadi Halebidu", "historic", None, None),
        ("Yagachi Dam", "natural", None, None),
        ("Bisle Ghat Viewpoint", "viewpoint", None, None),
        ("Sakleshpur Railway Bridge", "historic", None, None),
        ("Betta Byraveshwara Temple", "temple", None, None),
        ("Ramanathapura Temple", "temple", None, None),
        ("Bucheshwara Temple Koravangala", "temple", None, None),
        ("Ishvara Temple Arasikere", "temple", None, None),
        ("Lakshmi Narasimha Temple Javagal", "temple", None, None),
        ("Parshwanatha Basadi Shravanabelagola", "historic", None, None),
    ],

    "Hubballi": [
        ("Unkal Lake", "natural", 15.3770, 75.1020),
        ("Chandramouleshwara Temple", "temple", 15.3690, 75.1370),
        ("Siddharoodha Math", "temple", 15.3650, 75.1370),
        ("Nrupatunga Betta", "viewpoint", None, None),
        ("Indira Glass House Garden", "park", None, None),
        ("Tolankere Lake", "natural", None, None),
        ("Banashankari Temple Amargol", "temple", None, None),
        ("Bhavanishankar Temple Hubballi", "temple", None, None),
        ("Kittur Rani Chennamma Circle", "landmark", None, None),
        ("Sadhankeri Park Dharwad", "park", None, None),
        ("Dharwad Regional Science Centre", "museum", None, None),
        ("Dharwad Fort", "historic", None, None),
        ("Kelageri Lake", "natural", None, None),
        ("Tapovana Dharwad", "nature", None, None),
        ("Karnataka University Botanical Garden", "garden", None, None),
        ("Navagraha Teertha", "religious", None, None),
        ("Unkal Hanuman Temple", "temple", None, None),
        ("Gayatri Tapovan Hubballi", "religious", None, None),
        ("Dharwad Adventure Base", "recreation", None, None),
        ("Dattatreya Temple Dharwad", "temple", None, None),
    ],

    "Mysuru": [
        ("Mysore Palace", "historic", 12.3050, 76.6550),
        ("Chamundi Hill", "viewpoint", 12.2720, 76.6700),
        ("St. Philomena's Church", "historic", 12.3230, 76.6590),
        ("Mysuru Zoo", "nature", None, None),
        ("Jaganmohan Palace", "historic", None, None),
        ("Karanji Lake", "natural", None, None),
        ("Railway Museum Mysuru", "museum", None, None),
        ("Sand Sculpture Museum Mysuru", "museum", None, None),
        ("Brindavan Gardens", "garden", None, None),
        ("Krishnarajasagara Dam", "natural", None, None),
        ("Ranganathittu Bird Sanctuary", "nature", None, None),
        ("Srirangapatna Fort", "historic", None, None),
        ("Daria Daulat Bagh", "historic", None, None),
        ("Gumbaz Srirangapatna", "historic", None, None),
        ("Regional Museum of Natural History Mysuru", "museum", None, None),
        ("Kukkarahalli Lake", "natural", None, None),
        ("Lalitha Mahal Palace", "historic", None, None),
        ("Chamundeshwari Temple", "temple", None, None),
        ("Nandi Statue Chamundi Hill", "historic", None, None),
        ("Folklore Museum Mysuru", "museum", None, None),
    ],

    "Shivamogga": [
        ("Jog Falls", "waterfall", 14.2290, 74.8130),
        ("Sakrebailu Elephant Camp", "nature", 13.9980, 75.5670),
        ("Keladi Rameshwara Temple", "temple", 14.1100, 75.2670),
        ("Kodachadri Peak", "viewpoint", None, None),
        ("Bhadra Dam", "natural", None, None),
        ("Kundadri Hill", "viewpoint", None, None),
        ("Tyavarekoppa Lion and Tiger Safari", "nature", None, None),
        ("Mandagadde Bird Sanctuary", "nature", None, None),
        ("Gajanur Dam", "natural", None, None),
        ("Shivappa Nayaka Palace", "historic", None, None),
        ("Kavaledurga Fort", "historic", None, None),
        ("Ikkeri Aghoreshwara Temple", "temple", None, None),
        ("Sigandur Chowdeshwari Temple", "temple", None, None),
        ("Honnemaradu", "natural", None, None),
        ("Kunchikal Falls", "waterfall", None, None),
        ("Agumbe Sunset Point", "viewpoint", None, None),
        ("Barkana Falls", "waterfall", None, None),
        ("Onake Abbi Falls", "waterfall", None, None),
        ("Dabbe Falls", "waterfall", None, None),
        ("Gudavi Bird Sanctuary", "nature", None, None),
    ],

    "Udupi": [
        ("Sri Krishna Matha", "temple", 13.3410, 74.7480),
        ("Malpe Beach", "beach", 13.3490, 74.7030),
        ("Kaup Lighthouse", "lighthouse", 13.2210, 74.7460),
        ("St Mary's Island", "island", None, None),
        ("Kodi Bengre Beach", "beach", None, None),
        ("Anegudde Vinayaka Temple", "temple", None, None),
        ("Karkala Gomateshwara Statue", "historic", None, None),
        ("Kudlu Falls", "waterfall", None, None),
        ("Maravanthe Beach", "beach", None, None),
        ("Kollur Mookambika Temple", "temple", None, None),
        ("Barkur Temples", "historic", None, None),
        ("Kapu Beach", "beach", None, None),
        ("Manipal End Point", "viewpoint", None, None),
        ("Hasta Shilpa Heritage Village", "museum", None, None),
        ("Udyavara Beach", "beach", None, None),
        ("Hoode Beach", "beach", None, None),
        ("Delta Beach Kodi Bengre", "beach", None, None),
        ("Padubidri Beach", "beach", None, None),
        ("Varanga Jain Temple", "temple", None, None),
        ("Ottinene Viewpoint", "viewpoint", None, None),
    ],

    "Vijayapura": [
        ("Gol Gumbaz", "historic", 16.8300, 75.7380),
        ("Ibrahim Rauza", "historic", 16.8270, 75.7180),
        ("Bara Kaman", "historic", 16.8290, 75.7250),
        ("Malik-e-Maidan", "historic", None, None),
        ("Jod Gumbaz", "historic", None, None),
        ("Upli Buruj", "historic", None, None),
        ("Asar Mahal", "historic", None, None),
        ("Mehtar Mahal", "historic", None, None),
        ("Jami Masjid Vijayapura", "historic", None, None),
        ("Taj Bawdi", "historic", None, None),
        ("Gagan Mahal Vijayapura", "historic", None, None),
        ("Sat Manzil", "historic", None, None),
        ("Anand Mahal Vijayapura", "historic", None, None),
        ("Shivagiri Statue", "landmark", None, None),
        ("Basavana Bagewadi", "historic", None, None),
        ("Almatti Dam", "natural", None, None),
        ("Kudala Sangama", "religious", None, None),
        ("Siddeshwara Temple Vijayapura", "temple", None, None),
        ("Sangeet Mahal Vijayapura", "historic", None, None),
        ("Afzal Khan Cenotaph", "historic", None, None),
    ],
}


# Broad geographic bounds for Karnataka.
# These bounds alone do not prove that a geocoded result is correct.
KARNATAKA = (11.5, 74.0, 18.6, 78.7)


def locate(name, district, cache):
    """Find approximate coordinates using OpenStreetMap Nominatim."""
    key = f"{district}::{name}"

    if key in cache:
        return cache[key]

    queries = [
        f"{name}, {district}, Karnataka, India",
        f"{name}, Karnataka, India",
    ]

    for query in queries:
        url = "https://nominatim.openstreetmap.org/search?" + urlencode({
            "q": query,
            "format": "jsonv2",
            "limit": 3,
            "countrycodes": "in",
        })

        request = Request(
            url,
            headers={
                "User-Agent": (
                    "SafeTripKarnatakaStudentProject/1.0 "
                    "(educational place import)"
                )
            },
        )

        try:
            with urlopen(request, timeout=12) as response:
                matches = json.load(response)
        except (
            HTTPError,
            URLError,
            TimeoutError,
            ValueError,
            OSError,
        ):
            matches = []

        # Respect the public Nominatim service rate limit.
        time.sleep(1.1)

        for match in matches:
            try:
                latitude = float(match["lat"])
                longitude = float(match["lon"])
            except (ValueError, KeyError, TypeError):
                continue

            if (
                KARNATAKA[0] <= latitude <= KARNATAKA[2]
                and KARNATAKA[1] <= longitude <= KARNATAKA[3]
            ):
                cache[key] = [latitude, longitude]
                return latitude, longitude

    return None


class Command(BaseCommand):
    help = (
        "Import curated attractions for 14 destinations, "
        "without modifying Mangaluru or deleting existing places."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Check possible additions without saving places.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        total_added = 0
        total_skipped = 0

        cache_path = Path(__file__).with_name(
            "district_geocoding_cache.json"
        )

        try:
            if cache_path.exists():
                cache = json.loads(
                    cache_path.read_text(encoding="utf-8")
                )
            else:
                cache = {}
        except (ValueError, OSError):
            cache = {}

        for district_name, attractions in ATTRACTIONS.items():

            # Never import, update, or delete Mangaluru records.
            if district_name.casefold() == "mangaluru":
                continue

            district = District.objects.filter(
                name__iexact=district_name
            ).first()

            if district is None:
                self.stdout.write(
                    self.style.WARNING(
                        f"{district_name}: district not found; skipped."
                    )
                )
                continue

            added = 0
            skipped = 0
            existing = 0

            for name, category, latitude, longitude in attractions:
                external_id = (
                    f"curated:{slugify(district_name)}:{slugify(name)}"
                )

                # Do not duplicate a matching ID or same-name place
                # already associated with this destination.
                if (
                    Place.objects.filter(
                        external_place_id=external_id
                    ).exists()
                    or Place.objects.filter(
                        district=district,
                        name__iexact=name,
                    ).exists()
                ):
                    existing += 1
                    continue

                # Look up coordinates for new attractions.
                if latitude is None or longitude is None:
                    coords = locate(name, district_name, cache)

                    if coords is None:
                        skipped += 1
                        self.stdout.write(
                            f"  SKIPPED (location unresolved): {name}"
                        )
                        continue

                    latitude, longitude = coords

                if dry_run:
                    added += 1
                    continue

                with transaction.atomic():
                    _, created = Place.objects.get_or_create(
                        external_place_id=external_id,
                        defaults={
                            "district": district,
                            "source": "Curated",
                            "name": name,
                            "category": category,
                            "latitude": latitude,
                            "longitude": longitude,
                            "description": (
                                f"{name} is a tourist attraction "
                                f"associated with {district_name}, "
                                "Karnataka. Verify visitor information "
                                "before travelling."
                            ),
                        },
                    )

                if created:
                    added += 1

            total_added += added
            total_skipped += skipped

            status = "ready" if dry_run else "added"

            self.stdout.write(
                f"{district_name}: {added} {status}, "
                f"{existing} already existing, "
                f"{skipped} unresolved."
            )

        # Save successful geocoding results for future runs.
        if not dry_run:
            try:
                cache_path.write_text(
                    json.dumps(cache, indent=2),
                    encoding="utf-8",
                )
            except OSError:
                self.stdout.write(
                    self.style.WARNING(
                        "Could not save the geocoding cache."
                    )
                )

        message = (
            f"Finished: {total_added} "
            f"{'ready' if dry_run else 'added'}, "
            f"{total_skipped} unresolved. "
            "Mangaluru unchanged."
        )

        self.stdout.write(self.style.SUCCESS(message))