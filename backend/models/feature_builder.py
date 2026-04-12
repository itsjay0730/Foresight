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
def computeIncomeScore(medianIncome: float) -> float:
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

    #crime trend from last two years
    if len(crimeHistory) >= 2:
        crimeLast = crimeHistory[-2]["crime_count"]
        crimeThis = crimeHistory[-1]["crime_count"]
        crimeTrend = computeCrimeTrend(crimeLast, crimeThis)
    else:
        crimeTrend = 0

    #permit growth from last two years
    if len(permitHistory) >= 2:
        permitLast = permitHistory[-2]["permit_count"]
        permitThis = permitHistory[-1]["permit_count"]
        permitGrowth = computePermitGrowth(permitLast, permitThis)
    else:
        permitGrowth = 0

    #population growth from last two years
    if len(populationHistory) >= 2:
        popLast = populationHistory[-2]["population"]
        popThis = populationHistory[-1]["population"]
        populationGrowth = computePopulationGrowth(popLast, popThis)
    else:
        populationGrowth = 0

    transitScore = computeTransitScore(plot.get("transit_distance", 1))
    incomeScore = computeIncomeScore(plot.get("income", 50000))

    features = {
        "crimeTrend": crimeTrend,
        "permitGrowth": permitGrowth,
        "transitScore": transitScore,
        "incomeScore": incomeScore,
        "populationGrowth": populationGrowth
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