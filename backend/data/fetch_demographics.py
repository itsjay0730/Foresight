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

    normalized = str(value).strip().upper()
    normalized = " ".join(normalized.split())
    return NEIGHBORHOOD_ALIASES.get(normalized, normalized)


def _findCommunityRow(neighborhoodName: str) -> dict[str, Any] | None:
    response = safeGet(CHICAGO_ACS_COMMUNITY_AREA_API, params={"$limit": 200})

    if not response:
        print("[fetchDemographics] API returned empty or None")
        return None

    targetName = _normalizeName(neighborhoodName)

    for row in response:
        communityName = _normalizeName(row.get("community_area_name"))
        if communityName == targetName:
            return row

    availableNames = [
        _normalizeName(item.get("community_area_name", ""))
        for item in response
    ]
    print(
        f"[fetchDemographics] No match for '{targetName}'. Available: {availableNames[:10]}..."
    )
    return None


def _normalizePct(value: float | None) -> float | None:
    if value is None:
        return None

    if value > 1:
        return round(value / 100, 4)

    return value


def fetchDemographics(plot: dict[str, Any]) -> dict[str, Any]:
    defaultResponse = {
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
        return defaultResponse

    try:
        matchedRow = _findCommunityRow(str(neighborhoodName))
        if matchedRow is None:
            return defaultResponse

        demographics = {
            "current_population": None,
            "population_growth_1y": None,
            "population_growth_3y": None,
            "median_age": None,
            "pct_age_18_24": None,
            "pct_age_25_34": None,
            "pct_age_35_54": None,
            "pct_age_55_plus": _normalizePct(
                safeFloat(matchedRow.get("percent_aged_under_18_or_over_64"))
            ),
            "median_household_income": None,
            "per_capita_income": safeInt(matchedRow.get("per_capita_income_")),
            "household_income_growth_1y": None,
            "renter_pct": None,
            "owner_pct": None,
            "unemployment_rate": _normalizePct(
                safeFloat(matchedRow.get("percent_aged_16_unemployed"))
            ),
            "hardship_index": safeInt(matchedRow.get("hardship_index")),
            "poverty_rate": _normalizePct(
                safeFloat(matchedRow.get("percent_households_below_poverty"))
            ),
        }

        return demographics

    except Exception as exc:
        print(f"[fetchDemographics] Failed for neighborhood {neighborhoodName}: {exc}")
        return defaultResponse


if __name__ == "__main__":
    samplePlot = {
        "id": "test_plot",
        "neighborhood": "Englewood",
    }
    result = fetchDemographics(samplePlot)
    print(result)