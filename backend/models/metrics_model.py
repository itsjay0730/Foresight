def clamp(value, min_val=0, max_val=100):
    return max(min_val, min(max_val, value))

def computeInvestmentOpportunity(plot):
    scores = plot.get("scores", {})
    forecast = plot.get("forecast_scores", {})

    current = scores.get("investmentScore", 50)

    trend = [
        current,
        forecast.get("1y", {}).get("investmentScore", current),
        forecast.get("3y", {}).get("investmentScore", current),
        forecast.get("5y", {}).get("investmentScore", current)
    ]

    change = trend[-1] - trend[0]

    return {
        "score": current,
        "change": round(change, 2),
        "trend": trend
    }

def computeAppreciationPotential(plot):
    scores = plot.get("scores", {})
    forecast = plot.get("forecast_scores", {})

    current = scores.get("growthScore", 50)

    trend = [
        current,
        forecast.get("1y", {}).get("growthScore", current),
        forecast.get("3y", {}).get("growthScore", current),
        forecast.get("5y", {}).get("growthScore", current)
    ]

    change = trend[-1] - trend[0]

    return {
        "score": current,
        "change": round(change, 2),
        "trend": trend
    }

def computeDevelopmentReadiness(plot):
    features = plot.get("features", {})
    forecast = plot.get("forecast_scores", {})
    current = clamp(
        60 + (features.get("permitGrowth", 0) * 20) + (features.get("transitScore", 0) * 20)
    )
    f1 = forecast.get("1y", {}).get("growthScore", current)
    f3 = forecast.get("3y", {}).get("growthScore", current)
    f5 = forecast.get("5y", {}).get("growthScore", current)
    trend = [current - 2, current, f1, f3, f5]
    change = trend[-1] - trend[0]
    return {
        "score": round(current),
        "change": round(change, 2),
        "trend": [round(t) for t in trend]
    }

def computeMarketStability(plot):
    scores = plot.get("scores", {})
    features = plot.get("features", {})
    forecast = plot.get("forecast_scores", {})

    risk = scores.get("riskScore", 50)
    population = features.get("populationGrowth", 0)

    score = clamp(
        100 - (risk * 0.7) + ((1 + population) * 20)
    )

    f1 = forecast.get("1y", {}).get("riskScore", score)
    f3 = forecast.get("3y", {}).get("riskScore", score)
    f5 = forecast.get("5y", {}).get("riskScore", score)
    trend = [
        score - 2,
        score,
        100 - f1,
        100 - f3,
        100 - f5
    ]

    change = trend[-1] - trend[0]

    return {
        "score": round(score),
        "change": round(change, 2),
        "trend": [round(t) for t in trend]
    }

def computeFamilyDemand(plot):
    features = plot.get("features", {})
    forecast = plot.get("forecast", {})
    pop_forecast = forecast.get("population_forecast", {})

    income = features.get("incomeScore", 0)
    transit = features.get("transitScore", 0)
    population = features.get("populationGrowth", 0)

    score = clamp(
        50 +
        (income * 30) +
        (transit * 10) +
        (population * 20)
    )

    f1 = pop_forecast.get("1y", population)
    f3 = pop_forecast.get("3y", population)
    f5 = pop_forecast.get("5y", population)
    trend = [
        score - 2,
        score,
        score + (0.5 if f1 > population else -0.5),
        score + (1 if f3 > population else -1),
        score + (1.5 if f5 > population else -1.5)
    ]

    change = trend[-1] - trend[0]

    return {
        "score": round(score),
        "change": round(change, 2),
        "trend": [round(t) for t in trend]
    }

def computeCommercialExpansion(plot):
    features = plot.get("features", {})
    forecast = plot.get("forecast", {})
    permit_forecast = forecast.get("permit_forecast", {})

    permit = features.get("permitGrowth", 0)
    transit = features.get("transitScore", 0)
    population = features.get("populationGrowth", 0)

    score = clamp(
        50 +
        (permit * 25) +
        (transit * 15) +
        (population * 20)
    )

    f1 = permit_forecast.get("1y", permit)
    f3 = permit_forecast.get("3y", permit)
    f5 = permit_forecast.get("5y", permit)
    trend = [
        score - 2,
        score,
        score + (0.5 if f1 > 0 else -0.5),
        score + (1 if f3 > 0 else -1),
        score + (1.5 if f5 > 0 else -1.5)
    ]

    change = trend[-1] - trend[0]

    return {
        "score": round(score),
        "change": round(change, 2),
        "trend": [round(t) for t in trend]
    }

def buildMetrics(plot):
    return {
        "investmentOpportunity": computeInvestmentOpportunity(plot),
        "appreciationPotential": computeAppreciationPotential(plot),
        "developmentReadiness": computeDevelopmentReadiness(plot),
        "marketStability": computeMarketStability(plot),
        "familyDemand": computeFamilyDemand(plot),
        "commercialExpansion": computeCommercialExpansion(plot)
    }

def buildMetricsAll(plots):
    for plot in plots:
        plot["metrics"] = buildMetrics(plot)
    return plots