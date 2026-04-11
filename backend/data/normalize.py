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

from utils import ensure_required_fields, safe_float, safe_int


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


def _normalize_one_plot(plot: dict[str, Any]) -> dict[str, Any] | None:
    """
    Flatten one enriched plot into the final output schema.
    """
    if not ensure_required_fields(plot, REQUIRED_BASE_FIELDS):
        return None

    crime = plot.get("crime", {}) or {}
    permits = plot.get("permits", {}) or {}
    income = plot.get("income", {}) or {}
    population = plot.get("population", {}) or {}
    transit = plot.get("transit", {}) or {}

    normalized = {
        "id": str(plot.get("id")),
        "lat": safe_float(plot.get("lat")),
        "lng": safe_float(plot.get("lng")),
        "neighborhood": str(plot.get("neighborhood")),
        "zip": str(plot.get("zip")),
        "property_type": str(plot.get("property_type")),
        "parcel_size": safe_int(plot.get("parcel_size"), default=0),
        "zoning": str(plot.get("zoning")),

        "crime_trend": safe_float(crime.get("crime_trend")),
        "permit_activity": safe_float(permits.get("permit_activity")),
        "income": safe_int(income.get("income")),
        "population_growth": safe_float(population.get("population_growth")),
        "transit_distance": safe_float(transit.get("transit_distance")),

        # helpful extra fields for debugging / future use
        "crime_count_nearby": safe_int(crime.get("crime_count_nearby"), default=0),
        "violent_crime_count_nearby": safe_int(crime.get("violent_crime_count_nearby"), default=0),
        "permit_count_nearby": safe_int(permits.get("permit_count_nearby"), default=0),
        "nearest_station": transit.get("nearest_station"),
        "transit_stop_count_nearby": safe_int(transit.get("transit_stop_count_nearby"), default=0),
    }

    return normalized


def normalize(plots: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Normalize a list of enriched plots into the final flat dataset.
    """
    final_plots: list[dict[str, Any]] = []

    for plot in plots:
        normalized = _normalize_one_plot(plot)
        if normalized is not None:
            final_plots.append(normalized)

    return final_plots


if __name__ == "__main__":
    sample_plot = {
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

    result = normalize([sample_plot])
    print(result[0])