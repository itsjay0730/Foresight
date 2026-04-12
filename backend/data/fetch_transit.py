from __future__ import annotations

from typing import Any

from config import CTA_STOPS_API, SEARCH_RADIUS_CRIME_MILES
from utils import haversineMiles, safeFloat, safeGet


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

    lat = safeFloat(stop.get("lat")) or safeFloat(stop.get("latitude"))
    lng = (
        safeFloat(stop.get("long"))
        or safeFloat(stop.get("lng"))
        or safeFloat(stop.get("longitude"))
    )
    return lat, lng


def _extractStopName(stop: dict[str, Any]) -> str:
    return str(
        stop.get("public_nam")
        or stop.get("stop_name")
        or stop.get("name")
        or "Unknown Stop"
    )


def fetchTransit(
    plot: dict[str, Any],
    radiusMiles: float = SEARCH_RADIUS_CRIME_MILES,
) -> dict[str, Any]:
    """
    Fetch nearest CTA transit stop distance for a plot.

    Returns:
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