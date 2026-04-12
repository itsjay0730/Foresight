from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from config import CHICAGO_BUILDING_PERMITS_API, SEARCH_RADIUS_CRIME_MILES
from utils import haversineMiles, safeFloat, safeGet


def _fetchPermitWindow(
    daysBackStart: int,
    daysBackEnd: int,
    limit: int = 2000,
) -> list[dict[str, Any]]:
    """
    Fetch permit records in a time window.
    Example:
    daysBackStart=90, daysBackEnd=0 -> last 90 days
    daysBackStart=180, daysBackEnd=90 -> previous 90-day period
    """
    now = datetime.now(timezone.utc)
    startDt = now - timedelta(days=daysBackStart)
    endDt = now - timedelta(days=daysBackEnd)

    params = {
        "$select": "id,issue_date,latitude,longitude,permit_type,work_description",
        "$where": (
            f"issue_date >= '{startDt.strftime('%Y-%m-%dT%H:%M:%S')}' "
            f"AND issue_date < '{endDt.strftime('%Y-%m-%dT%H:%M:%S')}' "
            f"AND latitude IS NOT NULL "
            f"AND longitude IS NOT NULL"
        ),
        "$limit": limit,
    }

    return safeGet(CHICAGO_BUILDING_PERMITS_API, params=params)


def _countNearbyPermits(
    permits: list[dict[str, Any]],
    lat: float,
    lng: float,
    radiusMiles: float,
) -> int:
    count = 0

    for permit in permits:
        permitLat = safeFloat(permit.get("latitude"))
        permitLng = safeFloat(permit.get("longitude"))
        if permitLat is None or permitLng is None:
            continue

        distance = haversineMiles(lat, lng, permitLat, permitLng)
        if distance <= radiusMiles:
            count += 1

    return count


def fetchPermits(
    plot: dict[str, Any],
    radiusMiles: float = SEARCH_RADIUS_CRIME_MILES,
) -> dict[str, Any]:
    """
    Fetch nearby permit/development activity for a plot.

    Returns:
    {
        "permit_activity": float | None,
        "permit_count_nearby": int
    }
    """
    lat = safeFloat(plot.get("lat"))
    lng = safeFloat(plot.get("lng"))

    if lat is None or lng is None:
        return {
            "permit_activity": None,
            "permit_count_nearby": 0,
        }

    try:
        recentPermits = _fetchPermitWindow(90, 0)
        previousPermits = _fetchPermitWindow(180, 90)

        recentCount = _countNearbyPermits(recentPermits, lat, lng, radiusMiles)
        previousCount = _countNearbyPermits(previousPermits, lat, lng, radiusMiles)

        if previousCount == 0:
            permitActivity = 0.0 if recentCount == 0 else 1.0
        else:
            permitActivity = (recentCount - previousCount) / previousCount

        return {
            "permit_activity": round(permitActivity, 4),
            "permit_count_nearby": recentCount,
        }

    except Exception as exc:
        print(f"[fetchPermits] Failed for plot {plot.get('id')}: {exc}")
        return {
            "permit_activity": None,
            "permit_count_nearby": 0,
        }


if __name__ == "__main__":
    samplePlot = {
        "id": "test_plot",
        "lat": 41.8781,
        "lng": -87.6298,
    }
    result = fetchPermits(samplePlot)
    print(result)