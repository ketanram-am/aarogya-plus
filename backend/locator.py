"""
locator.py — Final Stable + Clean Address Pharmacy Locator
"""

import requests
import time
from math import radians, sin, cos, sqrt, atan2
from datetime import datetime

# ---------------------------------------------
# CONFIG
# ---------------------------------------------

DEFAULT_OPEN = 9
DEFAULT_CLOSE = 21


# ---------------------------------------------
# TIME + STATUS
# ---------------------------------------------

def _default_hours():
    return "Open 9:00 AM - 9:00 PM"

def _is_open_now():
    now = datetime.now().hour
    return DEFAULT_OPEN <= now < DEFAULT_CLOSE


# ---------------------------------------------
# HAVERSINE (fallback distance)
# ---------------------------------------------

def _haversine(lat1, lng1, lat2, lng2):
    lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])

    dlat = lat2 - lat1
    dlng = lng2 - lng1

    a = sin(dlat / 2)**2 + cos(lat1) * cos(lat2) * sin(dlng / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return round(6371 * c, 2)


# ---------------------------------------------
# OSRM ROAD DISTANCE (SAFE)
# ---------------------------------------------

def _get_road_distance(lat1, lng1, lat2, lng2):
    try:
        url = f"http://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}?overview=false"
        res = requests.get(url, timeout=6).json()

        if "routes" in res and len(res["routes"]) > 0:
            meters = res["routes"][0]["distance"]
            return round(meters / 1000, 2)

        return None
    except Exception as e:
        print("OSRM error:", e)
        return None


# ---------------------------------------------
# REVERSE GEOCODE (SHORT ADDRESS)
# ---------------------------------------------

def _reverse_geocode(lat, lon):
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}"
        res = requests.get(
            url,
            headers={"User-Agent": "aarogya-app"},
            timeout=5
        ).json()

        addr = res.get("address", {})

        # Extract meaningful short parts
        area = (
            addr.get("suburb") or
            addr.get("neighbourhood") or
            addr.get("village") or
            addr.get("town") or
            addr.get("city") or
            ""
        )

        city = addr.get("city") or addr.get("state_district") or ""

        if area and city:
            return f"{area}, {city}"
        elif city:
            return city
        else:
            return "Nearby area"

    except Exception as e:
        print("Geocode error:", e)
        return "Nearby area"


# ---------------------------------------------
# MAIN FUNCTION
# ---------------------------------------------

def find_medicine_nearby(_, lat, lng):

    try:
        lat = float(lat)
        lng = float(lng)

        print(f"📍 Searching near: {lat}, {lng}")

        url = "https://overpass-api.de/api/interpreter"

        query = f"""
        [out:json][timeout:25];
        (
          node["amenity"="pharmacy"](around:5000,{lat},{lng});
          way["amenity"="pharmacy"](around:5000,{lat},{lng});
        );
        out center;
        """

        # Retry Overpass
        for attempt in range(2):
            try:
                response = requests.post(url, data=query, timeout=20)
                response.raise_for_status()
                data = response.json()
                break
            except Exception as e:
                print(f"⚠️ Retry {attempt+1} failed:", e)
                time.sleep(1)
        else:
            return {"results": [], "error": "Map service is busy"}

        elements = data.get("elements", [])
        print(f"✅ Found {len(elements)} raw results")

        pharmacies = []
        seen = set()

        # ---------------------------------------------
        # STEP 1: COLLECT + HAVERSINE
        # ---------------------------------------------

        for place in elements:
            tags = place.get("tags", {})
            p_id = place.get("id")

            if p_id in seen:
                continue
            seen.add(p_id)

            if place["type"] == "node":
                p_lat = place.get("lat")
                p_lng = place.get("lon")
            else:
                center = place.get("center", {})
                p_lat = center.get("lat")
                p_lng = center.get("lon")

            if p_lat is None or p_lng is None:
                continue

            approx_distance = _haversine(lat, lng, p_lat, p_lng)

            pharmacies.append({
                "id": p_id,
                "name": tags.get("name") or tags.get("name:en") or "Local Pharmacy",
                "lat": p_lat,
                "lon": p_lng,
                "distance_km": approx_distance,
                "phone": tags.get("phone") or tags.get("contact:phone") or "Not available",
                "is_open_now": _is_open_now(),
                "opening_hours_display": tags.get("opening_hours") or _default_hours(),
                "maps_link": f"https://www.openstreetmap.org/directions?engine=osrm_car&route={lat},{lng};{p_lat},{p_lng}",
            })

        # ---------------------------------------------
        # STEP 2: SHORTLIST
        # ---------------------------------------------

        pharmacies.sort(key=lambda x: x["distance_km"])
        pharmacies = pharmacies[:12]

        # ---------------------------------------------
        # STEP 3: ROAD DISTANCE (WITH FALLBACK)
        # ---------------------------------------------

        final_list = []

        for p in pharmacies:
            road_distance = _get_road_distance(lat, lng, p["lat"], p["lon"])

            if road_distance is not None:
                p["distance_km"] = road_distance

            final_list.append(p)

        # ---------------------------------------------
        # STEP 4: SORT FINAL
        # ---------------------------------------------

        final_list.sort(key=lambda x: x["distance_km"])
        top5 = final_list[:5]

        # ---------------------------------------------
        # STEP 5: CLEAN ADDRESS
        # ---------------------------------------------

        for p in top5[:3]:
            p["address"] = _reverse_geocode(p["lat"], p["lon"])

        for p in top5[3:]:
            p["address"] = "Nearby area"

        return {
            "results": top5,
            "count": len(top5),
            "note": "Top 5 pharmacies (clean address view)"
        }

    except Exception as e:
        print("❌ SYSTEM ERROR:", e)
        return {
            "results": [],
            "error": "Something went wrong"
        }