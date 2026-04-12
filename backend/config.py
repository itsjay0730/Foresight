import os
from pathlib import Path

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
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
PIPELINE_LIMIT = 50 # matches the 100-plot dataset shown in the map

# Search radius per feature type (in miles)
SEARCH_RADIUS_CRIME_MILES   = 0.5
SEARCH_RADIUS_TRANSIT_MILES = 0.25
SEARCH_RADIUS_PERMIT_MILES  = 0.25

OVERPASS_SLEEP_SECONDS = 3.0
OVERPASS_MAX_RETRIES = 4
OVERPASS_BACKOFF_SECONDS = 5.0
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

CHICAGO_CITY_OWNED_LOTS_API = os.getenv(
    "CHICAGO_CITY_OWNED_LOTS_API",
    "https://data.cityofchicago.org/resource/aksk-kvfp.json",
)

CHICAGO_PLOTS_API = CHICAGO_CITY_OWNED_LOTS_API

COOK_COUNTY_PARCEL_UNIVERSE_API = os.getenv(
    "COOK_COUNTY_PARCEL_UNIVERSE_API",
    "https://datacatalog.cookcountyil.gov/resource/nj4t-kc8j.json",
)

CHICAGO_BUSINESS_LICENSES_API = os.getenv(
    "CHICAGO_BUSINESS_LICENSES_API",
    "https://data.cityofchicago.org/resource/uupf-x98q.json",
)

CTA_STOPS_API = os.getenv(
    "CTA_STOPS_API",
    "https://data.cityofchicago.org/resource/qs84-j7wh.json",
)

COOK_COUNTY_ASSESSED_VALUES_API = "https://datacatalog.cookcountyil.gov/resource/uzyt-m557.json"
COOK_COUNTY_RESIDENTIAL_IMPROVEMENTS_API = "https://datacatalog.cookcountyil.gov/resource/x54s-btds.json"
COOK_COUNTY_CONDO_CHARACTERISTICS_API = "https://datacatalog.cookcountyil.gov/resource/3r7i-mrz4.json"
# -----------------------------
# Census / ACS endpoints
# -----------------------------
CENSUS_ACS_2022_API = os.getenv(
    "CENSUS_ACS_2022_API",
    "https://api.census.gov/data/2022/acs/acs5",
)

CENSUS_ACS_2021_API = os.getenv(
    "CENSUS_ACS_2021_API",
    "https://api.census.gov/data/2021/acs/acs5",
)

CENSUS_ACS_2019_API = os.getenv(
    "CENSUS_ACS_2019_API",
    "https://api.census.gov/data/2019/acs/acs5",
)

# Chicago community area demographics (Socrata)
CHICAGO_ACS_COMMUNITY_AREA_API = os.getenv(
    "CHICAGO_ACS_COMMUNITY_AREA_API",
    "https://data.cityofchicago.org/resource/kn9c-c2s2.json",
)
COOK_COUNTY_PARCEL_SALES_API = os.getenv(
    "COOK_COUNTY_PARCEL_SALES_API",
    "https://datacatalog.cookcountyil.gov/resource/wvhk-k5uv.json",
)

COOK_COUNTY_ASSESSED_VALUES_API = os.getenv(
    "COOK_COUNTY_ASSESSED_VALUES_API",
    "https://datacatalog.cookcountyil.gov/resource/uzyt-m557.json",
)

COOK_COUNTY_PARCEL_ADDRESSES_API = os.getenv(
    "COOK_COUNTY_PARCEL_ADDRESSES_API",
    "https://datacatalog.cookcountyil.gov/resource/3723-97qp.json",
)
CHICAGO_SCHOOL_LOCATIONS_API = os.getenv(
    "CHICAGO_SCHOOL_LOCATIONS_API",
    "https://data.cityofchicago.org/resource/mv87-m4mi.json",
)

CHICAGO_SCHOOL_PROGRESS_API = os.getenv(
    "CHICAGO_SCHOOL_PROGRESS_API",
    "https://data.cityofchicago.org/resource/2dn2-x66j.json",

)
OVERPASS_API_URL = "https://overpass-api.de/api/interpreter"
SEARCH_RADIUS_AMENITIES_MILES = 0.5

# -----------------------------
# API keys / tokens
# -----------------------------
SOCRATA_APP_TOKEN = os.getenv("SOCRATA_APP_TOKEN", "")
CENSUS_API_KEY    = os.getenv("CENSUS_API_KEY", "")

# -----------------------------
# Output files
# -----------------------------
RAW_PLOTS_FILE      = OUTPUT_DIR / "raw_plots.json"
ENRICHED_PLOTS_FILE = OUTPUT_DIR / "enriched_plots.json"
FINAL_PLOTS_FILE    = OUTPUT_DIR / "final_plots.json"
FINAL_PLOTS_CSV     = OUTPUT_DIR / "final_plots.csv"
PREDICTIONS_FILE    = OUTPUT_DIR / "predicted_plots.json"