# What this file does

# This file:
# 	•	pulls Chicago building permits
# 	•	checks permits near a plot
# 	•	compares recent 90 days vs previous 90 days
# 	•	returns a clean permit activity summarypython -m data.fetch_permits

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from config import CHICAGO_BUILDING_PERMITS_API, SEARCH_RADIUS_MILES
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


def _fetchPermitYear(
    year: int,
    limit: int = 5000,
) -> list[dict[str, Any]]:
    """
    Fetch permits for an entire year
    """
    start = f"{year}-01-01T00:00:00"
    end = f"{year + 1}-01-01T00:00:00"

    params = {
        "$select": "id,issue_date,latitude,longitude,permit_type,work_description",
        "$where": (
            f"issue_date >= '{start}' "
            f"AND issue_date < '{end}' "
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
    radiusMiles: float = SEARCH_RADIUS_MILES,
) -> dict[str, Any]:
    """
    Fetch nearby permit/development activity for a plot.

    Returns a consistent structure:
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
            "permit_history": [],
        }

    try:
        currentYear = datetime.now().year
        years = [
            currentYear - 4,
            currentYear - 3,
            currentYear - 2,
            currentYear - 1
        ]

        permitHistory = []

        recentPermits = _fetchPermitWindow(90, 0)
        previousPermits = _fetchPermitWindow(180, 90)

        for year in years:
            permits = _fetchPermitYear(year)
            count = _countNearbyPermits(
                permits, lat, lng, radiusMiles
            )

            permitHistory.append({
                "year": year,
                "permit_count": count
            })

        recentCount = _countNearbyPermits(recentPermits, lat, lng, radiusMiles)
        previousCount = _countNearbyPermits(previousPermits, lat, lng, radiusMiles)

        if previousCount == 0:
            permitActivity = 0.0 if recentCount == 0 else 1.0
        else:
            permitActivity = (recentCount - previousCount) / previousCount

        return {
            "permit_activity": round(permitActivity, 4),
            "permit_count_nearby": recentCount,
            "permit_history": permitHistory,
        }

    except Exception as exc:
        print(f"[fetchPermits] Failed for plot {plot.get('id')}: {exc}")
        return {
            "permit_activity": None,
            "permit_count_nearby": 0,
            "permit_history": [],
        }


if __name__ == "__main__":
    samplePlot = {
        "id": "test_plot",
        "lat": 41.8781,
        "lng": -87.6298,
    }
    result = fetchPermits(samplePlot)
    print(result)