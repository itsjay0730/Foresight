from __future__ import annotations

from typing import Any

from config import CHICAGO_ACS_COMMUNITY_AREA_API
from utils import safeFloat, safeGet, safeInt


NEIGHBORHOOD_ALIASES = {
    "NORTH CHICAGO": "NEAR NORTH SIDE",
    "LAKEVIEW": "LAKE VIEW",
    "LAKE": "LAKE VIEW",
    "RIVER NORTH": "NEAR NORTH SIDE",
    "WEST LOOP": "NEAR WEST SIDE",
    "SOUTH LOOP": "LOOP",
    "OLD TOWN": "NEAR NORTH SIDE",
}
def _normalizeName(value: Any) -> str:
    if value is None:
        return ""

    name = str(value).strip().upper()
    name = " ".join(name.split())

    return NEIGHBORHOOD_ALIASES.get(name, name)


def _findCommunityRow(neighborhoodName: str) -> dict[str, Any] | None:
    rows = safeGet(CHICAGO_ACS_COMMUNITY_AREA_API, params={"$limit": 200})

    if not rows:
        print("[fetchDemographics] API returned empty or None")
        return None

    target = _normalizeName(neighborhoodName)

    for row in rows:
        rowName = _normalizeName(row.get("community_area_name"))
        if rowName == target:
            return row

    available = [_normalizeName(r.get("community_area_name", "")) for r in rows]
    print(f"[fetchDemographics] No match for '{target}'. Available: {available[:10]}...")
    return None


def _normalizePct(value: float | None) -> float | None:
    if value is None:
        return None
    return round(value / 100, 4) if value > 1 else value


def fetchDemographics(plot: dict[str, Any]) -> dict[str, Any]:
    empty = {
        "current_population": None,
        "population_growth_1y": None,
        "population_growth_3y": None,
        "median_age": None,
        "pct_age_18_24": None,
        "pct_age_25_34": None,
        "pct_age_35_54": None,
        "pct_age_55_plus": None,
        "median_household_income": None,
        "per_capita_income": None,
        "household_income_growth_1y": None,
        "renter_pct": None,
        "owner_pct": None,
        "unemployment_rate": None,
        "hardship_index": None,
        "poverty_rate": None,
    }

    neighborhoodName = plot.get("neighborhood")
    if not neighborhoodName or _normalizeName(neighborhoodName) == "UNKNOWN":
        return empty

    try:
        row = _findCommunityRow(str(neighborhoodName))
        if row is None:
            return empty

        return {
            "current_population": None,
            "population_growth_1y": None,
            "population_growth_3y": None,
            "median_age": None,
            "pct_age_18_24": None,
            "pct_age_25_34": None,
            "pct_age_35_54": None,
            "pct_age_55_plus": _normalizePct(
                safeFloat(row.get("percent_aged_under_18_or_over_64"))
            ),
            "median_household_income": None,
            "per_capita_income": safeInt(row.get("per_capita_income_")),
            "household_income_growth_1y": None,
            "renter_pct": None,
            "owner_pct": None,
            "unemployment_rate": _normalizePct(
                safeFloat(row.get("percent_aged_16_unemployed"))
            ),
            "hardship_index": safeInt(row.get("hardship_index")),
            "poverty_rate": _normalizePct(
                safeFloat(row.get("percent_households_below_poverty"))
            ),
        }

    except Exception as exc:
        print(f"[fetchDemographics] Failed for neighborhood {neighborhoodName}: {exc}")
        return empty


if __name__ == "__main__":
    samplePlot = {"id": "test_plot", "neighborhood": "Englewood"}
    result = fetchDemographics(samplePlot)
    print(result)