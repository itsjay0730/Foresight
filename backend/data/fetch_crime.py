from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from config import CHICAGO_CRIME_API, SEARCH_RADIUS_MILES
from utils import haversine_miles, safe_float, safe_get


def _fetch_crime_window(
    lat: float,
    lng: float,
    days_back_start: int,
    days_back_end: int,
    limit: int = 2000,
) -> list[dict[str, Any]]:
    """
    Fetch crime records in a recent time window.
    Example:
    days_back_start=30, days_back_end=0 -> last 30 days
    days_back_start=60, days_back_end=30 -> previous 30-day period
    """
    now = datetime.now(timezone.utc)
    start_dt = now - timedelta(days=days_back_start)
    end_dt = now - timedelta(days=days_back_end)

    params = {
        "$select": "id,date,latitude,longitude,primary_type",
        "$where": (
            f"date >= '{start_dt.strftime('%Y-%m-%dT%H:%M:%S')}' "
            f"AND date < '{end_dt.strftime('%Y-%m-%dT%H:%M:%S')}' "
            f"AND latitude IS NOT NULL "
            f"AND longitude IS NOT NULL"
        ),
        "$limit": limit,
    }

    return safe_get(CHICAGO_CRIME_API, params=params)


def _count_nearby_crimes(
    crimes: list[dict[str, Any]],
    lat: float,
    lng: float,
    radius_miles: float,
) -> tuple[int, int]:
    """
    Returns:
    - nearby total crime count
    - nearby violent crime count
    """
    violent_types = {
        "HOMICIDE",
        "ROBBERY",
        "BATTERY",
        "ASSAULT",
        "CRIM SEXUAL ASSAULT",
        "KIDNAPPING",
    }

    total_count = 0
    violent_count = 0

    for crime in crimes:
        crime_lat = safe_float(crime.get("latitude"))
        crime_lng = safe_float(crime.get("longitude"))
        if crime_lat is None or crime_lng is None:
            continue

        distance = haversine_miles(lat, lng, crime_lat, crime_lng)
        if distance <= radius_miles:
            total_count += 1
            if str(crime.get("primary_type", "")).upper() in violent_types:
                violent_count += 1

    return total_count, violent_count


def fetch_crime(plot: dict[str, Any], radius_miles: float = SEARCH_RADIUS_MILES) -> dict[str, Any]:
    """
    Fetch nearby crime metrics for a plot.

    Returns a consistent structure:
    {
        "crime_trend": float | None,
        "crime_count_nearby": int,
        "violent_crime_count_nearby": int
    }
    """
    lat = safe_float(plot.get("lat"))
    lng = safe_float(plot.get("lng"))

    if lat is None or lng is None:
        return {
            "crime_trend": None,
            "crime_count_nearby": 0,
            "violent_crime_count_nearby": 0,
        }

    try:
        recent_crimes = _fetch_crime_window(lat, lng, 30, 0)
        previous_crimes = _fetch_crime_window(lat, lng, 60, 30)

        recent_count, recent_violent = _count_nearby_crimes(
            recent_crimes, lat, lng, radius_miles
        )
        previous_count, _ = _count_nearby_crimes(
            previous_crimes, lat, lng, radius_miles
        )

        if previous_count == 0:
            crime_trend = 0.0 if recent_count == 0 else 1.0
        else:
            crime_trend = (recent_count - previous_count) / previous_count

        return {
            "crime_trend": round(crime_trend, 4),
            "crime_count_nearby": recent_count,
            "violent_crime_count_nearby": recent_violent,
        }

    except Exception as exc:
        print(f"[fetch_crime] Failed for plot {plot.get('id')}: {exc}")
        return {
            "crime_trend": None,
            "crime_count_nearby": 0,
            "violent_crime_count_nearby": 0,
        }


if __name__ == "__main__":
    sample_plot = {
        "id": "test_plot",
        "lat": 41.8781,
        "lng": -87.6298,
    }
    result = fetch_crime(sample_plot)
    print(result)