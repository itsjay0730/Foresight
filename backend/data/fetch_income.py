from __future__ import annotations

from typing import Any

import requests

from config import CENSUS_ACS_API, CENSUS_API_KEY, REQUEST_TIMEOUT


# ACS variable for median household income in the past 12 months
ACS_MEDIAN_INCOME_VAR = "B19013_001E"


ZIP_TO_INCOME: dict[str, int] = {
    "60647": 102000,
    "60614": 145000,
    "60657": 128000,
    "60610": 121000,
    "60607": 117000,
    "60616": 89000,
    "60637": 54000,
    "60653": 62000,
    "60608": 71000,
    "60622": 98000,
    "60620": 52000,
}


def _fetchIncomeByZip(zipCode: str) -> int | None:
    """
    Fetch median household income for a ZIP Code Tabulation Area from ACS.
    """
    params = {
        "get": f"NAME,{ACS_MEDIAN_INCOME_VAR}",
        "for": f"zip code tabulation area:{zipCode}",
    }

    if CENSUS_API_KEY:
        params["key"] = CENSUS_API_KEY

    response = requests.get(CENSUS_ACS_API, params=params, timeout=REQUEST_TIMEOUT)
    response.raise_for_status()
    data = response.json()

    # Expected format:
    # [
    #   ["NAME", "B19013_001E", "zip code tabulation area"],
    #   ["ZCTA5 60647", "102000", "60647"]
    # ]
    if len(data) < 2:
        return None

    value = data[1][1]
    if value in (None, "", "-666666666"):
        return None

    return int(value)


def fetchIncome(plot: dict[str, Any]) -> dict[str, Any]:
    """
    Fetch area income for a plot.

    Returns a consistent structure:
    {
        "income": int | None
    }
    """
    zipCode = str(plot.get("zip", "")).strip()

    if not zipCode or zipCode == "Unknown":
        return {"income": None}

    try:
        income = _fetchIncomeByZip(zipCode)
        if income is not None:
            return {"income": income}
    except Exception as exc:
        print(f"[fetchIncome] Census API failed for ZIP {zipCode}: {exc}")

    # Fallback for MVP so the pipeline still works with realistic values
    fallbackIncome = ZIP_TO_INCOME.get(zipCode)
    return {"income": fallbackIncome}


if __name__ == "__main__":
    samplePlot = {
        "id": "test_plot",
        "zip": "60647",
    }
    result = fetchIncome(samplePlot)
    print(result)