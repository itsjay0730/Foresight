from __future__ import annotations

from typing import Any

from config import SEARCH_RADIUS_AMENITIES_MILES
from data.overpass_client import safeOverpassPost
from utils import safeFloat


MILES_TO_METERS = 1609.34


def _milesToMeters(miles: float) -> int:
    return int(miles * MILES_TO_METERS)


def _buildOverpassQuery(lat: float, lng: float, radiusMeters: int) -> str:
    return f"""
    [out:json][timeout:25];
    (
      node["amenity"="school"](around:{radiusMeters},{lat},{lng});
      way["amenity"="school"](around:{radiusMeters},{lat},{lng});
      relation["amenity"="school"](around:{radiusMeters},{lat},{lng});

      node["amenity"="hospital"](around:{radiusMeters},{lat},{lng});
      way["amenity"="hospital"](around:{radiusMeters},{lat},{lng});
      relation["amenity"="hospital"](around:{radiusMeters},{lat},{lng});

      node["amenity"="university"](around:{radiusMeters},{lat},{lng});
      way["amenity"="university"](around:{radiusMeters},{lat},{lng});
      relation["amenity"="university"](around:{radiusMeters},{lat},{lng});

      node["office"](around:{radiusMeters},{lat},{lng});
      way["office"](around:{radiusMeters},{lat},{lng});
      relation["office"](around:{radiusMeters},{lat},{lng});

      node["leisure"="park"](around:{radiusMeters},{lat},{lng});
      way["leisure"="park"](around:{radiusMeters},{lat},{lng});
      relation["leisure"="park"](around:{radiusMeters},{lat},{lng});
    );
    out tags center;
    """


def _countAmenity(elements: list[dict[str, Any]], key: str, value: str | None = None) -> int:
    count = 0
    seen = set()

    for element in elements:
        tags = element.get("tags", {}) or {}

        if key not in tags:
            continue

        if value is not None and tags.get(key) != value:
            continue

        uniqueKey = (element.get("type"), element.get("id"))
        if uniqueKey in seen:
            continue

        seen.add(uniqueKey)
        count += 1

    return count


def _buildPoiDensityScore(
    schools: int,
    hospitals: int,
    universities: int,
    offices: int,
    parks: int,
) -> float:
    raw = (
        schools * 1.0
        + hospitals * 1.4
        + universities * 1.2
        + offices * 0.8
        + parks * 1.0
    )
    return round(min(raw / 25.0, 1.0), 4)


def fetchPOI(plot: dict[str, Any]) -> dict[str, Any]:
    empty = {
        "school_poi_count_nearby": 0,
        "hospital_poi_count_nearby": 0,
        "university_poi_count_nearby": 0,
        "office_poi_count_nearby": 0,
        "park_poi_count_nearby": 0,
        "poi_density_score": 0.0,
    }

    lat = safeFloat(plot.get("lat"))
    lng = safeFloat(plot.get("lng"))

    if lat is None or lng is None:
        return empty

    radiusMeters = _milesToMeters(SEARCH_RADIUS_AMENITIES_MILES)
    query = _buildOverpassQuery(lat, lng, radiusMeters)

    try:
        payload = safeOverpassPost(query)
        elements = payload.get("elements", []) or []

        schoolCount = _countAmenity(elements, "amenity", "school")
        hospitalCount = _countAmenity(elements, "amenity", "hospital")
        universityCount = _countAmenity(elements, "amenity", "university")
        officeCount = _countAmenity(elements, "office")
        parkCount = _countAmenity(elements, "leisure", "park")

        return {
            "school_poi_count_nearby": schoolCount,
            "hospital_poi_count_nearby": hospitalCount,
            "university_poi_count_nearby": universityCount,
            "office_poi_count_nearby": officeCount,
            "park_poi_count_nearby": parkCount,
            "poi_density_score": _buildPoiDensityScore(
                schoolCount,
                hospitalCount,
                universityCount,
                officeCount,
                parkCount,
            ),
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