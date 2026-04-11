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
    crimeTrend = computeCrimeTrend(plot.get("crime_last_year", 0), plot.get("crime_this_year", 0))
    permitGrowth = computePermitGrowth(plot.get("permits_last_year", 0), plot.get("permits_this_year", 0))
    transitScore = computeTransitScore(plot.get("distance_to_transit", 1))
    incomeScore = computeIncomeScore(plot.get("median_income", 50000))
    populationGrowth = computePopulationGrowth(plot.get("population_last_year", 0), plot.get("population_this_year", 0))

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