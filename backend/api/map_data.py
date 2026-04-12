from __future__ import annotations

from fastapi import APIRouter, Query

from utils import loadJson


router = APIRouter()


def _load_first_existing_json(paths: list[str]) -> list[dict]:
    for path in paths:
        try:
            data = loadJson(path)
            if isinstance(data, list):
                return data
        except Exception:
            continue
    return []


@router.get("/map-data")
def getMapData(mode: str = Query(default="investment")):
    normalized_mode = (mode or "investment").strip().lower()

    investment_paths = [
        "output/predicted_plots.json",
        "output/final_plots.json",
    ]

    housing_paths = [
        "output/predicted_housing_plots.json",
        "output/final_housing_plots.json",
        "output/housing_plots.json",
        "output/housing_map_data.json",
    ]

    if normalized_mode == "housing":
        mapData = _load_first_existing_json(housing_paths)
    else:
        normalized_mode = "investment"
        mapData = _load_first_existing_json(investment_paths)

    return {
        "mode": normalized_mode,
        "count": len(mapData),
        "results": mapData,
    }