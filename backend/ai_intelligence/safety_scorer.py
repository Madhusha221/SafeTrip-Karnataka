class SafetyScorer:
    """
    AI Safety Intelligence Scorer for SafeTrip Karnataka.
    Calculates dynamic safety ratings (1.0 to 5.0 scale) based on:
    - Verified Incident History (-0.5 per recent verified incident)
    - Road & Area Lighting Score (1-5 weight: 25%)
    - Crowd & Activity Level (1-5 weight: 25%)
    - Police Patrol Presence (1-5 weight: 25%)
    - Community Female Solo Ratings (weight: 25%)
    """

    @staticmethod
    def calculate_place_safety(incident_count, lighting_score=4, crowd_density=4, patrol_level=4, female_solo_rating=4.5):
        base_score = (lighting_score * 0.25) + (crowd_density * 0.25) + (patrol_level * 0.25) + (female_solo_rating * 0.25)
        penalty = min(incident_count * 0.4, 2.0)
        final_score = round(max(1.0, min(5.0, base_score - penalty)), 1)
        
        if final_score >= 4.2:
            badge = "Safe Zone"
            color = "#10B981" # Green
        elif final_score >= 3.0:
            badge = "Moderate Safety - Use Caution"
            color = "#F59E0B" # Amber
        else:
            badge = "High Risk - Exercise Caution"
            color = "#EF4444" # Red
            
        return {
            "safety_index": final_score,
            "badge": badge,
            "badge_color": color,
            "factors": {
                "lighting_score": lighting_score,
                "crowd_density": crowd_density,
                "patrol_level": patrol_level,
                "female_solo_rating": female_solo_rating,
                "incident_penalty": penalty
            }
        }

    @staticmethod
    def evaluate_route_risk(route_distance_km, reported_incidents_on_path, lighting_quality="Good"):
        risk_score = 4.8
        reasons_safe = []
        reasons_warning = []

        if len(reported_incidents_on_path) == 0:
            reasons_safe.append("Fewer reported incidents")
            reasons_safe.append("Popular among travelers")
        else:
            risk_score -= (len(reported_incidents_on_path) * 0.5)
            reasons_warning.append(f"{len(reported_incidents_on_path)} recent incident reports along stretch")

        if lighting_quality.lower() in ["good", "well-lit"]:
            reasons_safe.append("Well-lit highways and toll roads")
            reasons_safe.append("Regular police patrolling")
        else:
            risk_score -= 0.6
            reasons_warning.append("Poor lighting in rural bypass stretches")

        risk_score = round(max(1.5, min(5.0, risk_score)), 1)
        
        return {
            "score": risk_score,
            "reasons_safe": reasons_safe,
            "reasons_warning": reasons_warning
        }
