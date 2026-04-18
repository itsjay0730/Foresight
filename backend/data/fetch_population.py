from __future__ import annotations

from functools import lru_cache
from typing import Any

import requests

from config import CENSUS_API_KEY, REQUEST_TIMEOUT


ACS_TOTAL_POP_VAR = "B01003_001E"
ACS_POP_2022_API = "https://api.census.gov/data/2022/acs/acs5"
ACS_POP_2021_API = "https://api.census.gov/data/2021/acs/acs5"


def _emptyPopulationResponse() -> dict[str, Any]:
    return {
        "population_growth": None,
        "population_history": [],
    }


def _normalizeZip(value: Any) -> str:
    if value is None:
        return ""

    zipCode = str(value).strip()
    if not zipCode or zipCode.lower() == "unknown":
        return ""

    if zipCode.endswith(".0"):
        zipCode = zipCode[:-2]

    return zipCode.zfill(5) if zipCode.isdigit() and len(zipCode) <= 5 else zipCode


@lru_cache(maxsize=256)
def _fetchPopulationByZip(apiUrl: str, zipCode: str) -> int | None:
    params = {
        "get": f"NAME,{ACS_TOTAL_POP_VAR}",
        "for": f"zip code tabulation area:{zipCode}",
    }

    if CENSUS_API_KEY:
        params["key"] = CENSUS_API_KEY

    response = requests.get(apiUrl, params=params, timeout=REQUEST_TIMEOUT)
    response.raise_for_status()

    try:
        data = response.json()
    except Exception:
        print(f"[fetchPopulation] Invalid JSON response for ZIP {zipCode}")
        return None

    if not isinstance(data, list) or len(data) < 2:
        return None

    row = data[1]
    if not isinstance(row, list) or len(row) < 2:
        return None

    value = row[1]
    if value in (None, "", "-666666666"):
        return None

    try:
        return int(value)
    except Exception:
        print(f"[fetchPopulation] Invalid population value '{value}' for ZIP {zipCode}")
        return None


def _buildPopulationHistory(pop2021: int | None, pop2022: int | None) -> list[dict[str, Any]]:
    return [
        {
            "year": 2021,
            "population": pop2021,
        },
        {
            "year": 2022,
            "population": pop2022,
        },
    ]


def _computeGrowth(current: int | None, prior: int | None) -> float | None:
    if current is None or prior is None:
        return None

    if prior == 0:
        return 0.0 if current == 0 else 1.0

    return round((current - prior) / prior, 4)


def fetchPopulation(plot: dict[str, Any]) -> dict[str, Any]:
    """
    Fetch population growth for a plot's ZIP area.

    Returns:
    {
        "population_growth": float | None,
        "population_history": list[dict[str, Any]]
    }

    population_growth = (pop2022 - pop2021) / pop2021
    """
    zipCode = _normalizeZip(plot.get("zip"))
    empty = _emptyPopulationResponse()

    if not zipCode:
        return empty

    try:
        pop2022 = _fetchPopulationByZip(ACS_POP_2022_API, zipCode)
        pop2021 = _fetchPopulationByZip(ACS_POP_2021_API, zipCode)

        populationHistory = _buildPopulationHistory(pop2021, pop2022)

        return {
            "population_growth": _computeGrowth(pop2022, pop2021),
            "population_history": populationHistory,
        }

    except Exception as exc:
        print(f"[fetchPopulation] Census API failed for ZIP {zipCode}: {exc}")
        return {
            "population_growth": None,
            "population_history": [],
        }


if __name__ == "__main__":
    samplePlot = {
        "id": "test_plot",
        "zip": "60647",
    }
    result = fetchPopulation(samplePlot)
    print(result)