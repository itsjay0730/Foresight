from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

import pandas as pd

from config import BASE_DIR


ZILLOW_DIR = Path(BASE_DIR) / "data_sources" / "zillow"

METRO_SALES_CSV = ZILLOW_DIR / "Metro_sales_count_now_uc_sfrcondo_month.csv"
METRO_ZORI_CSV = ZILLOW_DIR / "Metro_zori_uc_sfrcondomfr_sm_month.csv"
ZIP_ZORI_CSV = ZILLOW_DIR / "Zip_zori_uc_sfrcondomfr_sm_month.csv"

CHICAGO_REGION_CANDIDATES = {
    "Chicago, IL",
    "Chicago-Naperville-Elgin, IL-IN-WI",
}


def _emptyHousingMarket() -> dict[str, Any]:
    return {
        "market_scope": "zip_plus_metro",
        "zip_rent_index_latest": None,
        "zip_rent_growth_1y": None,
        "zip_rent_history": [],
        "metro_rent_index_latest": None,
        "metro_rent_growth_1y": None,
        "metro_rent_history": [],
        "sales_count_latest": None,
        "sales_count_growth_1y": None,
        "sales_count_history": [],
    }


@lru_cache(maxsize=8)
def _loadCsvCached(pathStr: str) -> pd.DataFrame | None:
    path = Path(pathStr)

    if not path.exists():
        print(f"[fetchHousingMarket] Missing file: {path}")
        return None

    try:
        return pd.read_csv(path)
    except Exception as exc:
        print(f"[fetchHousingMarket] Failed reading {path.name}: {exc}")
        return None


def _loadCsv(path: Path) -> pd.DataFrame | None:
    return _loadCsvCached(str(path.resolve()))


@lru_cache(maxsize=8)
def _getDateColumnsCached(columnsTuple: tuple[str, ...]) -> tuple[str, ...]:
    dateCols: list[str] = []

    for col in columnsTuple:
        try:
            pd.to_datetime(col, errors="raise")
            dateCols.append(col)
        except Exception:
            continue

    return tuple(sorted(dateCols, key=lambda c: pd.to_datetime(c)))


def _getDateColumns(df: pd.DataFrame) -> list[str]:
    return list(_getDateColumnsCached(tuple(str(c) for c in df.columns)))


def _toFloat(value: Any) -> float | None:
    try:
        if pd.isna(value):
            return None
        return float(value)
    except Exception:
        return None


def _buildHistory(row: pd.Series, dateCols: list[str], limit: int = 24) -> list[dict[str, Any]]:
    history: list[dict[str, Any]] = []

    for col in dateCols[-limit:]:
        value = _toFloat(row.get(col))
        if value is None:
            continue

        history.append(
            {
                "month": str(pd.to_datetime(col).date())[:7],
                "value": round(value, 2),
            }
        )

    return history


def _latestValue(row: pd.Series, dateCols: list[str]) -> float | None:
    for col in reversed(dateCols):
        value = _toFloat(row.get(col))
        if value is not None:
            return value
    return None


def _valueOneYearAgo(row: pd.Series, dateCols: list[str]) -> float | None:
    validValues: list[float] = []

    for col in dateCols:
        value = _toFloat(row.get(col))
        if value is not None:
            validValues.append(value)

    if len(validValues) < 13:
        return None

    return validValues[-13]


def _growth1y(latest: float | None, prior: float | None) -> float | None:
    if latest is None or prior is None or prior == 0:
        return None
    return round((latest - prior) / prior, 4)


def _findChicagoMetroRow(df: pd.DataFrame) -> pd.Series | None:
    if "RegionName" not in df.columns:
        print("[fetchHousingMarket] RegionName column missing for metro file")
        return None

    regionNames = df["RegionName"].astype(str).str.strip()

    for candidate in CHICAGO_REGION_CANDIDATES:
        match = df[regionNames == candidate]
        if not match.empty:
            return match.iloc[0]

    match = df[regionNames.str.contains("Chicago", case=False, na=False)]
    if not match.empty:
        return match.iloc[0]

    print("[fetchHousingMarket] No Chicago metro row found")
    return None


def _findZipRow(df: pd.DataFrame, zipCode: str) -> pd.Series | None:
    if "RegionName" not in df.columns:
        print("[fetchHousingMarket] RegionName column missing for ZIP file")
        return None

    match = df[df["RegionName"].astype(str).str.strip() == zipCode]
    if not match.empty:
        return match.iloc[0]

    return None


def _extractSeriesInfoFromRow(
    row: pd.Series | None,
    df: pd.DataFrame | None,
) -> tuple[float | None, float | None, list[dict[str, Any]]]:
    if row is None or df is None:
        return None, None, []

    dateCols = _getDateColumns(df)
    if not dateCols:
        print("[fetchHousingMarket] No date columns found")
        return None, None, []

    latest = _latestValue(row, dateCols)
    prior = _valueOneYearAgo(row, dateCols)
    growth = _growth1y(latest, prior)
    history = _buildHistory(row, dateCols)

    latestRounded = round(latest, 2) if latest is not None else None
    return latestRounded, growth, history


def fetchHousingMarket(plot: dict[str, Any]) -> dict[str, Any]:
    empty = _emptyHousingMarket()

    zipCode = str(plot.get("zip", "")).strip()
    if not zipCode or zipCode == "Unknown":
        zipCode = ""

    metroSalesDf = _loadCsv(METRO_SALES_CSV)
    metroRentDf = _loadCsv(METRO_ZORI_CSV)
    zipRentDf = _loadCsv(ZIP_ZORI_CSV)

    zipRentLatest, zipRentGrowth1y, zipRentHistory = (None, None, [])
    metroRentLatest, metroRentGrowth1y, metroRentHistory = (None, None, [])
    salesLatest, salesGrowth1y, salesHistory = (None, None, [])

    if zipRentDf is not None and zipCode:
        zipRow = _findZipRow(zipRentDf, zipCode)
        zipRentLatest, zipRentGrowth1y, zipRentHistory = _extractSeriesInfoFromRow(
            zipRow, zipRentDf
        )

    if metroRentDf is not None:
        metroRow = _findChicagoMetroRow(metroRentDf)
        metroRentLatest, metroRentGrowth1y, metroRentHistory = _extractSeriesInfoFromRow(
            metroRow, metroRentDf
        )

    if metroSalesDf is not None:
        metroSalesRow = _findChicagoMetroRow(metroSalesDf)
        salesLatest, salesGrowth1y, salesHistory = _extractSeriesInfoFromRow(
            metroSalesRow, metroSalesDf
        )

    return {
        "market_scope": "zip_plus_metro",
        "zip_rent_index_latest": zipRentLatest,
        "zip_rent_growth_1y": zipRentGrowth1y,
        "zip_rent_history": zipRentHistory,
        "metro_rent_index_latest": metroRentLatest,
        "metro_rent_growth_1y": metroRentGrowth1y,
        "metro_rent_history": metroRentHistory,
        "sales_count_latest": salesLatest,
        "sales_count_growth_1y": salesGrowth1y,
        "sales_count_history": salesHistory,
    }


if __name__ == "__main__":
    samplePlot = {
        "id": "test_plot",
        "zip": "60618",
        "neighborhood": "JEFFERSON PARK",
    }
    result = fetchHousingMarket(samplePlot)
    print(result)