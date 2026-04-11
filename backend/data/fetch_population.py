# What this file does

# This file:
# 	•	reads the plot ZIP code
# 	•	fetches total population from ACS for 2022 and 2021
# 	•	computes a simple population growth value:

from __future__ import annotations

from typing import Any

import requests

from config import CENSUS_API_KEY, REQUEST_TIMEOUT


ACS_POP_2022_API = "https://api.census.gov/data/2022/acs/acs5"
ACS_POP_2021_API = "https://api.census.gov/data/2021/acs/acs5"

# Total population
ACS_TOTAL_POP_VAR = "B01003_001E"


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
        return {"population_growth": None}

    try:
        pop2022 = _fetchPopulationByZip(ACS_POP_2022_API, zipCode)
        pop2021 = _fetchPopulationByZip(ACS_POP_2021_API, zipCode)

        if pop2022 is None or pop2021 is None:
            return {"population_growth": None}

        if pop2021 == 0:
            growth = 0.0 if pop2022 == 0 else 1.0
        else:
            growth = (pop2022 - pop2021) / pop2021

        return {"population_growth": round(growth, 4)}

    except Exception as exc:
        print(f"[fetchPopulation] Census API failed for ZIP {zipCode}: {exc}")
        return {"population_growth": None}


if __name__ == "__main__":
    samplePlot = {
        "id": "test_plot",
        "zip": "60647",
    }
    result = fetchPopulation(samplePlot)
    print(result)