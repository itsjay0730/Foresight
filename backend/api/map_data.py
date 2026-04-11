from __future__ import annotations

from fastapi import APIRouter

from utils import load_json


router = APIRouter()


@router.get("/map-data")
def get_map_data():
    data = load_json("output/final_plots.json")
    return {
        "count": len(data) if data else 0,
        "results": data or [],
    }