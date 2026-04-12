import os
from pathlib import Path

# -----------------------------
# Base project paths
# -----------------------------
BACKEND_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BACKEND_DIR / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

# -----------------------------
# General settings
# -----------------------------
REQUEST_TIMEOUT = 20
PIPELINE_LIMIT = 30
SEARCH_RADIUS_MILES = 0.5

# -----------------------------
# API endpoints
# -----------------------------
CHICAGO_CRIME_API = os.getenv(
    "CHICAGO_CRIME_API",
    "https://data.cityofchicago.org/resource/ijzp-q8t2.json",
)

CHICAGO_BUILDING_PERMITS_API = os.getenv(
    "CHICAGO_BUILDING_PERMITS_API",
    "https://data.cityofchicago.org/resource/ydr8-5enu.json",
)

# Main lots source for MVP: City-Owned Land Inventory
CHICAGO_CITY_OWNED_LOTS_API = os.getenv(
    "CHICAGO_CITY_OWNED_LOTS_API",
    "https://data.cityofchicago.org/resource/aksk-kvfp.json",
)

# Generic alias used by the rest of the pipeline
CHICAGO_PLOTS_API = CHICAGO_CITY_OWNED_LOTS_API

# NEW: broader parcel universe source for better citywide coverage
COOK_COUNTY_PARCEL_UNIVERSE_API = os.getenv(
    "COOK_COUNTY_PARCEL_UNIVERSE_API",
    "https://datacatalog.cookcountyil.gov/resource/nj4t-kc8j.json",
)

# NEW: active business licenses for downtown / commercial activity signals
CHICAGO_BUSINESS_LICENSES_API = os.getenv(
    "CHICAGO_BUSINESS_LICENSES_API",
    "https://data.cityofchicago.org/resource/uupf-x98q.json",
)

# Updated CTA bus stops dataset
CTA_STOPS_API = os.getenv(
    "CTA_STOPS_API",
    "https://data.cityofchicago.org/resource/qs84-j7wh.json",
)

# Census / ACS
CENSUS_ACS_API = os.getenv(
    "CENSUS_ACS_API",
    "https://api.census.gov/data/2022/acs/acs5",
)

# -----------------------------
# API keys / tokens
# -----------------------------
SOCRATA_APP_TOKEN = os.getenv("SOCRATA_APP_TOKEN", "")
CENSUS_API_KEY = os.getenv("CENSUS_API_KEY", "")

# -----------------------------
# Output files
# -----------------------------
RAW_PLOTS_FILE = OUTPUT_DIR / "raw_plots.json"
ENRICHED_PLOTS_FILE = OUTPUT_DIR / "enriched_plots.json"
FINAL_PLOTS_FILE = OUTPUT_DIR / "final_plots.json"
FINAL_PLOTS_CSV = OUTPUT_DIR / "final_plots.csv"
PREDICTIONS_FILE = OUTPUT_DIR / "predicted_plots.json"