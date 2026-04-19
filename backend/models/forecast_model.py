from __future__ import annotations

from typing import Any

import numpy as np
from sklearn.linear_model import LinearRegression

from models.scoring_model import buildScoresAll


FORECAST_HORIZONS = (1, 3, 5)


def _toFloat(value: Any) -> float | None:
    try:
        if value is None:
            return None
        return float(value)
    except Exception:
        return None


def _toInt(value: Any) -> int | None:
    try:
        if value is None:
            return None
        return int(value)
    except Exception:
        return None


def _emptyForecast() -> dict[str, float | None]:
    return {
        "1y": None,
        "3y": None,
        "5y": None,
    }


def _buildGrowthFallback(baseValue: float, annualGrowthRate: float) -> dict[str, float]:
    return {
        "1y": round(float(baseValue * ((1 + annualGrowthRate) ** 1)), 2),
        "3y": round(float(baseValue * ((1 + annualGrowthRate) ** 3)), 2),
        "5y": round(float(baseValue * ((1 + annualGrowthRate) ** 5)), 2),
    }


def extractSeries(
    history: list[dict[str, Any]],
    key: str,
) -> tuple[np.ndarray | None, np.ndarray | None]:
    years: list[int] = []
    values: list[float] = []

    for item in history:
        year = _toInt(item.get("year"))
        value = _toFloat(item.get(key))

        if year is None or value is None:
            continue

        years.append(year)
        values.append(value)

    if len(years) < 2:
        return None, None

    X = np.array(years, dtype=float).reshape(-1, 1)
    y = np.array(values, dtype=float)

    return X, y


def trainModel(
    history: list[dict[str, Any]],
    key: str,
) -> LinearRegression | None:
    X, y = extractSeries(history, key)

    if X is None or y is None:
        return None

    model = LinearRegression()
    model.fit(X, y)
    return model


def _getLatestYear(history: list[dict[str, Any]]) -> int | None:
    validYears = [_toInt(item.get("year")) for item in history]
    validYears = [year for year in validYears if year is not None]

    if not validYears:
        return None

    return max(validYears)


def predictFuture(
    model: LinearRegression,
    startYear: int,
) -> dict[str, float]:
    years = np.array(
        [startYear + horizon for horizon in FORECAST_HORIZONS],
        dtype=float,
    ).reshape(-1, 1)

    predictions = model.predict(years)

    return {
        "1y": round(float(predictions[0]), 2),
        "3y": round(float(predictions[1]), 2),
        "5y": round(float(predictions[2]), 2),
    }


def _addForecastIfPossible(
    result: dict[str, Any],
    forecastKey: str,
    history: list[dict[str, Any]],
    valueKey: str,
) -> None:
    model = trainModel(history, valueKey)
    latestYear = _getLatestYear(history)

    if model is None or latestYear is None:
        return

    result[forecastKey] = predictFuture(model, latestYear)


def forecastPlot(plot: dict[str, Any]) -> dict[str, Any]:
    crimeHistory = plot.get("crime_history", []) or []
    permitHistory = plot.get("permit_history", []) or []
    populationHistory = plot.get("population_history", []) or []
    incomeHistory = plot.get("income_history", []) or []

    result: dict[str, Any] = {}

    _addForecastIfPossible(
        result=result,
        forecastKey="crime_forecast",
        history=crimeHistory,
        valueKey="crime_count",
    )
    _addForecastIfPossible(
        result=result,
        forecastKey="permit_forecast",
        history=permitHistory,
        valueKey="permit_count",
    )
    _addForecastIfPossible(
        result=result,
        forecastKey="population_forecast",
        history=populationHistory,
        valueKey="population",
    )
    _addForecastIfPossible(
        result=result,
        forecastKey="income_forecast",
        history=incomeHistory,
        valueKey="income",
    )

    if "income_forecast" not in result:
        baseIncome = _toFloat(plot.get("income"))
        if baseIncome is not None:
            result["income_forecast"] = _buildGrowthFallback(
                baseIncome,
                annualGrowthRate=0.01,
            )

    return result


def forecastAllPlots(plots: list[dict[str, Any]]) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []

    for plot in plots:
        forecast = forecastPlot(plot)
        combined = {
            **plot,
            "forecast": forecast,
        }
        results.append(combined)

    return buildScoresAll(results)