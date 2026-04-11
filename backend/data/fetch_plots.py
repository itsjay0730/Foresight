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
from utils import safe_float, safe_get, safe_int, save_json


def _normalize_plot(raw: dict[str, Any], idx: int) -> dict[str, Any] | None:
    """
    Normalize one raw plot/property record into the base plot schema.
    This is intentionally defensive because Chicago open data fields can vary.
    """

    lat = (
        safe_float(raw.get("latitude"))
        or safe_float(raw.get("lat"))
        or safe_float(raw.get("y"))
    )
    lng = (
        safe_float(raw.get("longitude"))
        or safe_float(raw.get("lng"))
        or safe_float(raw.get("lon"))
        or safe_float(raw.get("x"))
    )

    if lat is None or lng is None:
        return None

    neighborhood = (
        raw.get("community_area_name")
        or raw.get("neighborhood")
        or raw.get("community")
        or "Unknown"
    )

    zip_code = (
        raw.get("zip")
        or raw.get("zip_code")
        or raw.get("postal_code")
        or "Unknown"
    )

    parcel_size = (
        safe_int(raw.get("sq_ft"))
        or safe_int(raw.get("square_feet"))
        or safe_int(raw.get("parcel_size"))
        or 0
    )

    property_type = (
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

    record_id = (
        raw.get("id")
        or raw.get("pin")
        or raw.get("parcel_id")
        or f"plot_{idx:03d}"
    )

    return {
        "id": str(record_id),
        "lat": lat,
        "lng": lng,
        "neighborhood": str(neighborhood),
        "zip": str(zip_code),
        "parcel_size": parcel_size,
        "property_type": str(property_type),
        "zoning": str(zoning),
    }


def fetch_plots(limit: int = PIPELINE_LIMIT) -> list[dict[str, Any]]:
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

    raw_records = safe_get(CHICAGO_PLOTS_API, params=params)

    plots: list[dict[str, Any]] = []
    for idx, raw in enumerate(raw_records, start=1):
        normalized = _normalize_plot(raw, idx)
        if normalized is not None:
            plots.append(normalized)

    save_json(plots, RAW_PLOTS_FILE)
    return plots


if __name__ == "__main__":
    plots = fetch_plots()
    print(f"Fetched {len(plots)} plots")
    if plots:
        print(plots[0])