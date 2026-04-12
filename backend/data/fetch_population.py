# What this file does

# This file:
# 	•	reads the plot ZIP code
# 	•	fetches total population from ACS for 2022 and 2021
# 	•	computes a simple population growth value:

from __future__ import annotations

from typing import Any
from datetime import datetime

import requests

from config import CENSUS_API_KEY, REQUEST_TIMEOUT


# Total population
ACS_TOTAL_POP_VAR = "B01003_001E"


def _buildPopulationApi(year: int) -> str:
    return f"https://api.census.gov/data/{year}/acs/acs5"


def _fetchPopulationByZip(apiUrl: str, zipCode: str) -> int | None:
    params = {
        "get": f"NAME,{ACS_TOTAL_POP_VAR}",
        "for": f"zip code tabulation area:{zipCode}",
    }

    if CENSUS_API_KEY:
        params["key"] = CENSUS_API_KEY

    response = requests.get(apiUrl, params=params, timeout=REQUEST_TIMEOUT)
    response.raise_for_status()
    data = response.json()

    # Expected format:
    # [
    #   ["NAME", "B01003_001E", "zip code tabulation area"],
    #   ["ZCTA5 60647", "87500", "60647"]
    # ]
    if len(data) < 2:
        return None

    value = data[1][1]
    if value in (None, "", "-666666666"):
        return None

    return int(value)


def fetchPopulation(plot: dict[str, Any]) -> dict[str, Any]:
    """
    Fetch population growth for a plot's ZIP area.

    Returns a consistent structure:
    {
        "population_growth": float | None
    }

    population_growth = (pop2022 - pop2021) / pop2021
    """
    zipCode = str(plot.get("zip", "")).strip()

    if not zipCode or zipCode == "Unknown":
        return {
            "population_growth": None,
            "population_history": []
        }

    try:
        # Census data typically lags by ~1 year
        currentYear = datetime.now().year - 1
        years = [
            currentYear - 3,
            currentYear - 2,
            currentYear - 1,
            currentYear
        ]

        populationHistory = []

        for year in years:
            api = _buildPopulationApi(year)
            population = _fetchPopulationByZip(api, zipCode)

            populationHistory.append({
                "year": year,
                "population": population
            })

        validYears = [p for p in populationHistory if p["population"] is not None]

        if len(validYears) < 2:
            return {
                "population_growth": None,
                "population_history": populationHistory
            }

        first = validYears[0]["population"]
        last = validYears[-1]["population"]

        if first == 0:
            growth = 0.0 if last == 0 else 1.0
        else:
            growth = (last - first) / first

        return {
            "population_growth": round(growth, 4),
            "population_history": populationHistory
        }

    except Exception as exc:
        print(f"[fetchPopulation] Census API failed for ZIP {zipCode}: {exc}")
        return {
            "population_growth": None,
            "population_history": []
        }


if __name__ == "__main__":
    samplePlot = {
        "id": "test_plot",
        "zip": "60647",
    }
    result = fetchPopulation(samplePlot)
    print(result)