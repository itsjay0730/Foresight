from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import requests

from config import REQUEST_TIMEOUT, SOCRATA_APP_TOKEN


def get_headers() -> dict[str, str]:
    headers: dict[str, str] = {}
    if SOCRATA_APP_TOKEN:
        headers["X-App-Token"] = SOCRATA_APP_TOKEN
    return headers


def safe_get(url: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    """
    Simple wrapper for GET requests that returns JSON list data.
    If the request fails, return an empty list instead of crashing.
    """
    try:
        response = requests.get(
            url,
            params=params,
            headers=get_headers(),
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
        print(f"[safe_get] Request failed: {exc}")
        return []
    except ValueError as exc:
        print(f"[safe_get] Invalid JSON response: {exc}")
        return []


def safe_float(value: Any, default: float | None = None) -> float | None:
    try:
        if value is None or value == "":
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def safe_int(value: Any, default: int | None = None) -> int | None:
    try:
        if value is None or value == "":
            return default
        return int(float(value))
    except (TypeError, ValueError):
        return default


def haversine_miles(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Distance between two lat/lng points in miles.
    """
    r = 3958.8  # Earth radius in miles

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


def save_json(data: Any, filepath: str | Path) -> None:
    path = Path(filepath)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def load_json(filepath: str | Path) -> Any:
    path = Path(filepath)
    if not path.exists():
        return None
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def ensure_required_fields(record: dict[str, Any], required_fields: list[str]) -> bool:
    for field in required_fields:
        if field not in record or record[field] in (None, ""):
            return False
    return True