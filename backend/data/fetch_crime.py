from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from config import CHICAGO_CRIME_API, SEARCH_RADIUS_CRIME_MILES
from utils import haversineMiles, safeFloat, safeGet


def _fetchCrimeWindow(
    lat: float,
    lng: float,
    daysBackStart: int,
    daysBackEnd: int,
    limit: int = 2000,
) -> list[dict[str, Any]]:
    """
    Fetch crime records in a recent time window.
    Example:
    daysBackStart=30, daysBackEnd=0 -> last 30 days
    daysBackStart=60, daysBackEnd=30 -> previous 30-day period
    """
    now = datetime.now(timezone.utc)
    startDt = now - timedelta(days=daysBackStart)
    endDt = now - timedelta(days=daysBackEnd)

    params = {
        "$select": "id,date,latitude,longitude,primary_type",
        "$where": (
            f"date >= '{startDt.strftime('%Y-%m-%dT%H:%M:%S')}' "
            f"AND date < '{endDt.strftime('%Y-%m-%dT%H:%M:%S')}' "
            f"AND latitude IS NOT NULL "
            f"AND longitude IS NOT NULL"
        ),
        "$limit": limit,
    }

    return safeGet(CHICAGO_CRIME_API, params=params)


def _countNearbyCrimes(
    crimes: list[dict[str, Any]],
    lat: float,
    lng: float,
    radiusMiles: float,
) -> tuple[int, int]:
    """
    Returns:
    - nearby total crime count
    - nearby violent crime count
    """
    violentTypes = {
        "HOMICIDE",
        "ROBBERY",
        "BATTERY",
        "ASSAULT",
        "CRIM SEXUAL ASSAULT",
        "KIDNAPPING",
    }

    totalCount = 0
    violentCount = 0

    for crime in crimes:
        crimeLat = safeFloat(crime.get("latitude"))
        crimeLng = safeFloat(crime.get("longitude"))
        if crimeLat is None or crimeLng is None:
            continue

        distance = haversineMiles(lat, lng, crimeLat, crimeLng)
        if distance <= radiusMiles:
            totalCount += 1
            if str(crime.get("primary_type", "")).upper() in violentTypes:
                violentCount += 1

    return totalCount, violentCount


def fetchCrime(
    plot: dict[str, Any],
    radiusMiles: float = SEARCH_RADIUS_CRIME_MILES,
) -> dict[str, Any]:
    """
    Fetch nearby crime metrics for a plot.

    Returns a consistent structure:
    {
        "crime_trend": float | None,
        "crime_count_nearby": int,
        "violent_crime_count_nearby": int
    }
    """
    lat = safeFloat(plot.get("lat"))
    lng = safeFloat(plot.get("lng"))

    if lat is None or lng is None:
        return {
            "crime_trend": None,
            "crime_count_nearby": 0,
            "violent_crime_count_nearby": 0,
        }

    try:
        recentCrimes = _fetchCrimeWindow(lat, lng, 30, 0)
        previousCrimes = _fetchCrimeWindow(lat, lng, 60, 30)

        recentCount, recentViolent = _countNearbyCrimes(
            recentCrimes, lat, lng, radiusMiles
        )
        previousCount, _ = _countNearbyCrimes(
            previousCrimes, lat, lng, radiusMiles
        )

        if previousCount == 0:
            crimeTrend = 0.0 if recentCount == 0 else 1.0
        else:
            crimeTrend = (recentCount - previousCount) / previousCount

        return {
            "crime_trend": round(crimeTrend, 4),
            "crime_count_nearby": recentCount,
            "violent_crime_count_nearby": recentViolent,
        }

    except Exception as exc:
        print(f"[fetchCrime] Failed for plot {plot.get('id')}: {exc}")
        return {
            "crime_trend": None,
            "crime_count_nearby": 0,
            "violent_crime_count_nearby": 0,
        }


if __name__ == "__main__":
    samplePlot = {
        "id": "test_plot",
        "lat": 41.8781,
        "lng": -87.6298,
    }
    result = fetchCrime(samplePlot)
    print(result)