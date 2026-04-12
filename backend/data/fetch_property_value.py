from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from config import (
    COOK_COUNTY_ASSESSED_VALUES_API,
    COOK_COUNTY_PARCEL_ADDRESSES_API,
    COOK_COUNTY_PARCEL_SALES_API,
)
from utils import safeGet, safeInt


def _findValue(row: dict[str, Any], candidates: list[str]) -> Any:
    lowerMap = {str(key).lower(): value for key, value in row.items()}

    for candidate in candidates:
        if candidate.lower() in lowerMap:
            return lowerMap[candidate.lower()]

    return None


def _cleanPin(value: Any) -> str | None:
    if value is None:
        return None

    text = str(value).strip()
    if not text:
        return None

    cleaned = "".join(ch for ch in text if ch.isdigit())

    if len(cleaned) >= 10:
        return cleaned

    return text


def _safeDate(value: Any) -> str | None:
    if value is None:
        return None

    text = str(value).strip()
    if not text:
        return None

    return text


def _parseYear(value: Any) -> int | None:
    try:
        if value is None or value == "":
            return None
        return int(str(value)[:4])
    except (TypeError, ValueError):
        return None


def _ownershipDurationYears(lastSaleDate: str | None) -> float | None:
    if not lastSaleDate:
        return None

    text = lastSaleDate[:10]

    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%Y/%m/%d"):
        try:
            saleDate = datetime.strptime(text, fmt)
            deltaDays = (datetime.now(timezone.utc).replace(tzinfo=None) - saleDate).days
            return round(deltaDays / 365.25, 2)
        except ValueError:
            continue

    return None


def _fetchAddressByPin(pin: str) -> dict[str, Any] | None:
    rows = safeGet(
        COOK_COUNTY_PARCEL_ADDRESSES_API,
        params={
            "$limit": 1,
            "$where": f"pin='{pin}'",
        },
    )
    return rows[0] if rows else None


def _fetchAssessedValuesByPin(pin: str) -> list[dict[str, Any]]:
    rows = safeGet(
        COOK_COUNTY_ASSESSED_VALUES_API,
        params={
            "$limit": 10,
            "$where": f"pin='{pin}'",
            "$order": "year DESC",
        },
    )
    return rows or []


def _fetchSalesByPin(pin: str) -> list[dict[str, Any]]:
    rows = safeGet(
        COOK_COUNTY_PARCEL_SALES_API,
        params={
            "$limit": 10,
            "$where": f"pin='{pin}'",
            "$order": "sale_date DESC",
        },
    )
    return rows or []


def _extractBestAssessedValueRow(rows: list[dict[str, Any]]) -> dict[str, Any] | None:
    return rows[0] if rows else None


def _extractBestSaleRow(rows: list[dict[str, Any]]) -> dict[str, Any] | None:
    return rows[0] if rows else None


def _buildFullAddress(addressRow: dict[str, Any] | None) -> str | None:
    if not addressRow:
        return None

    addr1 = _findValue(
        addressRow,
        [
            "prop_address_full",
            "property_address",
            "situs_address",
            "address",
            "street_address",
            "site_address",
        ],
    )
    city = _findValue(
        addressRow,
        [
            "prop_address_city_name",
            "property_city",
            "city",
        ],
    )
    state = _findValue(
        addressRow,
        [
            "prop_address_state",
            "property_state",
            "state",
        ],
    )
    zipCode = _findValue(
        addressRow,
        [
            "prop_address_zipcode_1",
            "property_zip",
            "zip",
            "zip_code",
        ],
    )

    parts = [str(x).strip() for x in [addr1, city, state, zipCode] if x not in (None, "")]
    return ", ".join(parts) if parts else None


def fetchPropertyValue(plot: dict[str, Any]) -> dict[str, Any]:
    pin = (
        plot.get("pin")
        or plot.get("apn")
        or plot.get("parcel_number")
        or plot.get("parcel_id")
        or plot.get("id")
    )

    pin = _cleanPin(pin)

    empty = {
        "full_address": None,
        "assessed_value": None,
        "land_assessed_value": None,
        "building_assessed_value": None,
        "assessed_value_year": None,
        "last_sale_price": None,
        "last_sale_date": None,
        "ownership_duration_years": None,
        "sale_count_known": 0,
    }

    if not pin:
        return empty

    try:
        addressRow = _fetchAddressByPin(pin)
        assessedRows = _fetchAssessedValuesByPin(pin)
        salesRows = _fetchSalesByPin(pin)

        assessedRow = _extractBestAssessedValueRow(assessedRows)
        saleRow = _extractBestSaleRow(salesRows)

        fullAddress = _buildFullAddress(addressRow)

        landAssessedValue = None
        buildingAssessedValue = None
        assessedValue = None
        assessedValueYear = None

        if assessedRow:
            assessedValueYear = _parseYear(_findValue(assessedRow, ["year", "tax_year"]))

        lastSalePrice = None
        lastSaleDate = None

        if saleRow:
            lastSalePrice = safeInt(
                _findValue(
                    saleRow,
                    [
                        "sale_price",
                        "price",
                        "last_sale_price",
                    ],
                )
            )
            lastSaleDate = _safeDate(
                _findValue(
                    saleRow,
                    [
                        "sale_date",
                        "date_of_sale",
                        "last_sale_date",
                    ],
                )
            )

        return {
            "full_address": fullAddress,
            "assessed_value": assessedValue,
            "land_assessed_value": landAssessedValue,
            "building_assessed_value": buildingAssessedValue,
            "assessed_value_year": assessedValueYear,
            "last_sale_price": lastSalePrice,
            "last_sale_date": lastSaleDate,
            "ownership_duration_years": _ownershipDurationYears(lastSaleDate),
            "sale_count_known": len(salesRows),
        }

    except Exception as exc:
        print(f"[fetchPropertyValue] Failed for pin {pin}: {exc}")
        return empty


if __name__ == "__main__":
    samplePlot = {
        "pin": "17032000661098",
    }
    result = fetchPropertyValue(samplePlot)
    print(result)