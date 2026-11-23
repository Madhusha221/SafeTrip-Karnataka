from .safety_scorer import SafetyScorer

class RouteAnalyzer:
    """
    Analyzes route paths between Karnataka hubs/districts and builds comparative route recommendations.
    """
    
    @staticmethod
    def analyze_travel_pair(origin, destination):
        # Default route database for key Karnataka highways
        route_database = {
            ("Bengaluru", "Mangaluru"): {
                "recommended": {
                    "name": "Via NH 75 (Hassan - Sakleshpur)",
                    "duration": "5h 45m",
                    "distance": "350 km",
                    "safety_score": 4.8,
                    "safe_reasons": [
                        "Fewer reported incidents",
                        "Well-lit national highway",
                        "Regular highway police patrolling",
                        "Popular & heavily traveled route"
                    ]
                },
                "alternative": {
                    "name": "Via State Highway SH 85 (Isolated Rural)",
                    "duration": "6h 20m",
                    "distance": "375 km",
                    "safety_score": 3.1,
                    "warning_reasons": [
                        "Recent reports of harassment near unlit tolls",
                        "Poor street lighting in forest ghat sections",
                        "Less crowd and isolated stretches after sunset"
                    ]
                }
            },
            ("Mysuru", "Mangaluru"): {
                "recommended": {
                    "name": "Via NH 275 & Sampaje Ghat",
                    "duration": "4h 30m",
                    "distance": "260 km",
                    "safety_score": 4.7,
                    "safe_reasons": [
                        "Scenic & frequent tourist movement",
                        "Active checkposts along Kodagu border",
                        "Good mobile network connectivity"
                    ]
                },
                "alternative": {
                    "name": "Via Subrahmanya Forest Road",
                    "duration": "5h 10m",
                    "distance": "280 km",
                    "safety_score": 3.4,
                    "warning_reasons": [
                        "Dense forest stretch with zero network bars",
                        "Wildlife crossing hazard at night"
                    ]
                }
            },
            ("Hubballi", "Mangaluru"): {
                "recommended": {
                    "name": "Via NH 63 & Coastal Highway NH 66",
                    "duration": "6h 20m",
                    "distance": "410 km",
                    "safety_score": 4.6,
                    "safe_reasons": [
                        "Major commercial corridor with 24x7 eateries",
                        "Well-lit coastal towns along Karwar & Udupi"
                    ]
                },
                "alternative": {
                    "name": "Via Yellapur Ghat Shortcut",
                    "duration": "6h 50m",
                    "distance": "425 km",
                    "safety_score": 3.3,
                    "warning_reasons": [
                        "Narrow single-lane roads with heavy fog",
                        "Infrequent highway patrol presence"
                    ]
                }
            }
        }

        pair_key = (origin, destination)
        if pair_key in route_database:
            return route_database[pair_key]
        
        # Generic generated route evaluation
        return {
            "recommended": {
                "name": f"Recommended Highway: {origin} to {destination}",
                "duration": "4h 15m",
                "distance": "240 km",
                "safety_score": 4.7,
                "safe_reasons": [
                    "Main tourist corridor with regular petrol pumps",
                    "High daytime traffic and visible police outposts",
                    "Good road illumination and clear signage"
                ]
            },
            "alternative": {
                "name": f"Alternative Bypass: {origin} to {destination}",
                "duration": "4h 50m",
                "distance": "265 km",
                "safety_score": 3.2,
                "warning_reasons": [
                    "Isolated rural stretches",
                    "Limited street lighting during night travel"
                ]
            }
        }
