
import time
import requests


class OSMPlaceService:
    """
    Discover real tourist attractions from OpenStreetMap
    using the Overpass API with multiple fallback servers.
    """

    OVERPASS_URLS = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.private.coffee/api/interpreter",
        "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    ]

    USER_AGENT = (
        "SafeTrip-Karnataka/1.0 "
        "(MCA Student Project)"
    )

    @staticmethod
    def get_places(latitude, longitude, radius=30000):

        try:
            latitude = float(latitude)
            longitude = float(longitude)
            radius = int(radius)

            if not -90 <= latitude <= 90:
                raise ValueError("Latitude out of range.")

            if not -180 <= longitude <= 180:
                raise ValueError("Longitude out of range.")

            radius = max(1000, min(radius, 100000))

        except (TypeError, ValueError):
            print("Invalid latitude, longitude, or radius.")
            return []

        query = f"""
        [out:json][timeout:60];

        (
            nwr(around:{radius},{latitude},{longitude})
                ["tourism"~"^(attraction|museum|gallery|artwork|theme_park|zoo|aquarium|viewpoint|camp_site|picnic_site)$"]
                ["name"];

            nwr(around:{radius},{latitude},{longitude})
                ["historic"~"^(monument|castle|fort|archaeological_site|ruins|memorial)$"]
                ["name"];

            nwr(around:{radius},{latitude},{longitude})
                ["leisure"~"^(park|nature_reserve|garden|water_park)$"]
                ["name"];

            nwr(around:{radius},{latitude},{longitude})
                ["natural"~"^(beach|waterfall|cave|peak|cliff)$"]
                ["name"];

            nwr(around:{radius},{latitude},{longitude})
                ["amenity"="place_of_worship"]
                ["name"];

            nwr(around:{radius},{latitude},{longitude})
                ["building"="temple"]
                ["name"];
        );

        out center tags;
        """

        data = None

        for index, url in enumerate(OSMPlaceService.OVERPASS_URLS):
            try:
                print(
                    f"Querying OpenStreetMap server "
                    f"{index + 1}/{len(OSMPlaceService.OVERPASS_URLS)}..."
                )

                response = requests.post(
                    url,
                    data={"data": query},
                    headers={
                        "User-Agent": OSMPlaceService.USER_AGENT
                    },
                    timeout=(10, 75),
                )

                response.raise_for_status()
                data = response.json()

                print("OpenStreetMap request successful.")
                break

            except (requests.RequestException, ValueError) as error:
                print(f"OpenStreetMap request failed: {error}")

                if index < len(OSMPlaceService.OVERPASS_URLS) - 1:
                    time.sleep(2)

        if data is None:
            print("All OpenStreetMap servers failed.")
            return []

        places = {}

        for element in data.get("elements", []):
            tags = element.get("tags", {})

            name = (
                tags.get("name")
                or tags.get("name:en")
                or tags.get("official_name")
            )

            if not name:
                continue

            if element.get("type") == "node":
                place_latitude = element.get("lat")
                place_longitude = element.get("lon")
            else:
                center = element.get("center", {})
                place_latitude = center.get("lat")
                place_longitude = center.get("lon")

            if place_latitude is None or place_longitude is None:
                continue

            category = (
                tags.get("tourism")
                or tags.get("historic")
                or tags.get("leisure")
                or tags.get("natural")
                or tags.get("amenity")
                or tags.get("building")
                or "attraction"
            )

            address_parts = [
                tags.get("addr:housenumber"),
                tags.get("addr:street"),
                tags.get("addr:suburb"),
                tags.get("addr:city"),
                tags.get("addr:district"),
                tags.get("addr:state"),
            ]

            address = ", ".join(
                part for part in address_parts if part
            )

            external_place_id = (
                f"osm:{element.get('type')}:"
                f"{element.get('id')}"
            )

            place = {
                "external_place_id": external_place_id,
                "source": "OpenStreetMap",
                "name": name,
                "category": category,
                "latitude": place_latitude,
                "longitude": place_longitude,
                "description": tags.get("description", ""),
                "website": (
                    tags.get("website")
                    or tags.get("contact:website", "")
                ),
                "phone": (
                    tags.get("phone")
                    or tags.get("contact:phone", "")
                ),
                "opening_hours": tags.get("opening_hours", ""),
                "fee": tags.get("fee", ""),
                "address": address,
                "image_url": tags.get("image", ""),
                "wikimedia_commons": tags.get(
                    "wikimedia_commons", ""
                ),
                "wikidata": tags.get("wikidata", ""),
                "osm_type": element.get("type", ""),
                "osm_id": element.get("id"),
            }

            places[external_place_id] = place

        final_places = list(places.values())

        print(
            f"OpenStreetMap returned "
            f"{len(final_places)} named places."
        )

        return final_places
