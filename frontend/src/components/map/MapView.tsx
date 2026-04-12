"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Marker } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import type { Map as MapboxMap, FillExtrusionLayer } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { getProperties } from "@/data/api";
import { FilterState } from "@/data/types";
import { scoreColor } from "@/lib/utils";

interface MapViewProps {
  filters: FilterState;
  onSelectHood: (id: string) => void;
  onSelectProperty: (id: number) => void;
  mapRef: React.MutableRefObject<any>;
}

const BUILDINGS_LAYER_ID = "foresight-3d-buildings";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function normalize(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return 0;
  if (max <= min) return 0;
  return clamp01((value - min) / (max - min));
}

function getHousingModeScore(plot: any, timeline: string) {
  const rentLevel = Number(plot?.zip_rent_index_latest ?? 0);
  const zipRentGrowth = Number(plot?.zip_rent_growth_1y ?? 0);
  const metroRentGrowth = Number(plot?.metro_rent_growth_1y ?? 0);
  const salesGrowth = Number(plot?.sales_count_growth_1y ?? 0);

  const rentLevelScore = normalize(rentLevel, 1200, 3200);
  const zipGrowthScore = normalize(zipRentGrowth, -0.05, 0.12);
  const metroGrowthScore = normalize(metroRentGrowth, -0.05, 0.12);
  const salesMomentumScore = normalize(salesGrowth, -0.2, 0.2);

  const base =
    0.4 * rentLevelScore +
    0.3 * zipGrowthScore +
    0.15 * metroGrowthScore +
    0.15 * salesMomentumScore;

  const multiplier = timeline === "1" ? 0.97 : timeline === "5" ? 1.05 : 1.0;

  return Math.max(0, Math.min(100, Math.round((60 + base * 35) * multiplier)));
}

function getTimelineAdjustedScore(
  baseScore: number,
  timeline: string,
  forecastScores?: {
    "1y"?: { finalScore?: number; opportunity?: number };
    "3y"?: { finalScore?: number; opportunity?: number };
    "5y"?: { finalScore?: number; opportunity?: number };
  }
) {
  const timelineKey = `${timeline}y` as "1y" | "3y" | "5y";
  const forecastScore = forecastScores?.[timelineKey]?.finalScore;

  if (typeof forecastScore === "number") {
    return Math.max(0, Math.min(100, Math.round(forecastScore)));
  }

  const multipliers: Record<string, number> = {
    "1": 0.94,
    "3": 1,
    "5": 1.08,
  };

  const multiplier = multipliers[timeline] ?? 1;
  return Math.max(0, Math.min(100, Math.round(baseScore * multiplier)));
}

function getModeScore(
  plot: any,
  timeline: string,
  housingType: "investment" | "housing"
) {
  if (housingType === "housing") {
    return getHousingModeScore(plot, timeline);
  }

  return getTimelineAdjustedScore(plot.score, timeline, plot?.forecast_scores);
}

function add3DBuildings(map: MapboxMap) {
  if (!map.getStyle() || !map.getStyle().layers) return;
  if (map.getLayer(BUILDINGS_LAYER_ID)) return;
  if (!map.getSource("composite")) return;

  const labelLayerId = map
    .getStyle()
    .layers?.find(
      (layer) =>
        layer.type === "symbol" &&
        "layout" in layer &&
        layer.layout &&
        (layer.layout as Record<string, unknown>)["text-field"]
    )?.id;

  const buildingsLayer: FillExtrusionLayer = {
    id: BUILDINGS_LAYER_ID,
    source: "composite",
    "source-layer": "building",
    filter: ["==", ["get", "extrude"], "true"],
    type: "fill-extrusion",
    minzoom: 11,
    paint: {
      "fill-extrusion-color": [
        "interpolate",
        ["linear"],
        ["get", "height"],
        0,
        "#20242e",
        40,
        "#2a3040",
        120,
        "#35405a",
        300,
        "#4a5a7a",
      ],
      "fill-extrusion-height": [
        "interpolate",
        ["linear"],
        ["zoom"],
        11,
        0,
        13,
        ["coalesce", ["get", "height"], 0],
      ],
      "fill-extrusion-base": [
        "interpolate",
        ["linear"],
        ["zoom"],
        11,
        0,
        13,
        ["coalesce", ["get", "min_height"], 0],
      ],
      "fill-extrusion-opacity": 0.72,
    },
  };

  map.addLayer(buildingsLayer, labelLayerId);
}

export default function MapView({
  filters,
  onSelectHood: _onSelectHood,
  onSelectProperty,
  mapRef,
}: MapViewProps) {
  const internalMapRef = useRef<MapRef | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    mapRef.current = {
      flyTo: (
        arg1:
          | { center?: [number, number]; zoom?: number; duration?: number }
          | [number, number],
        arg2?: number,
        arg3?: { duration?: number }
      ) => {
        const map = internalMapRef.current?.getMap();
        if (!map) return;

        if (Array.isArray(arg1)) {
          const [lat, lng] = arg1;
          if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) return;

          map.flyTo({
            center: [lng, lat],
            zoom: arg2,
            duration: arg3?.duration,
            essential: true,
          });
          return;
        }

        if (!arg1?.center) return;

        map.flyTo({
          center: arg1.center,
          zoom: arg1.zoom,
          duration: arg1.duration,
          essential: true,
        });
      },
      zoomIn: () => internalMapRef.current?.getMap().zoomIn(),
      zoomOut: () => internalMapRef.current?.getMap().zoomOut(),
    };

    return () => {
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, [mapRef]);

  const properties = getProperties();

  const visibleProperties = useMemo(() => {
    return properties
      .filter((p) => {
        if (!isFiniteNumber(p.lat) || !isFiniteNumber(p.lng)) return false;

        if (
          filters.investmentType &&
          filters.investmentType !== "investment" &&
          filters.investmentType !== "housing" &&
          p.type !== filters.investmentType
        ) {
          return false;
        }

        if (filters.riskLevel) {
          if (filters.riskLevel === "low" && p.risk !== "low") return false;
          if (filters.riskLevel === "moderate" && p.risk !== "moderate") {
            return false;
          }
          if (
            filters.riskLevel === "high" &&
            !["emerging", "high"].includes(p.risk)
          ) {
            return false;
          }
          if (filters.riskLevel === "emerging" && p.risk !== "emerging") {
            return false;
          }
          if (filters.riskLevel === "avoid" && p.risk !== "avoid") {
            return false;
          }
        }

        return true;
      })
      .map((p) => ({
        ...p,
        mapDisplayScore: getModeScore(p, filters.timeline, filters.housingType),
      }))
      .sort((a, b) => b.mapDisplayScore - a.mapDisplayScore);
  }, [filters, properties]);

  const safeVisibleProperties = useMemo(() => {
    if (!mapLoaded) return [];

    return visibleProperties.filter(
      (p) => isFiniteNumber(p.lat) && isFiniteNumber(p.lng)
    );
  }, [mapLoaded, visibleProperties]);

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!mapboxToken) {
    return (
      <div
        className="fixed inset-0 z-[1] flex items-center justify-center"
        style={{ background: "#06080d" }}
      >
        <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-5 py-4 text-center">
          <div className="text-[14px] font-semibold text-white">
            Mapbox token missing
          </div>
          <div className="mt-1 text-[11px] text-white/60">
            Set NEXT_PUBLIC_MAPBOX_TOKEN in frontend/.env.local
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[1]">
      <Map
        ref={internalMapRef}
        initialViewState={{
          longitude: -87.6298,
          latitude: 41.8781,
          zoom: 12.1,
          pitch: 52,
          bearing: -18,
        }}
        mapboxAccessToken={mapboxToken}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        attributionControl={false}
        style={{ width: "100%", height: "100%" }}
        onLoad={(e) => {
          add3DBuildings(e.target);
          setMapLoaded(true);
        }}
        onStyleData={() => {
          const map = internalMapRef.current?.getMap();
          if (map) {
            add3DBuildings(map);
            const style = map.getStyle();
            if (style?.layers?.length) {
              setMapLoaded(true);
            }
          }
        }}
      >
        {safeVisibleProperties.map((p) => (
          <Marker
            key={p.id}
            longitude={p.lng}
            latitude={p.lat}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onSelectProperty(p.id);
            }}
          >
            <button
              type="button"
              className="pointer-events-auto rounded-full border border-white/35"
              style={{
                width: 10,
                height: 10,
                background: scoreColor(p.mapDisplayScore),
              }}
              aria-label={p.name}
            />
          </Marker>
        ))}
      </Map>
    </div>
  );
}
