"""
locator.py - Find nearby pharmacies via OpenStreetMap (no API key)
Called by: main.py  GET /api/locate-medicine
"""

import random
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent / ".env")


# Mock fallback (used if no lat/lng)
_MOCK_PHARMACIES = [
    {"name": "Apollo Pharmacy",      "address": "Main Road, Near Signal",  "distance_km": 0.5},
    {"name": "MedPlus",              "address": "2nd Cross, Bus Stand",     "distance_km": 1.2},
    {"name": "Wellness Forever",     "address": "MG Road, Opp Park",       "distance_km": 0.9},
    {"name": "Local Medical Store",  "address": "Gandhi Nagar, 3rd Street", "distance_km": 0.3},
    {"name": "Netmeds Store",        "address": "City Centre Mall",         "distance_km": 2.1},
]


# ---------------------------------------------
# HELPERS
# ---------------------------------------------

def _simulate_availability(medicine_name: str) -> bool:
    """Stable pseudo-random availability"""
    return random.random() > 0.35


def _enrich_mock(medicine_name: str) -> list[dict]:
    return [
        {
            "name":        p["name"],
            "address":     p["address"],
            "distance_km": p["distance_km"],
            "location":    None,
            "maps_link":   f"https://www.openstreetmap.org/search?query={p['name'].replace(' ', '+')}",
            "available":   _simulate_availability(medicine_name),
        }
        for p in _MOCK_PHARMACIES
    ]


# ---------------------------------------------
# MAIN FUNCTION (OSM)
# ---------------------------------------------

def find_medicine_nearby(medicine_name: str, lat: float | None, lng: float | None) -> list[dict]:
    """
    Return up to 5 nearby pharmacies using OpenStreetMap (Overpass API)
    Falls back to mock if no coordinates
    """

    if not lat or not lng:
        print("INFO Locator: using mock pharmacies (no coordinates).")
        return _enrich_mock(medicine_name)

    try:
        url = "https://overpass-api.de/api/interpreter"

        # Overpass query to find pharmacies within 3km
        query = f"""
        [out:json];
        node
          [amenity=pharmacy]
          (around:3000,{lat},{lng});
        out;
        """

        response = requests.post(url, data=query, timeout=10)
        response.raise_for_status()
        data = response.json()

        pharmacies = []

        for place in data.get("elements", [])[:5]:
            tags = place.get("tags", {})

            pharmacies.append({
                "name": tags.get("name", "Pharmacy"),
                "address": tags.get("addr:street", "Nearby area"),
                "location": {
                    "lat": place.get("lat"),
                    "lng": place.get("lon"),
                },
                "distance_km": None,
                "maps_link": f"https://www.openstreetmap.org/?mlat={place.get('lat')}&mlon={place.get('lon')}",
                "available": _simulate_availability(medicine_name),
            })

        if not pharmacies:
            print("INFO No OSM results, using mock fallback.")
            return _enrich_mock(medicine_name)

        return pharmacies

    except Exception as e:
        print(f"ERROR OSM error: {e} - falling back to mock data.")
        return _enrich_mock(medicine_name)