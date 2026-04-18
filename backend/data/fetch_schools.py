from __future__ import annotations

from functools import lru_cache
from typing import Any

from config import (
    CHICAGO_SCHOOL_LOCATIONS_API,
    CHICAGO_SCHOOL_PROGRESS_API,
)
from utils import haversineMiles, safeFloat, safeGet


def _emptySchoolResponse() -> dict[str, Any]:
    return {
        "average_school_rating_nearby": None,
        "elementary_school_rating_avg": None,
        "high_school_rating_avg": None,
        "school_count_nearby": 0,
    }


def _normalizeRowKeys(row: dict[str, Any]) -> dict[str, Any]:
    return {str(key).lower(): value for key, value in row.items()}


def _findValue(row: dict[str, Any], candidates: list[str]) -> Any:
    lowerMap = _normalizeRowKeys(row)

    for candidate in candidates:
        if candidate.lower() in lowerMap:
            return lowerMap[candidate.lower()]

    return None


def _extractLatLng(row: dict[str, Any]) -> tuple[float | None, float | None]:
    lat = safeFloat(_findValue(row, ["school_latitude", "latitude", "lat"]))
    lng = safeFloat(
        _findValue(row, ["school_longitude", "longitude", "lng", "long", "lon"])
    )

    if lat is None or lng is None:
        location = _findValue(row, ["location", "geolocation", "the_geom"])
        if isinstance(location, dict):
            lat = lat or safeFloat(location.get("latitude"))
            lng = lng or safeFloat(location.get("longitude"))

            coords = location.get("coordinates")
            if isinstance(coords, list) and len(coords) >= 2:
                lng = lng or safeFloat(coords[0])
                lat = lat or safeFloat(coords[1])

    return lat, lng


def _extractSchoolType(row: dict[str, Any]) -> str:
    schoolType = _findValue(
        row,
        [
            "school_type",
            "primary_category",
            "grade_cat",
            "grades_offered_all",
        ],
    )

    text = str(schoolType).upper() if schoolType is not None else ""

    if "HS" in text or "HIGH" in text:
        return "high"
    if "ES" in text or "ELEMENTARY" in text:
        return "elementary"
    return "other"


def _parseRatingValue(row: dict[str, Any]) -> float | None:
    attainment = str(_findValue(row, ["student_attainment_rating"]) or "").strip().upper()
    culture = str(_findValue(row, ["culture_climate_rating"]) or "").strip().upper()
    creative = str(_findValue(row, ["creative_school_certification"]) or "").strip().upper()

    attainmentMap = {
        "FAR ABOVE EXPECTATIONS": 5.0,
        "ABOVE EXPECTATIONS": 4.5,
        "MET EXPECTATIONS": 4.0,
        "APPROACHING EXPECTATIONS": 3.0,
        "BELOW EXPECTATIONS": 2.0,
        "FAR BELOW EXPECTATIONS": 1.0,
        "NO DATA AVAILABLE": None,
    }

    cultureMap = {
        "WELL ORGANIZED": 4.5,
        "ORGANIZED": 4.0,
        "MODERATELY ORGANIZED": 3.0,
        "NOT YET ORGANIZED": 2.0,
    }

    creativeMap = {
        "EXCELLING": 5.0,
        "STRONG": 4.0,
        "DEVELOPING": 3.0,
        "EMERGING": 2.0,
        "INCOMPLETE": 1.0,
        "NOT ACHIEVED": 1.0,
    }

    scores: list[float] = []

    if attainment in attainmentMap and attainmentMap[attainment] is not None:
        scores.append(attainmentMap[attainment])

    if culture in cultureMap:
        scores.append(cultureMap[culture])

    if creative in creativeMap:
        scores.append(creativeMap[creative])

    if not scores:
        return None

    return round(sum(scores) / len(scores), 2)


@lru_cache(maxsize=1)
def _loadSchoolLocationRows() -> list[dict[str, Any]]:
    rows = safeGet(CHICAGO_SCHOOL_LOCATIONS_API, params={"$limit": 3000})
    if not isinstance(rows, list):
        print("[fetchSchools] School locations API returned non-list response")
        return []
    return rows


@lru_cache(maxsize=1)
def _loadProgressRatingsBySchoolId() -> dict[str, float]:
    rows = safeGet(CHICAGO_SCHOOL_PROGRESS_API, params={"$limit": 3000})
    if not isinstance(rows, list):
        print("[fetchSchools] School progress API returned non-list response")
        return {}

    ratings: dict[str, float] = {}

    for row in rows:
        schoolId = str(_findValue(row, ["school_id"]) or "").strip()
        if not schoolId:
            continue

        rating = _parseRatingValue(row)
        if rating is not None:
            ratings[schoolId] = rating

    return ratings


def _avg(values: list[float]) -> float | None:
    if not values:
        return None
    return round(sum(values) / len(values), 2)


def fetchSchools(
    plot: dict[str, Any],
    radiusMiles: float = 1.0,
) -> dict[str, Any]:
    """
    Fetch nearby school stats for a plot.

    Returns:
    {
        "average_school_rating_nearby": float | None,
        "elementary_school_rating_avg": float | None,
        "high_school_rating_avg": float | None,
        "school_count_nearby": int,
    }
    """
    lat = safeFloat(plot.get("lat"))
    lng = safeFloat(plot.get("lng"))

    empty = _emptySchoolResponse()

    if lat is None or lng is None:
        return empty

    try:
        locationRows = _loadSchoolLocationRows()
        progressRatings = _loadProgressRatingsBySchoolId()

        allRatings: list[float] = []
        elementaryRatings: list[float] = []
        highSchoolRatings: list[float] = []
        schoolCount = 0

        for row in locationRows:
            schoolLat, schoolLng = _extractLatLng(row)
            if schoolLat is None or schoolLng is None:
                continue

            distance = haversineMiles(lat, lng, schoolLat, schoolLng)
            if distance > radiusMiles:
                continue

            schoolCount += 1

            schoolId = str(_findValue(row, ["school_id"]) or "").strip()
            rating = progressRatings.get(schoolId)

            if rating is None:
                continue

            allRatings.append(rating)

            schoolType = _extractSchoolType(row)
            if schoolType == "elementary":
                elementaryRatings.append(rating)
            elif schoolType == "high":
                highSchoolRatings.append(rating)

        return {
            "average_school_rating_nearby": _avg(allRatings),
            "elementary_school_rating_avg": _avg(elementaryRatings),
            "high_school_rating_avg": _avg(highSchoolRatings),
            "school_count_nearby": schoolCount,
        }

    except Exception as exc:
        print(f"[fetchSchools] Failed for plot {plot.get('id')}: {exc}")
        return empty


if __name__ == "__main__":
    samplePlot = {
        "id": "test_plot",
        "lat": 41.8781,
        "lng": -87.6298,
    }
    result = fetchSchools(samplePlot)
    print(result)