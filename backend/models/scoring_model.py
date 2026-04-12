from typing import Dict, Any

#keep value between 0 and 1
def clamp(value: float) -> float:
    if value < 0:
        return 0
    if value > 1:
        return 1
    return value

#turn crime trend into risk score
#more crime increase = higher risk and vice versa
def computeRiskScore(crimeTrend: float) -> float:
    normalizedCrime = clamp((crimeTrend + 1) / 2)
    return normalizedCrime

#score how investable the area looks right now
def computeInvestmentScore(incomeScore: float, permitGrowth: float, populationGrowth: float, transitScore: float) -> float:
    normalizedPermit = clamp((permitGrowth + 1) / 2)
    normalizedPopulation = clamp((populationGrowth + 1) / 2)

    score = (0.30 * incomeScore + 0.25 * normalizedPermit + 0.25 * normalizedPopulation + 0.20 * transitScore)

    return clamp(score)

#score how much future growth potential the area has
def computeGrowthScore(permitGrowth: float, populationGrowth: float) -> float:
    normalizedPermit = clamp((permitGrowth + 1) / 2)
    normalizedPopulation = clamp((populationGrowth + 1) / 2)

    score = (0.55 * normalizedPermit + 0.45 * normalizedPopulation)

    return clamp(score)

#combine all scores into one final score
def computeFinalScore(investmentScore: float, growthScore: float, riskScore: float) -> float:
    score = (0.45 * investmentScore + 0.40 * growthScore + 0.15 * (1 - riskScore))

    # shift scores upward slightly so distribution isn't too low
    score = (score - 0.5) * 1.8 + 0.7

    return clamp(score)

#convert 0 to 1 score into 0 to 100
def toPercent(score: float) -> int:
    return round(score * 100)

#build all scores for one plot
def buildScores(plot: Dict[str, Any]) -> Dict[str, Any]:
    features = plot.get("features", {})

    crimeTrend = features.get("crimeTrend", 0)
    permitGrowth = features.get("permitGrowth", 0)
    transitScore = features.get("transitScore", 0)
    incomeScore = features.get("incomeScore", 0)
    populationGrowth = features.get("populationGrowth", 0)

    riskScore = computeRiskScore(crimeTrend)
    investmentScore = computeInvestmentScore(incomeScore, permitGrowth, populationGrowth, transitScore)
    growthScore = computeGrowthScore(permitGrowth, populationGrowth)
    finalScore = computeFinalScore(investmentScore, growthScore, riskScore)

    scores = {
        "investmentScore": toPercent(investmentScore),
        "growthScore": toPercent(growthScore),
        "riskScore": toPercent(riskScore),
        "finalScore": toPercent(finalScore)
    }

    return scores

 #build scores for all plots
def buildScoresAll(plots):
    results = []

    for plot in plots:
        scores = buildScores(plot)

        # build forecast scores if forecast exists
        forecastScores = {}

        forecast = plot.get("forecast", {})

        for horizon in ["1y", "3y", "5y"]:
            if (
                forecast.get("crime_forecast") and
                forecast.get("permit_forecast") and
                forecast.get("population_forecast")
            ):
                tempPlot = dict(plot)

                tempFeatures = dict(plot.get("features", {}))

                # recompute features using forecast values
                crimeForecast = forecast["crime_forecast"].get(horizon)
                permitForecast = forecast["permit_forecast"].get(horizon)
                populationForecast = forecast["population_forecast"].get(horizon)

                # get latest real values
                crimeHistory = plot.get("crime_history", [])
                permitHistory = plot.get("permit_history", [])
                populationHistory = plot.get("population_history", [])

                if crimeForecast is not None and len(crimeHistory) > 0:
                    lastCrime = crimeHistory[-1]["crime_count"]
                    tempFeatures["crimeTrend"] = clamp((crimeForecast - lastCrime) / max(lastCrime, 1))

                if permitForecast is not None and len(permitHistory) > 0:
                    lastPermit = permitHistory[-1]["permit_count"]
                    tempFeatures["permitGrowth"] = clamp((permitForecast - lastPermit) / max(lastPermit, 1))

                if populationForecast is not None and len(populationHistory) > 0:
                    lastPopulation = populationHistory[-1]["population"]
                    tempFeatures["populationGrowth"] = clamp((populationForecast - lastPopulation) / max(lastPopulation, 1))

                tempPlot["features"] = tempFeatures

                forecastScores[horizon] = buildScores(tempPlot)

        combined = {
            **plot,
            "scores": scores,
            "forecast_scores": forecastScores
        }

        results.append(combined)

    return results
