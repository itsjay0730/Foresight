from typing import Dict, Any, List


# keep value between 0 and 1
def clamp(value: float) -> float:
    if value < 0:
        return 0.0
    if value > 1:
        return 1.0
    return value


# generic normalization
def normalize(value: float, minVal: float, maxVal: float) -> float:
    if value is None:
        return 0.0
    if maxVal - minVal == 0:
        return 0.0
    return clamp((value - minVal) / (maxVal - minVal))


# map normalized score to display band 60–95
def toDisplayBand(score: float) -> int:
    return round(60 + clamp(score) * 35)


# widen score distribution while keeping values aligned
def stretchScore(score: float) -> float:
    # stretch mid range without breaking extremes
    stretched = (score - 0.5) * 1.6 + 0.5
    return clamp(stretched)


# more crime increase => higher risk
# expected useful range roughly: -0.30 to +0.50
def computeRiskScore(crimeTrend: float) -> float:
    return normalize(crimeTrend, -0.30, 0.50)


# permit activity can be noisy, so use a wide range
# negative values are decline, positive are momentum
def computePermitScore(permitGrowth: float) -> float:
    return normalize(permitGrowth, -0.50, 2.50)


# population growth is usually small, so use a tighter range
def computePopulationScore(populationGrowth: float) -> float:
    return normalize(populationGrowth, -0.06, 0.04)


# closer to transit = higher score
def computeTransitScore(distanceToTransit: float) -> float:
    if distanceToTransit is None:
        return 0.0
    # smoother falloff so transit helps, but does not dominate
    return clamp(1 / (1 + 2.5 * distanceToTransit))


# normalize income score
def computeIncomeScore(medianIncome: float) -> float:
    return normalize(medianIncome, 30000, 150000)


# score how investable the area looks right now
def computeInvestmentScore(
    incomeScore: float,
    permitScore: float,
    populationScore: float,
    transitScore: float,
) -> float:
    score = (
        0.35 * incomeScore
        + 0.25 * permitScore
        + 0.15 * populationScore
        + 0.25 * transitScore
    )
    return clamp(score)


# score future growth potential
def computeGrowthScore(permitScore: float, populationScore: float) -> float:
    score = (
        0.65 * permitScore
        + 0.35 * populationScore
    )
    return clamp(score)


# combine all into final score
# risk is a penalty, so we use (1 - riskScore)
def computeFinalScore(
    investmentScore: float,
    growthScore: float,
    riskScore: float,
) -> float:
    score = (
        0.38 * investmentScore
        + 0.33 * growthScore
        + 0.29 * (1 - riskScore)
    )
    return clamp(score)


# build all scores for one plot
def buildScores(plot: Dict[str, Any]) -> Dict[str, Any]:
    features = plot.get("features", {}) or {}

    crimeTrend = features.get("crimeTrend", 0) or 0
    permitGrowth = features.get("permitGrowth", 0) or 0
    transitScoreRaw = features.get("transitScore", 0) or 0
    incomeScoreRaw = features.get("incomeScore", 0) or 0
    populationGrowth = features.get("populationGrowth", 0) or 0

    # feature_builder may already normalize some fields, but to keep this model
    # stable and realistic we recompute score components from reasonable ranges.
    riskScore = computeRiskScore(crimeTrend)
    permitScore = computePermitScore(permitGrowth)
    populationScore = computePopulationScore(populationGrowth)

    # if feature_builder already gave a normalized income/transit score, use it
    incomeScore = clamp(incomeScoreRaw)
    transitScore = clamp(transitScoreRaw)

    investmentScore = stretchScore(
        computeInvestmentScore(
            incomeScore,
            permitScore,
            populationScore,
            transitScore,
        )
    )

    growthScore = stretchScore(
        computeGrowthScore(permitScore, populationScore)
    )

    riskScore = stretchScore(riskScore)

    finalScore = computeFinalScore(investmentScore, growthScore, riskScore)


    scores = {
        "investmentScore": toDisplayBand(investmentScore),
        "growthScore": toDisplayBand(growthScore),
        "riskScore": toDisplayBand(riskScore),
        "finalScore": toDisplayBand(finalScore),
    }

    return scores


# build scores for all plots
def buildScoresAll(plots: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []

    for plot in plots:
        scores = buildScores(plot)

        forecastScores = {}
        forecast = plot.get("forecast", {}) or {}

        for horizon in ["1y", "3y", "5y"]:
            if forecast.get("population_forecast"):
                tempPlot = dict(plot)
                tempFeatures = dict(plot.get("features", {}) or {})

                crimeForecast = (forecast.get("crime_forecast") or {}).get(horizon)
                permitForecast = (forecast.get("permit_forecast") or {}).get(horizon)
                populationForecast = (forecast.get("population_forecast") or {}).get(horizon)

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