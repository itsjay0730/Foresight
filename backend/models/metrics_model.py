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

    permit_growth = features.get("permitGrowth", 0)
    transit_score = features.get("transitScore", 0)

    score = clamp(
        60 + (permit_growth * 20) + (transit_score * 20)
    )

    trend = [
        score - 3,
        score - 1,
        score + 1,
        score
    ]

    change = trend[-1] - trend[0]

    return {
        "score": round(score),
        "change": round(change, 2),
        "trend": [round(t) for t in trend]
    }

def computeMarketStability(plot):
    scores = plot.get("scores", {})
    features = plot.get("features", {})

    risk = scores.get("riskScore", 50)
    population = features.get("populationGrowth", 0)

    score = clamp(
        100 - (risk * 0.7) + ((1 + population) * 20)
    )

    trend = [
        score - 2,
        score - 1,
        score + 1,
        score
    ]

    change = trend[-1] - trend[0]

    return {
        "score": round(score),
        "change": round(change, 2),
        "trend": [round(t) for t in trend]
    }

def computeFamilyDemand(plot):
    features = plot.get("features", {})

    income = features.get("incomeScore", 0)
    transit = features.get("transitScore", 0)
    population = features.get("populationGrowth", 0)

    score = clamp(
        50 +
        (income * 30) +
        (transit * 10) +
        (population * 20)
    )

    trend = [
        score - 3,
        score - 1,
        score + 1,
        score
    ]

    change = trend[-1] - trend[0]

    return {
        "score": round(score),
        "change": round(change, 2),
        "trend": [round(t) for t in trend]
    }

def computeCommercialExpansion(plot):
    features = plot.get("features", {})

    permit = features.get("permitGrowth", 0)
    transit = features.get("transitScore", 0)
    population = features.get("populationGrowth", 0)

    score = clamp(
        50 +
        (permit * 25) +
        (transit * 15) +
        (population * 20)
    )

    trend = [
        score - 3,
        score - 1,
        score + 1,
        score
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