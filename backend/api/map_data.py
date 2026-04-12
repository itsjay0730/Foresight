from __future__ import annotations

from fastapi import APIRouter

from utils import loadJson


router = APIRouter()


@router.get("/map-data")
def getMapData():
    mapData = loadJson("output/final_plots.json")
    return {
        "count": len(mapData) if mapData else 0,
        "results": mapData or [],
    }