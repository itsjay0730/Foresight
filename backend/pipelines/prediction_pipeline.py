from __future__ import annotations
from typing import Any, List, Dict
from utils import saveJson, loadJson
from pipelines.feature_builder import buildFeaturesAll
from pipelines.scoring_model import buildScoresAll
from pipelines.forecast_model import forecastAllPlots
from config import FINAL_PLOTS_FILE, OUTPUT_DIR

#where predictions will be saved
PREDICTIONS_FILE = OUTPUT_DIR / "predicted_plots.json"

#load base data from previous pipeline
def loadBaseData() -> List[Dict[str, Any]]:
    data = loadJson(FINAL_PLOTS_FILE)
    return data or []

#build model features
def buildFeatures(data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return buildFeaturesAll(data)

#compute scoring metrics
def buildScores(data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return buildScoresAll(data)

#run prediction model
def buildPredictions(data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return forecastAllPlots(data)

#save predictions to output file
def savePredictions(data: List[Dict[str, Any]]) -> None:
    saveJson(data, PREDICTIONS_FILE)

#full prediction pipeline
def runPredictionPipeline() -> List[Dict[str, Any]]:
    print("[Prediction] Loading base data...")
    data = loadBaseData()

    print("[Prediction] Building features...")
    data = buildFeatures(data)

    print("[Prediction] Building scores...")
    data = buildScores(data)

    print("[Prediction] Running forecasts...")
    data = buildPredictions(data)

    print("[Prediction] Saving predictions...")
    savePredictions(data)

    print(f"[Prediction] Completed. Total plots: {len(data)}")

    return data


if __name__ == "__main__":
    results = runPredictionPipeline()

    if results:
        print("[Prediction] Sample prediction:")
        print(results[0])