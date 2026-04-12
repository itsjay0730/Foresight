"use client";

import { useEffect, useMemo, useRef } from "react";
import Map, { Marker } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import type { Map as MapboxMap, FillExtrusionLayer } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

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
  onSelectProperty,
  mapRef,
}: MapViewProps) {
  const internalMapRef = useRef<MapRef | null>(null);

  useEffect(() => {
    mapRef.current = {
      flyTo: (args: { center?: [number, number]; zoom?: number; duration?: number }) => {
        const map = internalMapRef.current?.getMap();
        if (!map || !args.center) return;

        map.flyTo({
          center: args.center,
          zoom: args.zoom,
          duration: args.duration,
          essential: true,
        });
      },
      zoomIn: () => internalMapRef.current?.getMap().zoomIn(),
      zoomOut: () => internalMapRef.current?.getMap().zoomOut(),
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
        {visibleProperties.map((p) => (
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
                background: scoreColor(p.score),
              }}
              aria-label={p.name}
            />
          </Marker>
        ))}
      </Map>
    </div>
  );
}