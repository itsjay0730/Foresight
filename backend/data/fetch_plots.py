from __future__ import annotations

from typing import Any

from config import (
    CHICAGO_BUILDING_PERMITS_API,
    CHICAGO_BUSINESS_LICENSES_API,
    CHICAGO_PLOTS_API,
    COOK_COUNTY_PARCEL_UNIVERSE_API,
    PIPELINE_LIMIT,
    RAW_PLOTS_FILE,
)
from utils import safeFloat, safeGet, safeInt, saveJson


TARGET_DOWNTOWN_ZIPS = {
    "60601", "60602", "60603", "60604", "60605", "60606", "60607", "60610", "60611", "60654"
}

TARGET_NORTH_CORE_ZIPS = {
    "60613", "60614", "60618", "60657"
}


def _cleanNeighborhood(value: Any) -> str:
    neighborhood = str(value).strip() if value is not None else "Unknown"
    if not neighborhood or neighborhood.isdigit():
        return "Unknown"
    return neighborhood.upper()


def _cleanZip(value: Any) -> str:
    if value is None:
        return "Unknown"
    zipCode = str(value).strip()
    return zipCode if zipCode else "Unknown"


def _normalizePrimaryPlot(raw: dict[str, Any], idx: int) -> dict[str, Any] | None:
    lat = (
        safeFloat(raw.get("latitude"))
        or safeFloat(raw.get("lat"))
        or safeFloat(raw.get("y"))
    )
    lng = (
        safeFloat(raw.get("longitude"))
        or safeFloat(raw.get("lng"))
        or safeFloat(raw.get("lon"))
        or safeFloat(raw.get("x"))
    )

    if lat is None or lng is None:
        return None

    neighborhood = _cleanNeighborhood(
        raw.get("community_area_name")
        or raw.get("neighborhood")
        or raw.get("community")
        or "Unknown"
    )

    zipCode = _cleanZip(
        raw.get("zip")
        or raw.get("zip_code")
        or raw.get("postal_code")
        or "Unknown"
    )

    parcelSize = (
        safeInt(raw.get("sq_ft"))
        or safeInt(raw.get("square_feet"))
        or safeInt(raw.get("parcel_size"))
        or 0
    )

    propertyType = (
        raw.get("property_type")
        or raw.get("building_type")
        or raw.get("land_use")
        or raw.get("status")
        or "opportunity_site"
    )

    zoning = (
        raw.get("zoning")
        or raw.get("zoning_classification")
        or raw.get("zone")
        or "unknown"
    )

    recordId = (
        raw.get("id")
        or raw.get("pin")
        or raw.get("parcel_id")
        or f"plot_{idx:03d}"
    )

    return {
        "id": str(recordId),
        "lat": lat,
        "lng": lng,
        "neighborhood": neighborhood,
        "zip": zipCode,
        "parcel_size": parcelSize,
        "property_type": str(propertyType),
        "zoning": str(zoning),
    }


def _normalizePermitCandidate(raw: dict[str, Any], idx: int) -> dict[str, Any] | None:
    lat = safeFloat(raw.get("latitude")) or safeFloat(raw.get("lat"))
    lng = (
        safeFloat(raw.get("longitude"))
        or safeFloat(raw.get("lng"))
        or safeFloat(raw.get("lon"))
    )

    if lat is None or lng is None:
        location = raw.get("location")
        if isinstance(location, dict):
            lat = lat or safeFloat(location.get("latitude"))
            lng = lng or safeFloat(location.get("longitude"))

    if lat is None or lng is None:
        return None

    zipCode = _cleanZip(
        raw.get("zip")
        or raw.get("zip_code")
        or raw.get("postal_code")
        or "Unknown"
    )

    neighborhood = _cleanNeighborhood(
        raw.get("community_area_name")
        or raw.get("neighborhood")
        or raw.get("community_area")
        or "Unknown"
    )

    zoning = (
        raw.get("zoning")
        or raw.get("zoning_classification")
        or raw.get("permit_type")
        or raw.get("work_description")
        or "unknown"
    )

    recordId = raw.get("id") or f"permit_candidate_{idx:03d}"

    return {
        "id": str(recordId),
        "lat": lat,
        "lng": lng,
        "neighborhood": neighborhood,
        "zip": zipCode,
        "parcel_size": 0,
        "property_type": "permit_candidate",
        "zoning": str(zoning),
    }


def _normalizeParcelCandidate(raw: dict[str, Any], idx: int) -> dict[str, Any] | None:
    lat = (
        safeFloat(raw.get("latitude"))
        or safeFloat(raw.get("lat"))
        or safeFloat(raw.get("y"))
    )
    lng = (
        safeFloat(raw.get("longitude"))
        or safeFloat(raw.get("lng"))
        or safeFloat(raw.get("lon"))
        or safeFloat(raw.get("x"))
    )

    if lat is None or lng is None:
        location = raw.get("location")
        if isinstance(location, dict):
            lat = lat or safeFloat(location.get("latitude"))
            lng = lng or safeFloat(location.get("longitude"))

    if lat is None or lng is None:
        return None

    zipCode = _cleanZip(
        raw.get("zip")
        or raw.get("zip_code")
        or raw.get("postal_code")
        or "Unknown"
    )

    neighborhood = _cleanNeighborhood(
        raw.get("community_area_name")
        or raw.get("neighborhood")
        or raw.get("township_name")
        or raw.get("community")
        or "Unknown"
    )

    parcelSize = (
        safeInt(raw.get("land_square_footage"))
        or safeInt(raw.get("square_feet"))
        or safeInt(raw.get("sq_ft"))
        or safeInt(raw.get("parcel_size"))
        or 0
    )

    zoning = (
        raw.get("class")
        or raw.get("property_class")
        or raw.get("land_use")
        or "parcel"
    )

    recordId = (
        raw.get("pin")
        or raw.get("parcel_id")
        or raw.get("id")
        or f"parcel_candidate_{idx:03d}"
    )

    return {
        "id": str(recordId),
        "lat": lat,
        "lng": lng,
        "neighborhood": neighborhood,
        "zip": zipCode,
        "parcel_size": parcelSize,
        "property_type": "parcel_candidate",
        "zoning": str(zoning),
    }


def _normalizeBusinessCandidate(raw: dict[str, Any], idx: int) -> dict[str, Any] | None:
    lat = safeFloat(raw.get("latitude"))
    lng = safeFloat(raw.get("longitude"))

    if lat is None or lng is None:
        location = raw.get("location")
        if isinstance(location, dict):
            lat = lat or safeFloat(location.get("latitude"))
            lng = lng or safeFloat(location.get("longitude"))

    if lat is None or lng is None:
        return None

    zipCode = _cleanZip(
        raw.get("zip_code")
        or raw.get("zip")
        or raw.get("postal_code")
        or "Unknown"
    )

    neighborhood = _cleanNeighborhood(
        raw.get("community_area_name")
        or raw.get("neighborhood")
        or raw.get("ward")
        or "Unknown"
    )

    zoning = (
        raw.get("license_description")
        or raw.get("business_activity")
        or "business_activity"
    )

    recordId = raw.get("id") or raw.get("license_id") or f"business_candidate_{idx:03d}"

    return {
        "id": str(recordId),
        "lat": lat,
        "lng": lng,
        "neighborhood": neighborhood,
        "zip": zipCode,
        "parcel_size": 0,
        "property_type": "business_candidate",
        "zoning": str(zoning),
    }


def _buildPlotKey(plot: dict[str, Any]) -> tuple[Any, ...]:
    lat = round(plot.get("lat", 0), 5) if plot.get("lat") is not None else None
    lng = round(plot.get("lng", 0), 5) if plot.get("lng") is not None else None
    return (lat, lng, plot.get("zip"), plot.get("property_type"))


def _fetchPrimaryPlots(limit: int) -> list[dict[str, Any]]:
    rawRecords = safeGet(CHICAGO_PLOTS_API, params={"$limit": limit})
    plots: list[dict[str, Any]] = []

    for idx, raw in enumerate(rawRecords, start=1):
        normalized = _normalizePrimaryPlot(raw, idx)
        if normalized is not None:
            plots.append(normalized)

    return plots


def _fetchCitywidePermitCandidates(limit: int) -> list[dict[str, Any]]:
    rawRecords = safeGet(CHICAGO_BUILDING_PERMITS_API, params={"$limit": limit})
    plots: list[dict[str, Any]] = []

    for idx, raw in enumerate(rawRecords, start=1):
        normalized = _normalizePermitCandidate(raw, idx)
        if normalized is not None:
            plots.append(normalized)

    return plots


def _fetchParcelUniverseCandidates(limit: int) -> list[dict[str, Any]]:
    rawRecords = safeGet(COOK_COUNTY_PARCEL_UNIVERSE_API, params={"$limit": limit})
    plots: list[dict[str, Any]] = []

    for idx, raw in enumerate(rawRecords, start=1):
        normalized = _normalizeParcelCandidate(raw, idx)
        if normalized is not None:
            plots.append(normalized)

    return plots


def _fetchBusinessLicenseCandidates(limit: int) -> list[dict[str, Any]]:
    rawRecords = safeGet(CHICAGO_BUSINESS_LICENSES_API, params={"$limit": limit})
    plots: list[dict[str, Any]] = []

    for idx, raw in enumerate(rawRecords, start=1):
        normalized = _normalizeBusinessCandidate(raw, idx)
        if normalized is not None:
            plots.append(normalized)

    return plots


def _getRegionBucket(plot: dict[str, Any]) -> str:
    neighborhood = str(plot.get("neighborhood", "")).upper()
    zipCode = str(plot.get("zip", ""))

    if neighborhood in {"LOOP", "WEST LOOP", "RIVER NORTH", "NEAR NORTH SIDE", "SOUTH LOOP", "THE LOOP"}:
        return "downtown_core"

    if neighborhood in {"LINCOLN PARK", "LAKEVIEW", "RIVER NORTH", "NEAR NORTH SIDE", "OLD TOWN"}:
        return "north_side_core"

    if neighborhood in {"HUMBOLDT PARK", "NORTH LAWNDALE", "WEST GARFIELD PARK", "AUSTIN"}:
        return "west_side"

    if neighborhood in {"ENGLEWOOD", "WEST ENGLEWOOD", "AUBURN GRESHAM", "WASHINGTON PARK", "GRAND BOULEVARD", "OAKLAND", "NEW CITY", "CHATHAM", "SOUTH SHORE"}:
        return "south_side"

    if neighborhood in {"ROSELAND", "WEST PULLMAN", "RIVERDALE", "SOUTH CHICAGO", "MORGAN PARK"}:
        return "far_south"

    if zipCode in {"60601", "60602", "60603", "60604", "60605", "60606", "60607", "60610", "60611", "60654"}:
        return "downtown_core"

    if zipCode in {"60613", "60614", "60618", "60657"}:
        return "north_side_core"

    if zipCode in {"60624", "60644", "60612", "60623"}:
        return "west_side"

    if zipCode in {"60609", "60615", "60616", "60620", "60621", "60636", "60637", "60653"}:
        return "south_side"

    if zipCode in {"60617", "60619", "60628", "60827"}:
        return "far_south"

    return "other"


def _zipPriority(plot: dict[str, Any]) -> int:
    zipCode = str(plot.get("zip", ""))
    if zipCode in TARGET_DOWNTOWN_ZIPS:
        return 0
    if zipCode in TARGET_NORTH_CORE_ZIPS:
        return 1
    return 2


def _balancePlots(plots: list[dict[str, Any]], limit: int) -> list[dict[str, Any]]:
    bucketTargets = {
        "downtown_core": 5,
        "north_side_core": 5,
        "west_side": 6,
        "south_side": 6,
        "far_south": 4,
        "other": 4,
    }

    plots = sorted(plots, key=_zipPriority)

    bucketCounts = {bucket: 0 for bucket in bucketTargets}
    balanced: list[dict[str, Any]] = []
    seenKeys: set[tuple[Any, ...]] = set()

    for plot in plots:
        plotKey = _buildPlotKey(plot)
        if plotKey in seenKeys:
            continue

        bucket = _getRegionBucket(plot)
        if bucketCounts.get(bucket, 0) >= bucketTargets.get(bucket, 0):
            continue

        seenKeys.add(plotKey)
        bucketCounts[bucket] += 1
        balanced.append(plot)

        if len(balanced) >= limit:
            return balanced

    for plot in plots:
        if len(balanced) >= limit:
            break

        plotKey = _buildPlotKey(plot)
        if plotKey in seenKeys:
            continue

        seenKeys.add(plotKey)
        balanced.append(plot)

    return balanced[:limit]


def fetchPlots(limit: int = PIPELINE_LIMIT) -> list[dict[str, Any]]:
    primaryPlots = _fetchPrimaryPlots(limit * 3)
    permitPlots = _fetchCitywidePermitCandidates(limit * 10)
    parcelPlots = _fetchParcelUniverseCandidates(limit * 15)
    businessPlots = _fetchBusinessLicenseCandidates(limit * 10)

    mergedPlots = primaryPlots + permitPlots + parcelPlots + businessPlots
    balancedPlots = _balancePlots(mergedPlots, limit)

    saveJson(balancedPlots, RAW_PLOTS_FILE)
    return balancedPlots


if __name__ == "__main__":
    plots = fetchPlots()
    print(f"Fetched {len(plots)} plots")
    if plots:
        print(plots[0])