from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import requests

from config import REQUEST_TIMEOUT, SOCRATA_APP_TOKEN


def getHeaders() -> dict[str, str]:
    headers: dict[str, str] = {}
    if SOCRATA_APP_TOKEN:
        headers["X-App-Token"] = SOCRATA_APP_TOKEN
    return headers


def safeGet(url: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    """
    Simple wrapper for GET requests that returns JSON list data.
    If the request fails, return an empty list instead of crashing.
    """
    try:
        response = requests.get(
            url,
            params=params,
            headers=getHeaders(),
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()

        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            return [data]
        return []
    except requests.RequestException as exc:
        print(f"[safeGet] Request failed: {exc}")
        return []
    except ValueError as exc:
        print(f"[safeGet] Invalid JSON response: {exc}")
        return []


def safeFloat(value: Any, default: float | None = None) -> float | None:
    try:
        if value is None or value == "":
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def safeInt(value: Any, default: int | None = None) -> int | None:
    try:
        if value is None or value == "":
            return default
        return int(float(value))
    except (TypeError, ValueError):
        return default


def haversineMiles(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Distance between two lat/lng points in miles.
    """
    r = 3958.8  # Earth radius in miles

    lat1Rad = math.radians(lat1)
    lat2Rad = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1Rad) * math.cos(lat2Rad) * math.sin(dlng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


def saveJson(data: Any, filepath: str | Path) -> None:
    filePath = Path(filepath)
    filePath.parent.mkdir(parents=True, exist_ok=True)
    with filePath.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def loadJson(filepath: str | Path) -> Any:
    filePath = Path(filepath)
    if not filePath.exists():
        return None
    with filePath.open("r", encoding="utf-8") as f:
        return json.load(f)


def ensureRequiredFields(record: dict[str, Any], requiredFields: list[str]) -> bool:
    for field in requiredFields:
        if field not in record or record[field] in (None, ""):
            return False
    return True