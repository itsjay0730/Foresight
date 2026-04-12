# What this file does

# This is your base dataset loader.

# It:
# 	•	pulls raw Chicago records
# 	•	extracts only the core fields you need
# 	•	converts them into one consistent format
# 	•	saves them to output/raw_plots.json


from __future__ import annotations

from typing import Any

from config import CHICAGO_PLOTS_API, PIPELINE_LIMIT, RAW_PLOTS_FILE
from utils import safeFloat, safeGet, safeInt, saveJson


def _normalizePlot(raw: dict[str, Any], idx: int) -> dict[str, Any] | None:
    """
    Normalize one raw plot/property record into the base plot schema.
    This is intentionally defensive because Chicago open data fields can vary.
    """

    lat = (
        safeFloat(raw.get("latitude"))
        or safeFloat(raw.get("lat"))
        or safeFloat(raw.get("y"))
    )
    lng = (
        safeFloat(raw.get("longitude"))
        or safeFloat(raw.get("lng"))
        or safeFloat(raw.get("lon"))
        or safeFloat(raw.get("x"))
    )

    if lat is None or lng is None:
        return None

    neighborhood = (
        raw.get("community_area_name")
        or raw.get("neighborhood")
        or raw.get("community")
        or "Unknown"
    )

    zipCode = (
        raw.get("zip")
        or raw.get("zip_code")
        or raw.get("postal_code")
        or "Unknown"
    )

    parcelSize = (
        safeInt(raw.get("sq_ft"))
        or safeInt(raw.get("square_feet"))
        or safeInt(raw.get("parcel_size"))
        or 0
    )

    propertyType = (
        raw.get("property_type")
        or raw.get("building_type")
        or raw.get("land_use")
        or raw.get("status")
        or "opportunity_site"
    )

    zoning = (
        raw.get("zoning")
        or raw.get("zoning_classification")
        or raw.get("zone")
        or "unknown"
    )

    recordId = (
        raw.get("id")
        or raw.get("pin")
        or raw.get("parcel_id")
        or f"plot_{idx:03d}"
    )

    return {
        "id": str(recordId),
        "lat": lat,
        "lng": lng,
        "neighborhood": str(neighborhood),
        "zip": str(zipCode),
        "parcel_size": parcelSize,
        "property_type": str(propertyType),
        "zoning": str(zoning),
    }


def fetchPlots(limit: int = PIPELINE_LIMIT) -> list[dict[str, Any]]:
    """
    Fetch base opportunity plots/sites for Chicago.

    For MVP this function is flexible:
    - it pulls from one Chicago dataset
    - normalizes the results
    - returns 20–50 usable opportunity records
    """

    params = {
        "$limit": limit,
    }

    rawRecords = safeGet(CHICAGO_PLOTS_API, params=params)

    plots: list[dict[str, Any]] = []
    for idx, raw in enumerate(rawRecords, start=1):
        normalized = _normalizePlot(raw, idx)
        if normalized is not None:
            plots.append(normalized)

    saveJson(plots, RAW_PLOTS_FILE)
    return plots


if __name__ == "__main__":
    plots = fetchPlots()
    print(f"Fetched {len(plots)} plots")
    if plots:
        print(plots[0])