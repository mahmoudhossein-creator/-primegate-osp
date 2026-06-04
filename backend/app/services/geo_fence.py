"""Haversine geo-fence check — no external libraries needed."""
import math

def haversine_distance_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Returns distance in metres between two GPS coordinates."""
    R = 6_371_000  # Earth radius in metres
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def is_within_fence(lat: float, lng: float, fence_lat: float, fence_lng: float, radius_m: int) -> bool:
    return haversine_distance_m(lat, lng, fence_lat, fence_lng) <= radius_m
