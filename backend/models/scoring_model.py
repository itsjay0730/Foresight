from typing import Dict, Any

# Keep value between 0 and 1
def clamp(value: float) -> float:
    if value < 0:
        return 0
    if value > 1:
        return 1
    return value

# Map a raw 0-1 score to the realistic 60-95 display range.
# A poor area (0.0) → 60, an average area (0.5) → 77, an excellent area (1.0) → 95.
def toDisplayRange(score: float) -> float:
    return 0.60 + clamp(score) * 0.35

# Turn crime trend into a risk score.
# Higher crime trend = higher risk (worse for investment).
def computeRiskScore(crimeTrend: float) -> float:
    return clamp((crimeTrend + 1) / 2)

# Score how investable the area looks right now.
def computeInvestmentScore(
    incomeScore: float,
    permitGrowth: float,
    populationGrowth: float,
    transitScore: float
) -> float:
    normalizedPermit = clamp((permitGrowth + 1) / 2)
    normalizedPopulation = clamp((populationGrowth + 1) / 2)
    score = (
        0.30 * incomeScore +
        0.25 * normalizedPermit +
        0.25 * normalizedPopulation +
        0.20 * transitScore
    )
    return clamp(score)

# Score how much future growth potential the area has.
def computeGrowthScore(permitGrowth: float, populationGrowth: float) -> float:
    normalizedPermit = clamp((permitGrowth + 1) / 2)
    normalizedPopulation = clamp((populationGrowth + 1) / 2)
    score = (0.55 * normalizedPermit + 0.45 * normalizedPopulation)
    return clamp(score)

# Combine all raw 0-1 scores into one final 0-1 score.
# No artificial inflation — honest weighted average.
def computeFinalScore(
    investmentScore: float,
    growthScore: float,
    riskScore: float
) -> float:
    score = (
        0.45 * investmentScore +
        0.40 * growthScore +
        0.15 * (1 - riskScore)   # lower crime = better
    )
    return clamp(score)

# Convert 0-1 score to display integer in the 60-95 range.
def toPercent(score: float) -> int:
    return round(toDisplayRange(score) * 100)

# Build all scores for one plot.
def buildScores(plot: Dict[str, Any]) -> Dict[str, Any]:
    features = plot.get("features", {})

    crimeTrend       = features.get("crimeTrend", 0)
    permitGrowth     = features.get("permitGrowth", 0)
    transitScore     = features.get("transitScore", 0)
    incomeScore      = features.get("incomeScore", 0)
    populationGrowth = features.get("populationGrowth", 0)

    # Compute raw honest 0-1 scores — no stretching
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

# Build scores for all plots.
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

                tempPlot = {**plot, "features": tempFeatures}
                forecastScores[horizon] = buildScores(tempPlot)

        results.append({**plot, "scores": scores, "forecast_scores": forecastScores})

    return results