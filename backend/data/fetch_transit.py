
# ⸻

# What this file does

# This file:
# 	•	pulls CTA stop data
# 	•	checks all transit stops against the plot location
# 	•	finds the nearest stop
# 	•	counts how many stops are within your search radius
# 	•	returns a clean transit summary
from __future__ import annotations

from typing import Any

from config import SEARCH_RADIUS_MILES
from utils import haversine_miles, safe_float, safe_get


CTA_STOPS_API = "https://data.cityofchicago.org/resource/qs84-j7wh.json"


def _fetch_all_stops(limit: int = 5000) -> list[dict[str, Any]]:
    params = {
        "$limit": limit,
    }
    return safe_get(CTA_STOPS_API, params=params)


def _extract_stop_lat_lng(stop: dict[str, Any]) -> tuple[float | None, float | None]:
    """
    Chicago CTA bus stops dataset stores coordinates in:
    stop["the_geom"]["coordinates"] = [lng, lat]
    """
    geom = stop.get("the_geom")
    if isinstance(geom, dict):
        coords = geom.get("coordinates")
        if isinstance(coords, list) and len(coords) >= 2:
            lng = safe_float(coords[0])
            lat = safe_float(coords[1])
            return lat, lng

    return None, None


def _extract_stop_name(stop: dict[str, Any]) -> str:
    return str(
        stop.get("public_nam")
        or stop.get("stop_name")
        or stop.get("name")
        or "Unknown Stop"
    )


def fetch_transit(
    plot: dict[str, Any],
    radius_miles: float = SEARCH_RADIUS_MILES,
) -> dict[str, Any]:
    """
    Fetch nearest CTA transit stop distance for a plot.

    Returns a consistent structure:
    {
        "transit_distance": float | None,
        "nearest_station": str | None,
        "transit_stop_count_nearby": int
    }
    """
    lat = safe_float(plot.get("lat"))
    lng = safe_float(plot.get("lng"))

    if lat is None or lng is None:
        return {
            "transit_distance": None,
            "nearest_station": None,
            "transit_stop_count_nearby": 0,
        }

    try:
        stops = _fetch_all_stops()

        nearest_distance: float | None = None
        nearest_station: str | None = None
        nearby_count = 0

        for stop in stops:
            stop_lat, stop_lng = _extract_stop_lat_lng(stop)
            if stop_lat is None or stop_lng is None:
                continue

            distance = haversine_miles(lat, lng, stop_lat, stop_lng)

            if distance <= radius_miles:
                nearby_count += 1

            if nearest_distance is None or distance < nearest_distance:
                nearest_distance = distance
                nearest_station = _extract_stop_name(stop)

        return {
            "transit_distance": round(nearest_distance, 4) if nearest_distance is not None else None,
            "nearest_station": nearest_station,
            "transit_stop_count_nearby": nearby_count,
        }

    except Exception as exc:
        print(f"[fetch_transit] Failed for plot {plot.get('id')}: {exc}")
        return {
            "transit_distance": None,
            "nearest_station": None,
            "transit_stop_count_nearby": 0,
        }


if __name__ == "__main__":
    sample_plot = {
        "id": "test_plot",
        "lat": 41.8781,
        "lng": -87.6298,
    }
    result = fetch_transit(sample_plot)
    print(result)