import requests


class RoutingService:
    """
    SafeTrip routing service using OSRM.

    OSRM provides real road routes, distance,
    duration and route geometry.
    """

    OSRM_URL = "https://router.project-osrm.org/route/v1/driving"

    USER_AGENT = "SafeTrip-Karnataka/1.0"

    @staticmethod
    def get_routes(
        origin_latitude,
        origin_longitude,
        destination_latitude,
        destination_longitude,
    ):
        """
        Calculate real driving routes between two locations.

        Coordinates:
            latitude, longitude

        Returns:
            Dictionary containing route information.
        """

        try:
            # OSRM expects:
            # longitude,latitude
            origin = (
                f"{origin_longitude},{origin_latitude}"
            )

            destination = (
                f"{destination_longitude},{destination_latitude}"
            )

            url = (
                f"{RoutingService.OSRM_URL}/"
                f"{origin};{destination}"
            )

            params = {
                "alternatives": "true",
                "steps": "true",
                "overview": "full",
                "geometries": "geojson",
            }

            response = requests.get(
                url,
                params=params,
                headers={
                    "User-Agent":
                        RoutingService.USER_AGENT
                },
                timeout=30,
            )

            response.raise_for_status()

            data = response.json()

            # ------------------------------------------------
            # Check OSRM response
            # ------------------------------------------------

            if data.get("code") != "Ok":

                return {
                    "success": False,
                    "error": data.get(
                        "message",
                        "OSRM could not calculate the route."
                    ),
                    "routes": [],
                }

            routes = []

            # ------------------------------------------------
            # Process every route returned by OSRM
            # ------------------------------------------------

            for index, route in enumerate(
                data.get("routes", [])
            ):

                distance_km = (
                    route.get("distance", 0) / 1000
                )

                duration_minutes = (
                    route.get("duration", 0) / 60
                )

                duration_hours = int(
                    duration_minutes // 60
                )

                remaining_minutes = int(
                    round(duration_minutes % 60)
                )

                if duration_hours > 0:

                    duration_text = (
                        f"{duration_hours} hr "
                        f"{remaining_minutes} min"
                    )

                else:

                    duration_text = (
                        f"{remaining_minutes} min"
                    )

                # --------------------------------------------
                # Route geometry
                # --------------------------------------------

                geometry = route.get(
                    "geometry",
                    {}
                )

                coordinates = geometry.get(
                    "coordinates",
                    []
                )

                # --------------------------------------------
                # Route object
                # --------------------------------------------

                route_data = {
                    "route_number": index + 1,

                    "distance_km": round(
                        distance_km,
                        2
                    ),

                    "duration_minutes": round(
                        duration_minutes
                    ),

                    "duration_text":
                        duration_text,

                    "geometry":
                        geometry,

                    "coordinates":
                        coordinates,

                    "legs":
                        route.get(
                            "legs",
                            []
                        ),

                    "summary":
                        route.get(
                            "legs",
                            [{}]
                        )[0].get(
                            "summary",
                            ""
                        ),
                }

                routes.append(
                    route_data
                )

            # ------------------------------------------------
            # Return result
            # ------------------------------------------------

            return {
                "success": True,

                "source": "OSRM",

                "origin": {
                    "latitude":
                        origin_latitude,
                    "longitude":
                        origin_longitude,
                },

                "destination": {
                    "latitude":
                        destination_latitude,
                    "longitude":
                        destination_longitude,
                },

                "routes": routes,
            }

        except requests.RequestException as error:

            print(
                f"OSRM routing request failed: {error}"
            )

            return {
                "success": False,

                "error":
                    "Unable to connect to the routing service.",

                "routes": [],
            }

        except Exception as error:

            print(
                f"OSRM routing error: {error}"
            )

            return {
                "success": False,

                "error":
                    str(error),

                "routes": [],
            }