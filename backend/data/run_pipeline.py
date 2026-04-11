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
from pathlib import Path
from typing import Any

import pandas as pd

from config import ENRICHED_PLOTS_FILE, FINAL_PLOTS_CSV, FINAL_PLOTS_FILE
from data.fetch_crime import fetch_crime
from data.fetch_income import fetch_income
from data.fetch_permits import fetch_permits
from data.fetch_plots import fetch_plots
from data.fetch_population import fetch_population
from data.fetch_transit import fetch_transit
from data.normalize import normalize
from utils import save_json


def enrich_plot(plot: dict[str, Any]) -> dict[str, Any]:
    """
    Attach all sub-data to one plot.
    """
    enriched = dict(plot)

    enriched["crime"] = fetch_crime(enriched)
    enriched["permits"] = fetch_permits(enriched)
    enriched["income"] = fetch_income(enriched)
    enriched["population"] = fetch_population(enriched)
    enriched["transit"] = fetch_transit(enriched)

    return enriched


def run_pipeline() -> list[dict[str, Any]]:
    """
    Full pipeline flow:
    1. Fetch plots
    2. Fetch sub-data for each plot
    3. Save enriched raw output
    4. Normalize into final flat dataset
    5. Save final JSON + CSV
    """
    plots = fetch_plots()
    print(f"[run_pipeline] Fetched {len(plots)} base plots")

    enriched_plots: list[dict[str, Any]] = []
    total = len(plots)

    for idx, plot in enumerate(plots, start=1):
        print(f"[run_pipeline] Enriching plot {idx}/{total} -> {plot.get('id')}")
        enriched = enrich_plot(plot)
        enriched_plots.append(enriched)

    save_json(enriched_plots, ENRICHED_PLOTS_FILE)
    print(f"[run_pipeline] Saved enriched plots to {ENRICHED_PLOTS_FILE}")

    final_plots = normalize(enriched_plots)
    save_json(final_plots, FINAL_PLOTS_FILE)
    print(f"[run_pipeline] Saved final JSON to {FINAL_PLOTS_FILE}")

    df = pd.DataFrame(final_plots)
    df.to_csv(FINAL_PLOTS_CSV, index=False)
    print(f"[run_pipeline] Saved final CSV to {FINAL_PLOTS_CSV}")

    print(f"[run_pipeline] Final normalized plot count: {len(final_plots)}")
    return final_plots


if __name__ == "__main__":
    results = run_pipeline()
    if results:
        print("[run_pipeline] Sample final record:")
        print(json.dumps(results[0], indent=2))