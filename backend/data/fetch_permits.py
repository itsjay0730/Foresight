from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from config import CHICAGO_BUILDING_PERMITS_API, SEARCH_RADIUS_MILES
from utils import haversine_miles, safe_float, safe_get


def _fetch_permit_window(
    days_back_start: int,
    days_back_end: int,
    limit: int = 2000,
) -> list[dict[str, Any]]:
    """
    Fetch permit records in a time window.
    Example:
    days_back_start=90, days_back_end=0 -> last 90 days
    days_back_start=180, days_back_end=90 -> previous 90-day period
    """
    now = datetime.now(timezone.utc)
    start_dt = now - timedelta(days=days_back_start)
    end_dt = now - timedelta(days=days_back_end)

    params = {
        "$select": "id,issue_date,latitude,longitude,permit_type,work_description",
        "$where": (
            f"issue_date >= '{start_dt.strftime('%Y-%m-%dT%H:%M:%S')}' "
            f"AND issue_date < '{end_dt.strftime('%Y-%m-%dT%H:%M:%S')}' "
            f"AND latitude IS NOT NULL "
            f"AND longitude IS NOT NULL"
        ),
        "$limit": limit,
    }

    return safe_get(CHICAGO_BUILDING_PERMITS_API, params=params)


def _count_nearby_permits(
    permits: list[dict[str, Any]],
    lat: float,
    lng: float,
    radius_miles: float,
) -> int:
    count = 0

    for permit in permits:
        permit_lat = safe_float(permit.get("latitude"))
        permit_lng = safe_float(permit.get("longitude"))
        if permit_lat is None or permit_lng is None:
            continue

        distance = haversine_miles(lat, lng, permit_lat, permit_lng)
        if distance <= radius_miles:
            count += 1

    return count


def fetch_permits(plot: dict[str, Any], radius_miles: float = SEARCH_RADIUS_MILES) -> dict[str, Any]:
    """
    Fetch nearby permit/development activity for a plot.

    Returns a consistent structure:
    {
        "permit_activity": float | None,
        "permit_count_nearby": int
    }
    """
    lat = safe_float(plot.get("lat"))
    lng = safe_float(plot.get("lng"))

    if lat is None or lng is None:
        return {
            "permit_activity": None,
            "permit_count_nearby": 0,
        }

    try:
        recent_permits = _fetch_permit_window(90, 0)
        previous_permits = _fetch_permit_window(180, 90)

        recent_count = _count_nearby_permits(recent_permits, lat, lng, radius_miles)
        previous_count = _count_nearby_permits(previous_permits, lat, lng, radius_miles)

        if previous_count == 0:
            permit_activity = 0.0 if recent_count == 0 else 1.0
        else:
            permit_activity = (recent_count - previous_count) / previous_count

        return {
            "permit_activity": round(permit_activity, 4),
            "permit_count_nearby": recent_count,
        }

    except Exception as exc:
        print(f"[fetch_permits] Failed for plot {plot.get('id')}: {exc}")
        return {
            "permit_activity": None,
            "permit_count_nearby": 0,
        }


if __name__ == "__main__":
    sample_plot = {
        "id": "test_plot",
        "lat": 41.8781,
        "lng": -87.6298,
    }
    result = fetch_permits(sample_plot)
    print(result)