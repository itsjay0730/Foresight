from typing import Dict, Any

def clamp(value: float) -> float:
    if value < 0:
        return 0
    if value > 1:
        return 1
    return value

# Map realistic score range [0.25, 0.75] → display range [60, 95].
# Scores outside that band are clamped to the floor/ceiling.
# This amplifies real differences instead of cramming everything into a narrow slice.
def toDisplayRange(score: float) -> float:
    LOW_RAW, HIGH_RAW   = 0.25, 0.75   # expected realistic input band
    LOW_DISP, HIGH_DISP = 0.60, 0.95   # target display range
    normalized = (score - LOW_RAW) / (HIGH_RAW - LOW_RAW)
    return LOW_DISP + clamp(normalized) * (HIGH_DISP - LOW_DISP)

def computeRiskScore(crimeTrend: float) -> float:
    return clamp((crimeTrend + 1) / 2)

def computeInvestmentScore(
    incomeScore: float,
    permitGrowth: float,
    populationGrowth: float,
    transitScore: float,
) -> float:
    normalizedPermit     = clamp((permitGrowth + 1) / 2)
    normalizedPopulation = clamp((populationGrowth + 1) / 2)
    score = (
        0.30 * incomeScore +
        0.25 * normalizedPermit +
        0.25 * normalizedPopulation +
        0.20 * transitScore
    )
    return clamp(score)

def computeGrowthScore(permitGrowth: float, populationGrowth: float) -> float:
    normalizedPermit     = clamp((permitGrowth + 1) / 2)
    normalizedPopulation = clamp((populationGrowth + 1) / 2)
    return clamp(0.55 * normalizedPermit + 0.45 * normalizedPopulation)

def computeFinalScore(
    investmentScore: float,
    growthScore: float,
    riskScore: float,
) -> float:
    return clamp(
        0.45 * investmentScore +
        0.40 * growthScore +
        0.15 * (1 - riskScore)
    )

def toPercent(score: float) -> int:
    return round(toDisplayRange(score) * 100)

def buildScores(plot: Dict[str, Any]) -> Dict[str, Any]:
    features = plot.get("features", {})

    crimeTrend       = features.get("crimeTrend", 0)
    permitGrowth     = features.get("permitGrowth", 0)
    transitScore     = features.get("transitScore", 0)
    incomeScore      = features.get("incomeScore", 0)
    populationGrowth = features.get("populationGrowth", 0)

    riskScore       = computeRiskScore(crimeTrend)
    investmentScore = computeInvestmentScore(incomeScore, permitGrowth, populationGrowth, transitScore)
    growthScore     = computeGrowthScore(permitGrowth, populationGrowth)
    finalScore      = computeFinalScore(investmentScore, growthScore, riskScore)

    return {
        "investmentScore": toPercent(investmentScore),
        "growthScore":     toPercent(growthScore),
        "riskScore":       toPercent(riskScore),
        "finalScore":      toPercent(finalScore),
    }

def buildScoresAll(plots):
    results = []

    for plot in plots:
        scores = buildScores(plot)

        forecastScores = {}
        forecast = plot.get("forecast", {})

        for horizon in ["1y", "3y", "5y"]:
            if (
                forecast.get("crime_forecast") and
                forecast.get("permit_forecast") and
                forecast.get("population_forecast")
            ):
                tempFeatures = dict(plot.get("features", {}))

                crimeHistory      = plot.get("crime_history", [])
                permitHistory     = plot.get("permit_history", [])
                populationHistory = plot.get("population_history", [])

                crimeForecast      = forecast["crime_forecast"].get(horizon)
                permitForecast     = forecast["permit_forecast"].get(horizon)
                populationForecast = forecast["population_forecast"].get(horizon)

                if crimeForecast is not None and len(crimeHistory) > 0:
                    lastCrime = crimeHistory[-1]["crime_count"]
                    tempFeatures["crimeTrend"] = clamp(
                        (crimeForecast - lastCrime) / max(lastCrime, 1)
                    )

                if permitForecast is not None and len(permitHistory) > 0:
                    lastPermit = permitHistory[-1]["permit_count"]
                    tempFeatures["permitGrowth"] = clamp(
                        (permitForecast - lastPermit) / max(lastPermit, 1)
                    )

                if populationForecast is not None and len(populationHistory) > 0:
                    lastPopulation = populationHistory[-1]["population"]
                    tempFeatures["populationGrowth"] = clamp(
                        (populationForecast - lastPopulation) / max(lastPopulation, 1)
                    )

                forecastScores[horizon] = buildScores({**plot, "features": tempFeatures})

        results.append({**plot, "scores": scores, "forecast_scores": forecastScores})

    return results