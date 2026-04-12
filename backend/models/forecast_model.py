from __future__ import annotations
from typing import Any, List
from sklearn.linear_model import LinearRegression
import numpy as np


# build time series arrays
def _extractSeries(history: List[dict[str, Any]], key: str) -> tuple[np.ndarray, np.ndarray]:
    years = []
    values = []

    for item in history:
        value = item.get(key)
        year = item.get("year")

        if value is None:
            continue

        years.append(year)
        values.append(value)

    if len(years) < 2:
        return None, None

    X = np.array(years).reshape(-1, 1)
    y = np.array(values)

    return X, y


# train linear regression model
def _trainModel(history: List[dict[str, Any]], key: str):
    X, y = _extractSeries(history, key)

    if X is None:
        return None

    model = LinearRegression()
    model.fit(X, y)

    return model


# predict future values
def _predictFuture(model, startYear: int):
    years = np.array([
        startYear + 1,
        startYear + 3,
        startYear + 5
    ]).reshape(-1, 1)

    predictions = model.predict(years)

    return {
        "1y": float(predictions[0]),
        "3y": float(predictions[1]),
        "5y": float(predictions[2])
    }


# forecast one plot
def forecastPlot(plot: dict[str, Any]) -> dict[str, Any]:

    crimeHistory = plot.get("crime_history", [])
    permitHistory = plot.get("permit_history", [])
    populationHistory = plot.get("population_history", [])

    result = {}

    # crime prediction
    crimeModel = _trainModel(crimeHistory, "crime_count")
    if crimeModel:
        latestYear = crimeHistory[-1]["year"]
        result["crime_forecast"] = _predictFuture(crimeModel, latestYear)

    # permit prediction
    permitModel = _trainModel(permitHistory, "permit_count")
    if permitModel:
        latestYear = permitHistory[-1]["year"]
        result["permit_forecast"] = _predictFuture(permitModel, latestYear)

    # population prediction
    populationModel = _trainModel(populationHistory, "population")
    if populationModel:
        latestYear = populationHistory[-1]["year"]
        result["population_forecast"] = _predictFuture(populationModel, latestYear)

    return result


# forecast all plots
def forecastAll(plots: List[dict[str, Any]]) -> List[dict[str, Any]]:
    results = []

    for plot in plots:
        forecast = forecastPlot(plot)

        combined = {
            **plot,
            "forecast": forecast
        }

        results.append(combined)

    return results