# Fetch Plots
# ↓
# Fetch Sub Data (crime, permits, income, population, transit)
# ↓
# Attach Data
# ↓
# Normalize and flatten
# ↓
# Save clean dataset
# ↓
# Send to scoring engine later
from __future__ import annotations

import json
from typing import Any

import pandas as pd

from config import ENRICHED_PLOTS_FILE, FINAL_PLOTS_CSV, FINAL_PLOTS_FILE
from data.fetch_crime import fetchCrime
from data.fetch_income import fetchIncome
from data.fetch_permits import fetchPermits
from data.fetch_plots import fetchPlots
from data.fetch_population import fetchPopulation
from data.fetch_transit import fetchTransit
from data.normalize import normalizePlots
from utils import saveJson


def enrichPlot(plot: dict[str, Any]) -> dict[str, Any]:
    """
    Attach all sub-data to one plot.
    """
    enriched = dict(plot)

    enriched["crime"] = fetchCrime(enriched)
    enriched["permits"] = fetchPermits(enriched)
    enriched["income"] = fetchIncome(enriched)
    enriched["population"] = fetchPopulation(enriched)
    enriched["transit"] = fetchTransit(enriched)

    return enriched


def runPipeline() -> list[dict[str, Any]]:
    """
    Full pipeline flow:
    1. Fetch plots
    2. Fetch sub-data for each plot
    3. Save enriched raw output
    4. Normalize into final flat dataset
    5. Save final JSON + CSV
    """
    plots = fetchPlots()
    print(f"[runPipeline] Fetched {len(plots)} base plots")

    enrichedPlots: list[dict[str, Any]] = []
    total = len(plots)

    for idx, plot in enumerate(plots, start=1):
        print(f"[runPipeline] Enriching plot {idx}/{total} -> {plot.get('id')}")
        enriched = enrichPlot(plot)
        enrichedPlots.append(enriched)

    saveJson(enrichedPlots, ENRICHED_PLOTS_FILE)
    print(f"[runPipeline] Saved enriched plots to {ENRICHED_PLOTS_FILE}")

    finalPlots = normalizePlots(enrichedPlots)
    saveJson(finalPlots, FINAL_PLOTS_FILE)
    print(f"[runPipeline] Saved final JSON to {FINAL_PLOTS_FILE}")

    df = pd.DataFrame(finalPlots)
    df.to_csv(FINAL_PLOTS_CSV, index=False)
    print(f"[runPipeline] Saved final CSV to {FINAL_PLOTS_CSV}")

    print(f"[runPipeline] Final normalized plot count: {len(finalPlots)}")
    return finalPlots


if __name__ == "__main__":
    results = runPipeline()
    if results:
        print("[runPipeline] Sample final record:")
        print(json.dumps(results[0], indent=2))