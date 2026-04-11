
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
from utils import haversineMiles, safeFloat, safeGet


CTA_STOPS_API = "https://data.cityofchicago.org/resource/qs84-j7wh.json"


def _fetchAllStops(limit: int = 5000) -> list[dict[str, Any]]:
    params = {
        "$limit": limit,
    }
    return safeGet(CTA_STOPS_API, params=params)


def _extractStopLatLng(stop: dict[str, Any]) -> tuple[float | None, float | None]:
    """
    Chicago CTA bus stops dataset stores coordinates in:
    stop["the_geom"]["coordinates"] = [lng, lat]
    """
    geom = stop.get("the_geom")
    if isinstance(geom, dict):
        coords = geom.get("coordinates")
        if isinstance(coords, list) and len(coords) >= 2:
            lng = safeFloat(coords[0])
            lat = safeFloat(coords[1])
            return lat, lng

    return None, None


def _extractStopName(stop: dict[str, Any]) -> str:
    return str(
        stop.get("public_nam")
        or stop.get("stop_name")
        or stop.get("name")
        or "Unknown Stop"
    )


def fetchTransit(
    plot: dict[str, Any],
    radiusMiles: float = SEARCH_RADIUS_MILES,
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
    lat = safeFloat(plot.get("lat"))
    lng = safeFloat(plot.get("lng"))

    if lat is None or lng is None:
        return {
            "transit_distance": None,
            "nearest_station": None,
            "transit_stop_count_nearby": 0,
        }

    try:
        stops = _fetchAllStops()

        nearestDistance: float | None = None
        nearestStation: str | None = None
        nearbyCount = 0

        for stop in stops:
            stopLat, stopLng = _extractStopLatLng(stop)
            if stopLat is None or stopLng is None:
                continue

            distance = haversineMiles(lat, lng, stopLat, stopLng)

            if distance <= radiusMiles:
                nearbyCount += 1

            if nearestDistance is None or distance < nearestDistance:
                nearestDistance = distance
                nearestStation = _extractStopName(stop)

        return {
            "transit_distance": round(nearestDistance, 4) if nearestDistance is not None else None,
            "nearest_station": nearestStation,
            "transit_stop_count_nearby": nearbyCount,
        }

    except Exception as exc:
        print(f"[fetchTransit] Failed for plot {plot.get('id')}: {exc}")
        return {
            "transit_distance": None,
            "nearest_station": None,
            "transit_stop_count_nearby": 0,
        }


if __name__ == "__main__":
    samplePlot = {
        "id": "test_plot",
        "lat": 41.8781,
        "lng": -87.6298,
    }
    result = fetchTransit(samplePlot)
    print(result)