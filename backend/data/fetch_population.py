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


def _fetch_population_by_zip(api_url: str, zip_code: str) -> int | None:
    params = {
        "get": f"NAME,{ACS_TOTAL_POP_VAR}",
        "for": f"zip code tabulation area:{zip_code}",
    }

    if CENSUS_API_KEY:
        params["key"] = CENSUS_API_KEY

    response = requests.get(api_url, params=params, timeout=REQUEST_TIMEOUT)
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


def fetch_population(plot: dict[str, Any]) -> dict[str, Any]:
    """
    Fetch population growth for a plot's ZIP area.

    Returns a consistent structure:
    {
        "population_growth": float | None
    }

    population_growth = (pop_2022 - pop_2021) / pop_2021
    """
    zip_code = str(plot.get("zip", "")).strip()

    if not zip_code or zip_code == "Unknown":
        return {"population_growth": None}

    try:
        pop_2022 = _fetch_population_by_zip(ACS_POP_2022_API, zip_code)
        pop_2021 = _fetch_population_by_zip(ACS_POP_2021_API, zip_code)

        if pop_2022 is None or pop_2021 is None:
            return {"population_growth": None}

        if pop_2021 == 0:
            growth = 0.0 if pop_2022 == 0 else 1.0
        else:
            growth = (pop_2022 - pop_2021) / pop_2021

        return {"population_growth": round(growth, 4)}

    except Exception as exc:
        print(f"[fetch_population] Census API failed for ZIP {zip_code}: {exc}")
        return {"population_growth": None}


if __name__ == "__main__":
    sample_plot = {
        "id": "test_plot",
        "zip": "60647",
    }
    result = fetch_population(sample_plot)
    print(result)