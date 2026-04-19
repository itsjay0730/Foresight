from __future__ import annotations

from typing import Any


def _toFloat(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except Exception:
        return default


def clamp(value: float, min_val: float = 0, max_val: float = 100) -> float:
    """Keep a number within a fixed range."""
    return max(min_val, min(max_val, value))


def _roundMetricValue(value: Any) -> Any:
    return round(value, 2) if isinstance(value, float) else value


def buildTrend(current: float, future1: float, future3: float, future5: float) -> list[float]:
    """Build a standard 4-point trend list."""
    return [current, future1, future3, future5]


def buildSimpleMetric(score: float, trend: list[float]) -> dict[str, Any]:
    """Return a metric object with score, change, and trend."""
    cleanTrend = [_toFloat(t) for t in trend]
    change = cleanTrend[-1] - cleanTrend[0]

    return {
        "score": _roundMetricValue(score),
        "change": round(change, 2),
        "trend": [round(t, 2) for t in cleanTrend],
    }


def computeInvestmentOpportunity(plot: dict[str, Any]) -> dict[str, Any]:
    """Measure current investment score and future forecast trend."""
    scores = plot.get("scores", {}) or {}
    forecast = plot.get("forecast_scores", {}) or {}

    current = _toFloat(scores.get("investmentScore"), 50.0)

    trend = buildTrend(
        current,
        _toFloat(forecast.get("1y", {}).get("investmentScore"), current),
        _toFloat(forecast.get("3y", {}).get("investmentScore"), current),
        _toFloat(forecast.get("5y", {}).get("investmentScore"), current),
    )

    return buildSimpleMetric(current, trend)


def computeAppreciationPotential(plot: dict[str, Any]) -> dict[str, Any]:
    """Measure current growth score and future appreciation trend."""
    scores = plot.get("scores", {}) or {}
    forecast = plot.get("forecast_scores", {}) or {}

    current = _toFloat(scores.get("growthScore"), 50.0)

    trend = buildTrend(
        current,
        _toFloat(forecast.get("1y", {}).get("growthScore"), current),
        _toFloat(forecast.get("3y", {}).get("growthScore"), current),
        _toFloat(forecast.get("5y", {}).get("growthScore"), current),
    )

    return buildSimpleMetric(current, trend)


def computeDevelopmentReadiness(plot: dict[str, Any]) -> dict[str, Any]:
    """Estimate how ready a plot is for development."""
    features = plot.get("features", {}) or {}

    permitGrowth = _toFloat(features.get("permitGrowth"))
    transitScore = _toFloat(features.get("transitScore"))

    score = clamp(60 + (permitGrowth * 20) + (transitScore * 20))
    trend = [score - 3, score - 1, score + 1, score]

    return buildSimpleMetric(round(score, 2), trend)


def computeMarketStability(plot: dict[str, Any]) -> dict[str, Any]:
    """Estimate market stability from risk and population growth."""
    scores = plot.get("scores", {}) or {}
    features = plot.get("features", {}) or {}

    risk = _toFloat(scores.get("riskScore"), 50.0)
    populationGrowth = _toFloat(features.get("populationGrowth"))

    score = clamp(100 - (risk * 0.7) + ((1 + populationGrowth) * 20))
    trend = [score - 2, score - 1, score + 1, score]

    return buildSimpleMetric(round(score, 2), trend)


def computeFamilyDemand(plot: dict[str, Any]) -> dict[str, Any]:
    """Estimate family demand using income, transit, and population signals."""
    features = plot.get("features", {}) or {}

    incomeScore = _toFloat(features.get("incomeScore"))
    transitScore = _toFloat(features.get("transitScore"))
    populationGrowth = _toFloat(features.get("populationGrowth"))

    score = clamp(
        50
        + (incomeScore * 30)
        + (transitScore * 10)
        + (populationGrowth * 20)
    )

    trend = [score - 3, score - 1, score + 1, score]

    return buildSimpleMetric(round(score, 2), trend)


def computeCommercialExpansion(plot: dict[str, Any]) -> dict[str, Any]:
    """Estimate commercial expansion potential."""
    features = plot.get("features", {}) or {}

    permitGrowth = _toFloat(features.get("permitGrowth"))
    transitScore = _toFloat(features.get("transitScore"))
    populationGrowth = _toFloat(features.get("populationGrowth"))

    score = clamp(
        50
        + (permitGrowth * 25)
        + (transitScore * 15)
        + (populationGrowth * 20)
    )

    trend = [score - 3, score - 1, score + 1, score]

    return buildSimpleMetric(round(score, 2), trend)


def buildMetrics(plot: dict[str, Any]) -> dict[str, Any]:
    """Build all metric groups for a single plot."""
    return {
        "investmentOpportunity": computeInvestmentOpportunity(plot),
        "appreciationPotential": computeAppreciationPotential(plot),
        "developmentReadiness": computeDevelopmentReadiness(plot),
        "marketStability": computeMarketStability(plot),
        "familyDemand": computeFamilyDemand(plot),
        "commercialExpansion": computeCommercialExpansion(plot),
    }


def buildMetricsAll(plots: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Attach metrics to every plot in the list."""
    for plot in plots:
        plot["metrics"] = buildMetrics(plot)
    return plots