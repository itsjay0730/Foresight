# Takes enriched plot objects like:
# plot["crime"] = {...}
# plot["permits"] = {...}
# plot["income"] = {...}
# plot["population"] = {...}
# plot["transit"] = {...}
# and turns them into one clean flat record like:
# {
#     "id": ...,
#     "lat": ...,
#     "lng": ...,
#     "neighborhood": ...,
#     "zip": ...,
#     "property_type": ...,
#     "parcel_size": ...,
#     "zoning": ...,
#     "crime_trend": ...,
#     "permit_activity": ...,
#     "income": ...,
#     "population_growth": ...,
#     "transit_distance": ...
# }

from __future__ import annotations

from typing import Any

from utils import ensureRequiredFields, safeFloat, safeInt


REQUIRED_BASE_FIELDS = [
    "id",
    "lat",
    "lng",
    "neighborhood",
    "zip",
    "property_type",
    "parcel_size",
    "zoning",
]


def _normalizeOnePlot(plot: dict[str, Any]) -> dict[str, Any] | None:
    """
    Flatten one enriched plot into the final output schema.
    """
    if not ensureRequiredFields(plot, REQUIRED_BASE_FIELDS):
        return None

    crime = plot.get("crime", {}) or {}
    permits = plot.get("permits", {}) or {}
    income = plot.get("income", {}) or {}
    population = plot.get("population", {}) or {}
    transit = plot.get("transit", {}) or {}

    normalized = {
        "id": str(plot.get("id")),
        "lat": safeFloat(plot.get("lat")),
        "lng": safeFloat(plot.get("lng")),
        "neighborhood": str(plot.get("neighborhood")),
        "zip": str(plot.get("zip")),
        "property_type": str(plot.get("property_type")),
        "parcel_size": safeInt(plot.get("parcel_size"), default=0),
        "zoning": str(plot.get("zoning")),
        "crime_trend": safeFloat(crime.get("crime_trend")),
        "permit_activity": safeFloat(permits.get("permit_activity")),
        "income": safeInt(income.get("income")),
        "population_growth": safeFloat(population.get("population_growth")),
        "crime_history": crime.get("crime_history", []),
        "permit_history": permits.get("permit_history", []),
        "population_history": population.get("population_history", []),
        "transit_distance": safeFloat(transit.get("transit_distance")),
        # helpful extra fields for debugging / future use
        "crime_count_nearby": safeInt(crime.get("crime_count_nearby"), default=0),
        "violent_crime_count_nearby": safeInt(
            crime.get("violent_crime_count_nearby"), default=0
        ),
        "permit_count_nearby": safeInt(permits.get("permit_count_nearby"), default=0),
        "nearest_station": transit.get("nearest_station"),
        "transit_stop_count_nearby": safeInt(
            transit.get("transit_stop_count_nearby"), default=0
        ),
    }

    return normalized


def normalizePlots(plots: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Normalize a list of enriched plots into the final flat dataset.
    """
    finalPlots: list[dict[str, Any]] = []

    for plot in plots:
        normalized = _normalizeOnePlot(plot)
        if normalized is not None:
            finalPlots.append(normalized)

    return finalPlots


if __name__ == "__main__":
    samplePlot = {
        "id": "plot_001",
        "lat": 41.923,
        "lng": -87.685,
        "neighborhood": "Logan Square",
        "zip": "60647",
        "property_type": "vacant_lot",
        "parcel_size": 8500,
        "zoning": "mixed_use",
        "crime": {
            "crime_trend": -0.12,
            "crime_count_nearby": 18,
            "violent_crime_count_nearby": 4,
        },
        "permits": {
            "permit_activity": 0.23,
            "permit_count_nearby": 11,
        },
        "income": {
            "income": 72000,
        },
        "population": {
            "population_growth": 0.08,
        },
        "transit": {
            "transit_distance": 0.3,
            "nearest_station": "Blue Line",
            "transit_stop_count_nearby": 6,
        },
    }

    result = normalizePlots([samplePlot])
    print(result[0])