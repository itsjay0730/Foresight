"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Marker, Popup } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import type { Map as MapboxMap, FillExtrusionLayer } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { neighborhoods } from "@/data/neighborhoods";
import { properties } from "@/data/properties";
import { FilterState } from "@/data/types";
import { scoreColor } from "@/lib/utils";

interface MapViewProps {
  filters: FilterState;
  onSelectHood: (id: string) => void;
  onSelectProperty: (id: number) => void;
  mapRef: React.MutableRefObject<any>;
}

const BUILDINGS_LAYER_ID = "foresight-3d-buildings";

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
        "#4a5a7a"
      ],
      "fill-extrusion-height": [
        "interpolate",
        ["linear"],
        ["zoom"],
        11,
        0,
        13,
        ["coalesce", ["get", "height"], 0]
      ],
      "fill-extrusion-base": [
        "interpolate",
        ["linear"],
        ["zoom"],
        11,
        0,
        13,
        ["coalesce", ["get", "min_height"], 0]
      ],
      "fill-extrusion-opacity": 0.72
    }
  };

  map.addLayer(buildingsLayer, labelLayerId);
}

export default function MapView({
  filters,
  onSelectHood,
  onSelectProperty,
  mapRef
}: MapViewProps) {
  const internalMapRef = useRef<MapRef | null>(null);
  const [popupPropertyId, setPopupPropertyId] = useState<number | null>(null);

  useEffect(() => {
    mapRef.current = {
      flyTo: (args: { center?: [number, number]; zoom?: number; duration?: number }) => {
        const map = internalMapRef.current?.getMap();
        if (!map || !args.center) return;

        map.flyTo({
          center: args.center,
          zoom: args.zoom,
          duration: args.duration,
          essential: true
        });
      },
      zoomIn: () => internalMapRef.current?.getMap().zoomIn(),
      zoomOut: () => internalMapRef.current?.getMap().zoomOut()
    };

    return () => {
      mapRef.current = null;
    };
  }, [mapRef]);

  const visibleProperties = useMemo(() => {
    return properties.filter((p) => {
      if (filters.investmentType && p.type !== filters.investmentType) return false;

      if (filters.riskLevel) {
        if (filters.riskLevel === "low" && p.risk !== "low") return false;
        if (filters.riskLevel === "moderate" && p.risk !== "moderate") return false;
        if (filters.riskLevel === "high" && !["emerging", "high"].includes(p.risk)) return false;
        if (filters.riskLevel === "emerging" && p.risk !== "emerging") return false;
        if (filters.riskLevel === "avoid" && p.risk !== "avoid") return false;
      }

      return true;
    });
  }, [filters]);

  const popupProperty =
    popupPropertyId !== null
      ? properties.find((p) => p.id === popupPropertyId) || null
      : null;

  return (
    <div className="fixed inset-0 z-[1]">
      <Map
        ref={internalMapRef}
        initialViewState={{
          longitude: -87.6298,
          latitude: 41.8781,
          zoom: 12.1,
          pitch: 52,
          bearing: -18
        }}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        attributionControl={false}
        style={{ width: "100%", height: "100%" }}
        onLoad={(e) => add3DBuildings(e.target)}
        onStyleData={() => {
          const map = internalMapRef.current?.getMap();
          if (map) add3DBuildings(map);
        }}
      >
        {/* Neighborhood markers */}
        {Object.entries(neighborhoods).map(([id, hood]) => (
          <Marker
            key={id}
            longitude={hood.lng}
            latitude={hood.lat}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onSelectHood(id);
            }}
          >
            <button
              type="button"
              className="pointer-events-auto flex flex-col items-center bg-transparent border-0 p-0"
            >
              <div
                className="rounded-full border border-white/40"
                style={{
                  width: 12,
                  height: 12,
                  background: scoreColor(hood.scores.opportunity)
                }}
              />
              <div className="mt-[4px] text-center pointer-events-none">
                <div className="text-[9px] font-semibold text-white/70 whitespace-nowrap drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                  {hood.name}
                </div>
                <div
                  className="text-[12px] font-bold font-mono whitespace-nowrap drop-shadow-[0_1px_6px_rgba(0,0,0,0.95)]"
                  style={{ color: scoreColor(hood.scores.opportunity) }}
                >
                  {hood.scores.opportunity}
                </div>
              </div>
            </button>
          </Marker>
        ))}

        {/* Property markers */}
        {visibleProperties.map((p) => (
          <Marker
            key={p.id}
            longitude={p.lng}
            latitude={p.lat}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setPopupPropertyId(p.id);
            }}
          >
            <button
              type="button"
              className="pointer-events-auto rounded-full border border-white/35"
              style={{
                width: 10,
                height: 10,
                background: scoreColor(p.score)
              }}
              aria-label={p.name}
            />
          </Marker>
        ))}

        {/* Property popup */}
        {popupProperty && (
          <Popup
            longitude={popupProperty.lng}
            latitude={popupProperty.lat}
            anchor="top"
            closeButton={false}
            closeOnClick={false}
            offset={14}
            onClose={() => setPopupPropertyId(null)}
            className="foresight-mapbox-popup"
          >
            <div
              className="min-w-[210px] rounded-[8px] p-[11px]"
              style={{
                background: "rgba(10,14,24,0.92)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 16px 64px rgba(0,0,0,0.6)"
              }}
            >
              <div className="text-[12px] font-bold text-[#eaf0fa] mb-[2px]">
                {popupProperty.name}
              </div>
              <div className="text-[9px] uppercase tracking-[0.5px] text-[#4d5d7a] mb-[7px]">
                {popupProperty.type}
              </div>

              <div className="flex justify-between text-[10.5px] py-[2px]">
                <span className="text-[#4d5d7a]">Score</span>
                <span
                  className="font-semibold font-mono"
                  style={{ color: scoreColor(popupProperty.score) }}
                >
                  {popupProperty.score}
                </span>
              </div>

              <div className="flex justify-between text-[10.5px] py-[2px]">
                <span className="text-[#4d5d7a]">Est. Value</span>
                <span className="font-semibold font-mono text-[#eaf0fa]">
                  {popupProperty.est}
                </span>
              </div>

              <div className="flex justify-between text-[10.5px] py-[2px]">
                <span className="text-[#4d5d7a]">Cap Rate</span>
                <span className="font-semibold font-mono text-[#eaf0fa]">
                  {popupProperty.cap}
                </span>
              </div>

              <div
                className="mt-[7px] pt-[7px] border-t text-[9px] font-bold uppercase tracking-[0.5px]"
                style={{
                  borderColor: "rgba(255,255,255,0.05)",
                  color: scoreColor(popupProperty.score)
                }}
              >
                ● {popupProperty.rec} · Click for details
              </div>

              <button
                type="button"
                className="mt-[8px] w-full rounded-[6px] px-3 py-[7px] text-[10.5px] font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg, rgba(59,130,246,0.9), rgba(6,182,212,0.9))"
                }}
                onClick={() => {
                  onSelectProperty(popupProperty.id);
                  setPopupPropertyId(null);
                }}
              >
                Open Property
              </button>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}