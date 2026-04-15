def clamp(value, min_val=0, max_val=100):
    """Keep a number within a fixed range."""
    return max(min_val, min(max_val, value))


def buildTrend(current, future1, future3, future5):
    """Build a standard 4-point trend list."""
    return [current, future1, future3, future5]


def buildSimpleMetric(score, trend):
    """Return a metric object with score, change, and trend."""
    change = trend[-1] - trend[0]
    return {
        "score": round(score, 2) if isinstance(score, float) else score,
        "change": round(change, 2),
        "trend": [round(t, 2) if isinstance(t, float) else t for t in trend],
    }


def computeInvestmentOpportunity(plot):
    """Measure current investment score and future forecast trend."""
    scores = plot.get("scores", {})
    forecast = plot.get("forecast_scores", {})

    current = scores.get("investmentScore", 50)

    trend = buildTrend(
        current,
        forecast.get("1y", {}).get("investmentScore", current),
        forecast.get("3y", {}).get("investmentScore", current),
        forecast.get("5y", {}).get("investmentScore", current),
    )

    return buildSimpleMetric(current, trend)


def computeAppreciationPotential(plot):
    """Measure current growth score and future appreciation trend."""
    scores = plot.get("scores", {})
    forecast = plot.get("forecast_scores", {})

    current = scores.get("growthScore", 50)

    trend = buildTrend(
        current,
        forecast.get("1y", {}).get("growthScore", current),
        forecast.get("3y", {}).get("growthScore", current),
        forecast.get("5y", {}).get("growthScore", current),
    )

    return buildSimpleMetric(current, trend)


def computeDevelopmentReadiness(plot):
    """Estimate how ready a plot is for development."""
    features = plot.get("features", {})

    permit_growth = features.get("permitGrowth", 0)
    transit_score = features.get("transitScore", 0)

    score = clamp(60 + (permit_growth * 20) + (transit_score * 20))

    trend = [score - 3, score - 1, score + 1, score]

    return buildSimpleMetric(round(score), trend)


def computeMarketStability(plot):
    """Estimate market stability from risk and population growth."""
    scores = plot.get("scores", {})
    features = plot.get("features", {})

    risk = scores.get("riskScore", 50)
    population = features.get("populationGrowth", 0)

    score = clamp(100 - (risk * 0.7) + ((1 + population) * 20))

    trend = [score - 2, score - 1, score + 1, score]

    return buildSimpleMetric(round(score), trend)


def computeFamilyDemand(plot):
    """Estimate family demand using income, transit, and population signals."""
    features = plot.get("features", {})

    income = features.get("incomeScore", 0)
    transit = features.get("transitScore", 0)
    population = features.get("populationGrowth", 0)

    score = clamp(
        50
        + (income * 30)
        + (transit * 10)
        + (population * 20)
    )

    trend = [score - 3, score - 1, score + 1, score]

    return buildSimpleMetric(round(score), trend)


def computeCommercialExpansion(plot):
    """Estimate commercial expansion potential."""
    features = plot.get("features", {})

    permit = features.get("permitGrowth", 0)
    transit = features.get("transitScore", 0)
    population = features.get("populationGrowth", 0)

    score = clamp(
        50
        + (permit * 25)
        + (transit * 15)
        + (population * 20)
    )

    trend = [score - 3, score - 1, score + 1, score]

    return buildSimpleMetric(round(score), trend)


def buildMetrics(plot):
    """Build all metric groups for a single plot."""
    return {
        "investmentOpportunity": computeInvestmentOpportunity(plot),
        "appreciationPotential": computeAppreciationPotential(plot),
        "developmentReadiness": computeDevelopmentReadiness(plot),
        "marketStability": computeMarketStability(plot),
        "familyDemand": computeFamilyDemand(plot),
        "commercialExpansion": computeCommercialExpansion(plot),
    }


def buildMetricsAll(plots):
    """Attach metrics to every plot in the list."""
    for plot in plots:
        plot["metrics"] = buildMetrics(plot)
    return plots