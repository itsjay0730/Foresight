from typing import Dict, Any

#normalize between 0 and 1
def normalize(value, minVal, maxVal):
    if maxVal - minVal == 0:
        return 0
    return (value - minVal) / (maxVal - minVal)

#returns crime trend
def computeCrimeTrend(crimeLastYear: float, crimeThisYear: float) -> float:
    if crimeLastYear == 0:
        return 0
    return (crimeThisYear - crimeLastYear) / crimeLastYear

#returns permit growth rate
def computePermitGrowth(permitsLastYear: float, permitsThisYear: float) -> float:
    if permitsLastYear == 0:
        return 0
    return (permitsThisYear - permitsLastYear) / permitsLastYear

#closer to transit = higher score
def computeTransitScore(distanceToTransit: float) -> float:
    return 1 / (1 + distanceToTransit)

#normalize income score
def computeIncomeScore(medianIncome):
    if medianIncome is None:
        medianIncome = 50000
    return normalize(medianIncome, 30000, 150000)

#returns population growth
def computePopulationGrowth(popLastYear: float, popThisYear: float) -> float:
    if popLastYear == 0:
        return 0
    return (popThisYear - popLastYear) / popLastYear

#convert raw plot data into features
def buildFeatures(plot: Dict[str, Any]) -> Dict[str, Any]:

    crimeHistory = plot.get("crime_history", [])
    permitHistory = plot.get("permit_history", [])
    populationHistory = plot.get("population_history", [])

    # use forecast if available
    forecast = plot.get("forecast", {})

    crimeForecast = forecast.get("crime_forecast")
    permitForecast = forecast.get("permit_forecast")
    populationForecast = forecast.get("population_forecast")

    #crime trend from forecast if available
    if crimeForecast:
        crimeLast = crimeHistory[-1]["crime_count"] if crimeHistory else 0
        crimeThis = crimeForecast.get("1y", crimeLast)
        crimeTrend = computeCrimeTrend(crimeLast, crimeThis)

    elif len(crimeHistory) >= 2:
        crimeLast = crimeHistory[-2]["crime_count"]
        crimeThis = crimeHistory[-1]["crime_count"]
        crimeTrend = computeCrimeTrend(crimeLast, crimeThis)
    else:
        crimeTrend = 0

    #permit growth from forecast if available
    if permitForecast:
        permitLast = permitHistory[-1]["permit_count"] if permitHistory else 0
        permitThis = permitForecast.get("1y", permitLast)
        permitGrowth = computePermitGrowth(permitLast, permitThis)

    elif len(permitHistory) >= 2:
        permitLast = permitHistory[-2]["permit_count"]
        permitThis = permitHistory[-1]["permit_count"]
        permitGrowth = computePermitGrowth(permitLast, permitThis)
    else:
        permitGrowth = 0

    #population growth from forecast if available
    if populationForecast:
        popLast = populationHistory[-1]["population"] if populationHistory else 0
        popThis = populationForecast.get("1y", popLast)
        populationGrowth = computePopulationGrowth(popLast, popThis)

    elif len(populationHistory) >= 2:
        popLast = populationHistory[-2]["population"]
        popThis = populationHistory[-1]["population"]
        populationGrowth = computePopulationGrowth(popLast, popThis)
    else:
        populationGrowth = 0

    transitScore = computeTransitScore(plot.get("transit_distance", 1))
    incomeScore = computeIncomeScore(plot.get("income", 50000))

    # additional differentiating features
    schoolScore = normalize(
        plot.get("average_school_rating_nearby", 0) or 0,
        1.5,
        5.0
    )

    amenityScore = plot.get("amenity_density_score", 0) or 0
    poiScore = plot.get("poi_density_score", 0) or 0

    ownershipScore = normalize(
        plot.get("ownership_duration_years", 0) or 0,
        0,
        15
    )

    riskBase = normalize(
        plot.get("crime_count_nearby", 0) or 0,
        0,
        20
    )

    features = {
        "crimeTrend": crimeTrend,
        "permitGrowth": permitGrowth,
        "transitScore": transitScore,
        "incomeScore": incomeScore,
        "populationGrowth": populationGrowth,
        "schoolScore": schoolScore,
        "amenityScore": amenityScore,
        "poiScore": poiScore,
        "ownershipScore": ownershipScore,
        "riskBase": riskBase,
    }

    return features

#build features for multiple plots
def buildFeaturesAll(plots):
    results = []

    for plot in plots:
        features = buildFeatures(plot)

        combined = {
            **plot,
            "features": features
        }

        results.append(combined)

    return results