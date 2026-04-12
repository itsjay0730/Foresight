# Foresight

Foresight is a geospatial real estate intelligence platform for analyzing Chicago parcel opportunities across investment and housing lenses. It combines data enrichment, forecasting, scoring, and a map-based frontend to help surface high-potential properties and neighborhoods.

## What it does

Foresight processes parcel-level records and enriches them with signals such as:

- crime and safety trends
- permit activity and development momentum
- demographics and population growth
- transit accessibility
- schools, amenities, and nearby points of interest
- ownership and property history
- housing market signals including rent levels, rent growth, and sales momentum

It then generates:

- normalized parcel datasets
- forecasted 1-year, 3-year, and 5-year outlooks
- investment, growth, risk, and final scores
- housing-specific scoring views
- neighborhood summaries and map-ready records
- optional AI-generated insights

## Project structure

### Backend

The backend is responsible for fetching, enriching, forecasting, scoring, and exporting data.

**Key folders:**

- `backend/data/` — raw fetchers and data utilities
- `backend/data_sources/` — source files such as Zillow housing CSVs
- `backend/models/` — forecasting, feature engineering, scoring, metrics, and LLM logic
- `backend/pipelines/` — end-to-end fetch and prediction pipelines
- `backend/output/` — generated JSON and CSV outputs
- `backend/api/` — API routes such as map data delivery

**Important backend outputs:**

- `raw_plots.json`
- `enriched_plots.json`
- `final_plots.json`
- `predicted_plots.json`
- `final_plots.csv`

### Frontend

The frontend is a Next.js app that visualizes parcel and neighborhood intelligence on an interactive map.

**Key folders:**

- `frontend/src/app/` — main app entry and page layout
- `frontend/src/components/` — command bar, map, panels, modals, overlays
- `frontend/src/data/` — transformation layer between backend JSON and frontend models
- `frontend/src/lib/` — shared helpers
- `frontend/public/` — public assets

## Core workflow

### 1. Fetch base plot data

The backend pulls parcel candidates and supporting records.

### 2. Enrich each plot

Each plot is enriched with surrounding signals such as:

- nearby crime counts
- permits
- transit stops
- demographics
- schools
- amenities
- POI density
- housing market data

### 3. Build features

Feature engineering converts raw values into normalized signals used for scoring and forecasting.

### 4. Forecast

The system generates future outlooks for multiple horizons, especially:

- 1 year
- 3 years
- 5 years

### 5. Score

Each parcel gets scores such as:

- investment score
- growth score
- risk score
- final score
- housing rent score

### 6. Export

The backend saves map-ready output files used by the frontend.

### 7. Visualize

The frontend loads the parcel dataset, renders it on the map, and allows switching between investment and housing views.

## Investment vs Housing mode

Foresight currently supports two frontend perspectives.

### Investment mode

Uses parcel-level opportunity scoring focused on overall investment attractiveness.

### Housing mode

Uses the same parcel dataset but re-scores parcels using housing market signals like:

- ZIP rent index
- ZIP rent growth
- metro rent growth
- sales count growth

This allows the app to show a housing-oriented view without requiring a completely separate parcel file.

## Forecast horizons

The system supports forecast-aware views for:

- 1Y
- 3Y
- 5Y

These values are used both in backend outputs and frontend displays.

## Running the backend

From the `backend` directory:
python -m pipelines.fetch_pipeline
python -m pipelines.prediction_pipeline

Typical outputs will be written to:
	•	backend/output/final_plots.json
	•	backend/output/predicted_plots.json
	•	backend/output/final_plots.csv

Running the frontend
From the frontend directory:
npm install
npm run dev

The app will usually run at:
http://localhost:3000
