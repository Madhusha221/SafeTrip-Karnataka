import math
from datetime import datetime, timezone

CATEGORY_WEIGHTS = {
    'HARASSMENT': 25.0,
    'THEFT': 15.0,
    'ACCIDENT': 18.0,
    'UNSAFE_ROAD': 12.0,
    'SCAM': 8.0,
    'MEDICAL': 5.0,
    'LOST_ITEM': 4.0,
    'OTHER': 5.0,
}

def calculate_spatial_risk(target_lat, target_lng, incidents, is_evening=False):
    """
    Computes spatial-temporal risk score (0 - 100) based on distance, incident recency, category severity.
    """
    total_score = 0.0

    for incident in incidents:
        # Distance calculation via Haversine approximation
        d_lat = math.radians(float(incident.latitude) - float(target_lat))
        d_lng = math.radians(float(incident.longitude) - float(target_lng))
        distance_km = 6371.0 * math.sqrt(d_lat**2 + d_lng**2)

        if distance_km > 15.0: # 15 km spatial influence boundary
            continue

        days_old = (datetime.now(timezone.utc) - incident.created_at).days if hasattr(incident, 'created_at') else 1
        time_decay = math.exp(-0.04 * days_old)
        spatial_decay = math.exp(-0.25 * distance_km)

        weight = CATEGORY_WEIGHTS.get(incident.category, 5.0)
        total_score += weight * time_decay * spatial_decay

    if is_evening:
        total_score += 12.0 # Night hazard multiplier

    final_score = min(100.0, total_score)

    if final_score < 25.0:
        level = "Low Risk"
    elif final_score < 60.0:
        level = "Low to Moderate"
    else:
        level = "High Caution Required"

    return {
        'score': round(final_score, 1),
        'level': level,
        'incident_count': len(incidents)
    }
