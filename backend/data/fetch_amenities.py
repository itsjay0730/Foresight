
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
      node[\"amenity\"=\"cafe\"](around:{radiusMeters},{lat},{lng});
      way[\"amenity\"=\"cafe\"](around:{radiusMeters},{lat},{lng});
      relation[\"amenity\"=\"cafe\"](around:{radiusMeters},{lat},{lng});

      node[\"amenity\"=\"restaurant\"](around:{radiusMeters},{lat},{lng});
      way[\"amenity\"=\"restaurant\"](around:{radiusMeters},{lat},{lng});
      relation[\"amenity\"=\"restaurant\"](around:{radiusMeters},{lat},{lng});

      node[\"shop\"=\"supermarket\"](around:{radiusMeters},{lat},{lng});
      way[\"shop\"=\"supermarket\"](around:{radiusMeters},{lat},{lng});
      relation[\"shop\"=\"supermarket\"](around:{radiusMeters},{lat},{lng});

      node[\"leisure\"=\"park\"](around:{radiusMeters},{lat},{lng});
      way[\"leisure\"=\"park\"](around:{radiusMeters},{lat},{lng});
      relation[\"leisure\"=\"park\"](around:{radiusMeters},{lat},{lng});

      node[\"amenity\"=\"hospital\"](around:{radiusMeters},{lat},{lng});
      way[\"amenity\"=\"hospital\"](around:{radiusMeters},{lat},{lng});
      relation[\"amenity\"=\"hospital\"](around:{radiusMeters},{lat},{lng});
    );
    out tags center;
    """


def _countAmenity(elements: list[dict[str, Any]], key: str, value: str) -> int:
    count = 0
    seen = set()

    for element in elements:
        tags = element.get("tags", {}) or {}
        if tags.get(key) != value:
            continue

        elementType = element.get("type")
        elementId = element.get("id")
        uniqueKey = (elementType, elementId)

        if uniqueKey in seen:
            continue

        seen.add(uniqueKey)
        count += 1

    return count


def _buildAmenityDensityScore(
    coffee: int,
    restaurants: int,
    grocery: int,
    parks: int,
    hospitals: int,
) -> float:
    raw = (
        coffee * 1.0
        + restaurants * 0.8
        + grocery * 1.5
        + parks * 1.2
        + hospitals * 1.0
    )
    return round(min(raw / 20.0, 1.0), 4)


def fetchAmenities(plot: dict[str, Any]) -> dict[str, Any]:
    empty = {
        "coffee_shop_count_nearby": 0,
        "restaurant_count_nearby": 0,
        "grocery_count_nearby": 0,
        "park_count_nearby": 0,
        "hospital_count_nearby": 0,
        "amenity_density_score": 0.0,
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

        coffeeCount = _countAmenity(elements, "amenity", "cafe")
        restaurantCount = _countAmenity(elements, "amenity", "restaurant")
        groceryCount = _countAmenity(elements, "shop", "supermarket")
        parkCount = _countAmenity(elements, "leisure", "park")
        hospitalCount = _countAmenity(elements, "amenity", "hospital")

        return {
            "coffee_shop_count_nearby": coffeeCount,
            "restaurant_count_nearby": restaurantCount,
            "grocery_count_nearby": groceryCount,
            "park_count_nearby": parkCount,
            "hospital_count_nearby": hospitalCount,
            "amenity_density_score": _buildAmenityDensityScore(
                coffeeCount,
                restaurantCount,
                groceryCount,
                parkCount,
                hospitalCount,
            ),
        }

    except Exception as exc:
        print(f"[fetchAmenities] Failed for plot {plot.get('id')}: {exc}")
        return empty


if __name__ == "__main__":
    samplePlot = {
        "id": "test_plot",
        "lat": 41.8994,
        "lng": -87.6272,
    }
    result = fetchAmenities(samplePlot)
    print(result)