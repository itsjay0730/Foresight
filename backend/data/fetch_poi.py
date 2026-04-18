from __future__ import annotations

from typing import Any

from config import SEARCH_RADIUS_AMENITIES_MILES
from data.overpass_client import safeOverpassPost
from utils import safeFloat


MILES_TO_METERS = 1609.34

POI_CONFIG = {
    "school_poi_count_nearby": ("amenity", "school"),
    "hospital_poi_count_nearby": ("amenity", "hospital"),
    "university_poi_count_nearby": ("amenity", "university"),
    "office_poi_count_nearby": ("office", None),
    "park_poi_count_nearby": ("leisure", "park"),
}

POI_WEIGHTS = {
    "school_poi_count_nearby": 1.0,
    "hospital_poi_count_nearby": 1.4,
    "university_poi_count_nearby": 1.2,
    "office_poi_count_nearby": 0.8,
    "park_poi_count_nearby": 1.0,
}


def _emptyPoiResponse() -> dict[str, Any]:
    return {
        "school_poi_count_nearby": 0,
        "hospital_poi_count_nearby": 0,
        "university_poi_count_nearby": 0,
        "office_poi_count_nearby": 0,
        "park_poi_count_nearby": 0,
        "poi_density_score": 0.0,
    }


def _milesToMeters(miles: float) -> int:
    return int(miles * MILES_TO_METERS)


def _buildOverpassQuery(lat: float, lng: float, radiusMeters: int) -> str:
    parts: list[str] = []

    for key, value in POI_CONFIG.values():
        if value is None:
            parts.extend(
                [
                    f'node["{key}"](around:{radiusMeters},{lat},{lng});',
                    f'way["{key}"](around:{radiusMeters},{lat},{lng});',
                    f'relation["{key}"](around:{radiusMeters},{lat},{lng});',
                ]
            )
        else:
            parts.extend(
                [
                    f'node["{key}"="{value}"](around:{radiusMeters},{lat},{lng});',
                    f'way["{key}"="{value}"](around:{radiusMeters},{lat},{lng});',
                    f'relation["{key}"="{value}"](around:{radiusMeters},{lat},{lng});',
                ]
            )

    joinedParts = "\n      ".join(parts)

    return f"""
    [out:json][timeout:25];
    (
      {joinedParts}
    );
    out tags center;
    """


def _uniqueElementKey(element: dict[str, Any]) -> tuple[Any, Any]:
    return (element.get("type"), element.get("id"))


def _countAmenity(
    elements: list[dict[str, Any]],
    key: str,
    value: str | None = None,
) -> int:
    count = 0
    seen: set[tuple[Any, Any]] = set()

    for element in elements:
        tags = element.get("tags", {}) or {}

        if key not in tags:
            continue

        if value is not None and tags.get(key) != value:
            continue

        uniqueKey = _uniqueElementKey(element)
        if uniqueKey in seen:
            continue

        seen.add(uniqueKey)
        count += 1

    return count


def _buildPoiDensityScore(counts: dict[str, int]) -> float:
    raw = 0.0

    for metricName, weight in POI_WEIGHTS.items():
        raw += counts.get(metricName, 0) * weight

    return round(min(raw / 25.0, 1.0), 4)


def fetchPOI(plot: dict[str, Any]) -> dict[str, Any]:
    empty = _emptyPoiResponse()

    lat = safeFloat(plot.get("lat"))
    lng = safeFloat(plot.get("lng"))

    if lat is None or lng is None:
        return empty

    radiusMeters = _milesToMeters(SEARCH_RADIUS_AMENITIES_MILES)
    query = _buildOverpassQuery(lat, lng, radiusMeters)

    try:
        payload = safeOverpassPost(query)
        elements = payload.get("elements", []) if isinstance(payload, dict) else []
        elements = elements or []

        counts: dict[str, int] = {}
        for metricName, (key, value) in POI_CONFIG.items():
            counts[metricName] = _countAmenity(elements, key, value)

        return {
            **counts,
            "poi_density_score": _buildPoiDensityScore(counts),
        }

    except Exception as exc:
        print(f"[fetchPOI] Failed for plot {plot.get('id')}: {exc}")
        return empty


if __name__ == "__main__":
    samplePlot = {
        "id": "test_plot",
        "lat": 41.8994,
        "lng": -87.6272,
    }
    result = fetchPOI(samplePlot)
    print(result)