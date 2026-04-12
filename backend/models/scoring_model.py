from typing import Dict, Any, List


def clamp(value: float) -> float:
    if value < 0:
        return 0.0
    if value > 1:
        return 1.0
    return value


def normalize(value: float, minVal: float, maxVal: float) -> float:
    if value is None:
        return 0.0
    if maxVal - minVal == 0:
        return 0.0
    return clamp((value - minVal) / (maxVal - minVal))


def toDisplayBand(score: float) -> int:
    return round(60 + clamp(score) * 35)


def stretchScore(score: float) -> float:
    stretched = (score - 0.5) * 1.6 + 0.5
    return clamp(stretched)


# -----------------------------
# Core component scores
# -----------------------------

def computeRiskScore(
    crimeTrend: float,
    unemploymentRate: float,
    povertyRate: float,
) -> float:
    crimeRisk = normalize(crimeTrend, -0.30, 0.50)
    unemploymentRisk = normalize(unemploymentRate, 0.03, 0.20)
    povertyRisk = normalize(povertyRate, 0.05, 0.35)

    score = (
        0.50 * crimeRisk
        + 0.25 * unemploymentRisk
        + 0.25 * povertyRisk
    )
    return clamp(score)


def computePermitScore(permitGrowth: float) -> float:
    return normalize(permitGrowth, -0.50, 2.50)


def computePopulationScore(populationGrowth: float) -> float:
    return normalize(populationGrowth, -0.06, 0.04)


def computeTransitScore(distanceToTransit: float) -> float:
    if distanceToTransit is None:
        return 0.0
    return clamp(1 / (1 + 2.5 * distanceToTransit))


def computeIncomeScore(medianIncome: float) -> float:
    return normalize(medianIncome, 30000, 150000)


def computeSchoolScore(avgSchoolRating: float) -> float:
    return normalize(avgSchoolRating, 1.5, 5.0)


def computeAmenityScore(
    amenityDensityScore: float,
    coffeeCount: float,
    restaurantCount: float,
    groceryCount: float,
    parkCount: float,
    hospitalCount: float,
) -> float:
    densityScore = clamp(amenityDensityScore or 0.0)
    coffeeScore = normalize(coffeeCount or 0, 0, 10)
    restaurantScore = normalize(restaurantCount or 0, 0, 20)
    groceryScore = normalize(groceryCount or 0, 0, 5)
    parkScore = normalize(parkCount or 0, 0, 10)
    hospitalScore = normalize(hospitalCount or 0, 0, 3)

    score = (
        0.35 * densityScore
        + 0.10 * coffeeScore
        + 0.20 * restaurantScore
        + 0.15 * groceryScore
        + 0.10 * parkScore
        + 0.10 * hospitalScore
    )
    return clamp(score)


def computePOIScore(
    poiDensityScore: float,
    schoolPoiCount: float,
    hospitalPoiCount: float,
    universityPoiCount: float,
    officePoiCount: float,
    parkPoiCount: float,
) -> float:
    densityScore = clamp(poiDensityScore or 0.0)
    schoolScore = normalize(schoolPoiCount or 0, 0, 8)
    hospitalScore = normalize(hospitalPoiCount or 0, 0, 3)
    universityScore = normalize(universityPoiCount or 0, 0, 3)
    officeScore = normalize(officePoiCount or 0, 0, 10)
    parkScore = normalize(parkPoiCount or 0, 0, 10)

    score = (
        0.35 * densityScore
        + 0.20 * schoolScore
        + 0.10 * hospitalScore
        + 0.10 * universityScore
        + 0.15 * officeScore
        + 0.10 * parkScore
    )
    return clamp(score)


def computeOwnershipStabilityScore(
    ownershipDurationYears: float,
    saleCountKnown: float,
) -> float:
    durationScore = normalize(ownershipDurationYears or 0, 0, 15)

    # fewer flips / fewer recent turnovers = more stable
    saleCountPenalty = normalize(saleCountKnown or 0, 1, 6)
    score = (
        0.75 * durationScore
        + 0.25 * (1 - saleCountPenalty)
    )
    return clamp(score)


# -----------------------------
# Composite score builders
# -----------------------------

def computeInvestmentScore(
    incomeScore: float,
    permitScore: float,
    populationScore: float,
    transitScore: float,
    schoolScore: float,
    amenityScore: float,
    ownershipScore: float,
) -> float:
    score = (
        0.22 * incomeScore
        + 0.14 * permitScore
        + 0.10 * populationScore
        + 0.16 * transitScore
        + 0.14 * schoolScore
        + 0.16 * amenityScore
        + 0.08 * ownershipScore
    )
    return clamp(score)


def computeGrowthScore(
    permitScore: float,
    populationScore: float,
    amenityScore: float,
    poiScore: float,
    schoolScore: float,
) -> float:
    score = (
        0.35 * permitScore
        + 0.20 * populationScore
        + 0.20 * amenityScore
        + 0.15 * poiScore
        + 0.10 * schoolScore
    )
    return clamp(score)


def computeFinalScore(
    investmentScore: float,
    growthScore: float,
    riskScore: float,
) -> float:
    score = (
        0.40 * investmentScore
        + 0.35 * growthScore
        + 0.25 * (1 - riskScore)
    )
    return clamp(score)


# -----------------------------
# Main builder
# -----------------------------

def buildScores(plot: Dict[str, Any]) -> Dict[str, Any]:
    features = plot.get("features", {}) or {}

    crimeTrend = features.get("crimeTrend", plot.get("crime_trend", 0)) or 0
    permitGrowth = features.get("permitGrowth", plot.get("permit_activity", 0)) or 0
    transitScoreRaw = features.get("transitScore")
    incomeScoreRaw = features.get("incomeScore")
    populationGrowth = (
        features.get("populationGrowth", plot.get("population_growth", 0)) or 0
    )

    unemploymentRate = plot.get("unemployment_rate", 0) or 0
    povertyRate = plot.get("poverty_rate", 0) or 0
    avgSchoolRating = plot.get("average_school_rating_nearby", 0) or 0

    amenityDensityScore = plot.get("amenity_density_score", 0) or 0
    coffeeCount = plot.get("coffee_shop_count_nearby", 0) or 0
    restaurantCount = plot.get("restaurant_count_nearby", 0) or 0
    groceryCount = plot.get("grocery_count_nearby", 0) or 0
    parkCount = plot.get("park_count_nearby", 0) or 0
    hospitalCount = plot.get("hospital_count_nearby", 0) or 0

    poiDensityScore = plot.get("poi_density_score", 0) or 0
    schoolPoiCount = plot.get("school_poi_count_nearby", 0) or 0
    hospitalPoiCount = plot.get("hospital_poi_count_nearby", 0) or 0
    universityPoiCount = plot.get("university_poi_count_nearby", 0) or 0
    officePoiCount = plot.get("office_poi_count_nearby", 0) or 0
    parkPoiCount = plot.get("park_poi_count_nearby", 0) or 0

    ownershipDurationYears = plot.get("ownership_duration_years", 0) or 0
    saleCountKnown = plot.get("sale_count_known", 0) or 0

    riskScore = computeRiskScore(
        crimeTrend,
        unemploymentRate,
        povertyRate,
    )

    permitScore = computePermitScore(permitGrowth)
    populationScore = computePopulationScore(populationGrowth)

    if incomeScoreRaw is not None:
        incomeScore = clamp(incomeScoreRaw)
    else:
        incomeScore = computeIncomeScore(plot.get("income"))

    if transitScoreRaw is not None:
        transitScore = clamp(transitScoreRaw)
    else:
        transitScore = computeTransitScore(plot.get("transit_distance"))

    schoolScore = computeSchoolScore(avgSchoolRating)

    amenityScore = computeAmenityScore(
        amenityDensityScore,
        coffeeCount,
        restaurantCount,
        groceryCount,
        parkCount,
        hospitalCount,
    )

    poiScore = computePOIScore(
        poiDensityScore,
        schoolPoiCount,
        hospitalPoiCount,
        universityPoiCount,
        officePoiCount,
        parkPoiCount,
    )

    ownershipScore = computeOwnershipStabilityScore(
        ownershipDurationYears,
        saleCountKnown,
    )

    investmentScore = stretchScore(
        computeInvestmentScore(
            incomeScore,
            permitScore,
            populationScore,
            transitScore,
            schoolScore,
            amenityScore,
            ownershipScore,
        )
    )

    growthScore = stretchScore(
        computeGrowthScore(
            permitScore,
            populationScore,
            amenityScore,
            poiScore,
            schoolScore,
        )
    )

    riskScore = stretchScore(riskScore)

    finalScore = computeFinalScore(investmentScore, growthScore, riskScore)

    return {
        "investmentScore": toDisplayBand(investmentScore),
        "growthScore": toDisplayBand(growthScore),
        "riskScore": toDisplayBand(riskScore),
        "finalScore": toDisplayBand(finalScore),
    }


def buildScoresAll(plots: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []

    for plot in plots:
        scores = buildScores(plot)

        forecastScores = {}
        forecast = plot.get("forecast", {}) or {}

        for horizon in ["1y", "3y", "5y"]:
            if (
                forecast.get("crime_forecast")
                and forecast.get("permit_forecast")
                and forecast.get("population_forecast")
            ):
                tempPlot = dict(plot)
                tempFeatures = dict(plot.get("features", {}) or {})

                crimeForecast = forecast["crime_forecast"].get(horizon)
                permitForecast = forecast["permit_forecast"].get(horizon)
                populationForecast = forecast["population_forecast"].get(horizon)

                crimeHistory = plot.get("crime_history", []) or []
                permitHistory = plot.get("permit_history", []) or []
                populationHistory = plot.get("population_history", []) or []

                if crimeForecast is not None and len(crimeHistory) > 0:
                    lastCrime = crimeHistory[-1]["crime_count"]
                    tempFeatures["crimeTrend"] = (
                        (crimeForecast - lastCrime) / max(lastCrime, 1)
                    )

                if permitForecast is not None and len(permitHistory) > 0:
                    lastPermit = permitHistory[-1]["permit_count"]
                    tempFeatures["permitGrowth"] = (
                        (permitForecast - lastPermit) / max(lastPermit, 1)
                    )

                if populationForecast is not None and len(populationHistory) > 0:
                    lastPopulation = populationHistory[-1]["population"]
                    tempFeatures["populationGrowth"] = (
                        (populationForecast - lastPopulation) / max(lastPopulation, 1)
                    )

                tempPlot["features"] = tempFeatures
                forecastScores[horizon] = buildScores(tempPlot)

        combined = {
            **plot,
            "scores": scores,
            "forecast_scores": forecastScores,
        }

        results.append(combined)

    return results