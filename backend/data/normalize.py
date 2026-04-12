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
    demographics = plot.get("demographics", {}) or {}
    propertyValue = plot.get("property_value", {}) or {}
    schools = plot.get("schools", {}) or {}
    amenities = plot.get("amenities", {}) or {}
    poi = plot.get("poi", {}) or {}
    housingMarket = plot.get("housing_market", {}) or {}

    normalized = {
        # base
        "id": str(plot.get("id")),
        "pin": plot.get("pin"),
        "lat": safeFloat(plot.get("lat")),
        "lng": safeFloat(plot.get("lng")),
        "neighborhood": str(plot.get("neighborhood")),
        "zip": str(plot.get("zip")),
        "property_type": str(plot.get("property_type")),
        "parcel_size": safeInt(plot.get("parcel_size"), default=0),
        "zoning": str(plot.get("zoning")),

        # existing metrics
        "crime_trend": safeFloat(crime.get("crime_trend")),
        "permit_activity": safeFloat(permits.get("permit_activity")),
        "income": safeInt(income.get("income")),
        "population_growth": safeFloat(population.get("population_growth")),
        "crime_history": crime.get("crime_history", []),
        "permit_history": permits.get("permit_history", []),
        "population_history": population.get("population_history", []),
        "transit_distance": safeFloat(transit.get("transit_distance")),

        # nearby counts
        "crime_count_nearby": safeInt(crime.get("crime_count_nearby"), default=0),
        "violent_crime_count_nearby": safeInt(
            crime.get("violent_crime_count_nearby"), default=0
        ),
        "permit_count_nearby": safeInt(permits.get("permit_count_nearby"), default=0),
        "nearest_station": transit.get("nearest_station"),
        "transit_stop_count_nearby": safeInt(
            transit.get("transit_stop_count_nearby"), default=0
        ),

        # demographics
        "current_population": safeInt(demographics.get("current_population")),
        "population_growth_1y": safeFloat(demographics.get("population_growth_1y")),
        "population_growth_3y": safeFloat(demographics.get("population_growth_3y")),
        "median_age": safeFloat(demographics.get("median_age")),
        "pct_age_18_24": safeFloat(demographics.get("pct_age_18_24")),
        "pct_age_25_34": safeFloat(demographics.get("pct_age_25_34")),
        "pct_age_35_54": safeFloat(demographics.get("pct_age_35_54")),
        "pct_age_55_plus": safeFloat(demographics.get("pct_age_55_plus")),

        # income fields kept separate
        "zip_median_household_income": safeInt(income.get("income")),
        "community_median_household_income": safeInt(
            demographics.get("median_household_income")
        ),
        "community_per_capita_income": safeInt(
            demographics.get("per_capita_income")
        ),
        "household_income_growth_1y": safeFloat(
            demographics.get("household_income_growth_1y")
        ),
        "renter_pct": safeFloat(demographics.get("renter_pct")),
        "owner_pct": safeFloat(demographics.get("owner_pct")),
        "unemployment_rate": safeFloat(demographics.get("unemployment_rate")),
        "hardship_index": safeInt(demographics.get("hardship_index")),
        "poverty_rate": safeFloat(demographics.get("poverty_rate")),

        # property value
        "full_address": propertyValue.get("full_address"),
        "assessed_value": safeInt(propertyValue.get("assessed_value")),
        "land_assessed_value": safeInt(propertyValue.get("land_assessed_value")),
        "building_assessed_value": safeInt(propertyValue.get("building_assessed_value")),
        "assessed_value_year": safeInt(propertyValue.get("assessed_value_year")),
        "last_sale_price": safeInt(propertyValue.get("last_sale_price")),
        "last_sale_date": propertyValue.get("last_sale_date"),
        "ownership_duration_years": safeFloat(
            propertyValue.get("ownership_duration_years")
        ),
        "sale_count_known": safeInt(propertyValue.get("sale_count_known"), default=0),

        # schools
        "average_school_rating_nearby": safeFloat(
            schools.get("average_school_rating_nearby")
        ),
        "elementary_school_rating_avg": safeFloat(
            schools.get("elementary_school_rating_avg")
        ),
        "high_school_rating_avg": safeFloat(
            schools.get("high_school_rating_avg")
        ),
        "school_count_nearby": safeInt(schools.get("school_count_nearby"), default=0),

        # amenities
        "coffee_shop_count_nearby": safeInt(
            amenities.get("coffee_shop_count_nearby"), default=0
        ),
        "restaurant_count_nearby": safeInt(
            amenities.get("restaurant_count_nearby"), default=0
        ),
        "grocery_count_nearby": safeInt(
            amenities.get("grocery_count_nearby"), default=0
        ),
        "park_count_nearby": safeInt(
            amenities.get("park_count_nearby"), default=0
        ),
        "hospital_count_nearby": safeInt(
            amenities.get("hospital_count_nearby"), default=0
        ),
        "amenity_density_score": safeFloat(
            amenities.get("amenity_density_score")
        ),

        # nearby points of interest
        "school_poi_count_nearby": safeInt(
            poi.get("school_poi_count_nearby"), default=0
        ),
        "hospital_poi_count_nearby": safeInt(
            poi.get("hospital_poi_count_nearby"), default=0
        ),
        "university_poi_count_nearby": safeInt(
            poi.get("university_poi_count_nearby"), default=0
        ),
        "office_poi_count_nearby": safeInt(
            poi.get("office_poi_count_nearby"), default=0
        ),
        "park_poi_count_nearby": safeInt(
            poi.get("park_poi_count_nearby"), default=0
        ),
        "poi_density_score": safeFloat(
            poi.get("poi_density_score")
        ),

        # housing market
        "housing_market_scope": housingMarket.get("market_scope"),

        "zip_rent_index_latest": safeFloat(
            housingMarket.get("zip_rent_index_latest")
        ),
        "zip_rent_growth_1y": safeFloat(
            housingMarket.get("zip_rent_growth_1y")
        ),
        "zip_rent_history": housingMarket.get("zip_rent_history", []),

        "metro_rent_index_latest": safeFloat(
            housingMarket.get("metro_rent_index_latest")
        ),
        "metro_rent_growth_1y": safeFloat(
            housingMarket.get("metro_rent_growth_1y")
        ),
        "metro_rent_history": housingMarket.get("metro_rent_history", []),

        "sales_count_latest": safeFloat(
            housingMarket.get("sales_count_latest")
        ),
        "sales_count_growth_1y": safeFloat(
            housingMarket.get("sales_count_growth_1y")
        ),
        "sales_count_history": housingMarket.get("sales_count_history", []),
    }

    return normalized


def normalizePlots(plots: list[dict[str, Any]]) -> list[dict[str, Any]]:
    finalPlots: list[dict[str, Any]] = []

    for plot in plots:
        normalized = _normalizeOnePlot(plot)
        if normalized is not None:
            finalPlots.append(normalized)

    return finalPlots


if __name__ == "__main__":
    samplePlot = {
        "id": "plot_001",
        "pin": "17032000661098",
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
        "demographics": {
            "per_capita_income": 38000,
            "unemployment_rate": 0.07,
            "poverty_rate": 0.12,
            "hardship_index": 33,
        },
        "property_value": {
            "full_address": "123 MAIN ST, CHICAGO, IL, 60647",
            "last_sale_price": 450000,
            "last_sale_date": "2022-08-15",
            "ownership_duration_years": 2.1,
            "sale_count_known": 3,
        },
        "schools": {
            "average_school_rating_nearby": 4.1,
            "elementary_school_rating_avg": 4.0,
            "high_school_rating_avg": 4.3,
            "school_count_nearby": 5,
        },
        "amenities": {
            "coffee_shop_count_nearby": 3,
            "restaurant_count_nearby": 8,
            "grocery_count_nearby": 2,
            "park_count_nearby": 1,
            "hospital_count_nearby": 1,
            "amenity_density_score": 0.72,
        },
        "poi": {
            "school_poi_count_nearby": 4,
            "hospital_poi_count_nearby": 1,
            "university_poi_count_nearby": 1,
            "office_poi_count_nearby": 6,
            "park_poi_count_nearby": 2,
            "poi_density_score": 0.61,
        },
        "housing_market": {
            "market_scope": "zip_plus_metro",
            "zip_rent_index_latest": 2385.22,
            "zip_rent_growth_1y": 0.0614,
            "zip_rent_history": [
                {"month": "2025-01", "value": 2247.15},
                {"month": "2026-01", "value": 2385.22},
            ],
            "metro_rent_index_latest": 2132.29,
            "metro_rent_growth_1y": 0.0546,
            "metro_rent_history": [
                {"month": "2025-01", "value": 2005.04},
                {"month": "2026-02", "value": 2132.29},
            ],
            "sales_count_latest": 5947.0,
            "sales_count_growth_1y": -0.0025,
            "sales_count_history": [
                {"month": "2025-01", "value": 5956.0},
                {"month": "2026-02", "value": 5947.0},
            ],
        },
    }

    result = normalizePlots([samplePlot])
    print(result[0])