"use client";

import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { neighborhoods } from "@/data/neighborhoods";
import { properties } from "@/data/properties";
import { FilterState } from "@/data/types";
import { scoreColor, getScoreValue } from "@/lib/utils";

// Fix Leaflet default icon paths — webpack/next break the asset resolution
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface MapViewProps {
  filters: FilterState;
  onSelectHood: (id: string) => void;
  onSelectProperty: (id: number) => void;
  mapRef: React.MutableRefObject<L.Map | null>;
}

export default function MapView({ filters, onSelectHood, onSelectProperty, mapRef }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const zonesRef = useRef<Record<string, L.Circle>>({});
  const markersRef = useRef<Record<number, L.CircleMarker>>({});
  const initRef = useRef(false);

  const updateLayers = useCallback(() => {
    const { scoreLayer, investmentType, riskLevel } = filters;

    Object.entries(neighborhoods).forEach(([key, hood]) => {
      const circle = zonesRef.current[key];
      if (!circle) return;
      const val = getScoreValue(hood, scoreLayer);
      const clr = scoreColor(val);
      circle.setStyle({
        color: clr,
        fillColor: clr,
        fillOpacity: 0.06 + (val - 55) * 0.002,
      });
    });

    properties.forEach(p => {
      const m = markersRef.current[p.id];
      if (!m) return;
      let show = true;
      if (investmentType && p.type !== investmentType) show = false;
      if (riskLevel) {
        if (riskLevel === "low" && p.risk !== "low") show = false;
        if (riskLevel === "moderate" && p.risk !== "moderate") show = false;
        if (riskLevel === "high" && !["emerging", "high"].includes(p.risk)) show = false;
        if (riskLevel === "emerging" && p.risk !== "emerging") show = false;
        if (riskLevel === "avoid" && p.risk !== "avoid") show = false;
      }
      if (show) {
        m.setStyle({ opacity: 1, fillOpacity: 0.9 });
        m.setRadius(5.5);
      } else {
        m.setStyle({ opacity: 0.1, fillOpacity: 0.1 });
        m.setRadius(3);
      }
    });
  }, [filters]);

  useEffect(() => {
    if (initRef.current || !containerRef.current) return;
    initRef.current = true;

    const map = L.map(containerRef.current, {
      center: [41.8781, -87.6298],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    });
    mapRef.current = map;

    // Leaflet sometimes miscalculates container size on first render in
    // Next.js because the DOM isn't fully painted yet. Invalidating after
    // a short delay forces it to recalculate and load all tiles.
    requestAnimationFrame(() => {
      map.invalidateSize();
    });
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    // Dark tiles: no-label base + dim labels overlay
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      opacity: 0.4,
      subdomains: "abcd",
    }).addTo(map);

    // Neighborhood zone circles
    Object.entries(neighborhoods).forEach(([key, hood]) => {
      const clr = scoreColor(hood.scores.opportunity);
      const radius = 800 + (hood.scores.opportunity - 55) * 12;

      const circle = L.circle([hood.lat, hood.lng], {
        radius,
        color: clr,
        weight: 1.5,
        opacity: 0.3,
        fillColor: clr,
        fillOpacity: 0.06 + (hood.scores.opportunity - 55) * 0.002,
      }).addTo(map);

      circle.on("click", () => onSelectHood(key));
      circle.on("mouseover", function (this: L.Circle) {
        this.setStyle({ weight: 2.5, opacity: 0.5, fillOpacity: 0.12 });
      });
      circle.on("mouseout", function (this: L.Circle) {
        const val = hood.scores.opportunity;
        this.setStyle({ weight: 1.5, opacity: 0.3, fillOpacity: 0.06 + (val - 55) * 0.002 });
      });

      // Score label overlay
      L.marker([hood.lat, hood.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="font-family:Outfit,sans-serif;text-align:center;pointer-events:none;transform:translate(-50%,-50%)">
            <div style="font-size:9px;font-weight:600;color:rgba(255,255,255,.4);white-space:nowrap;text-shadow:0 1px 6px rgba(0,0,0,.9)">${hood.name}</div>
            <div style="font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:700;color:${clr};text-shadow:0 0 12px ${clr}40">${hood.scores.opportunity}</div>
          </div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
      }).addTo(map);

      zonesRef.current[key] = circle;
    });

    // Property markers
    properties.forEach(p => {
      const clr = scoreColor(p.score);
      const marker = L.circleMarker([p.lat, p.lng], {
        radius: 5.5,
        fillColor: clr,
        color: "rgba(255,255,255,0.25)",
        weight: 1.2,
        fillOpacity: 0.9,
      }).addTo(map);

      marker.bindTooltip(`
        <div style="background:rgba(10,14,24,0.92);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:11px 14px;min-width:210px;box-shadow:0 16px 64px rgba(0,0,0,0.6);font-family:Outfit,sans-serif">
          <div style="font-size:12px;font-weight:700;margin-bottom:1px;color:#eaf0fa">${p.name}</div>
          <div style="font-size:9px;color:#4d5d7a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:7px">${p.type}</div>
          <div style="display:flex;justify-content:space-between;font-size:10.5px;padding:2px 0"><span style="color:#4d5d7a">Score</span><span style="font-weight:600;font-family:'IBM Plex Mono',monospace;color:${clr}">${p.score}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:10.5px;padding:2px 0"><span style="color:#4d5d7a">Est. Value</span><span style="font-weight:600;font-family:'IBM Plex Mono',monospace;color:#eaf0fa">${p.est}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:10.5px;padding:2px 0"><span style="color:#4d5d7a">Cap Rate</span><span style="font-weight:600;font-family:'IBM Plex Mono',monospace;color:#eaf0fa">${p.cap}</span></div>
          <div style="margin-top:7px;padding-top:7px;border-top:1px solid rgba(255,255,255,0.05);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${clr}">● ${p.rec} · Click for details</div>
        </div>
      `, { className: "foresight-tip", direction: "top", offset: [0, -8] });

      marker.on("click", () => onSelectProperty(p.id));
      marker.on("mouseover", function (this: L.CircleMarker) {
        this.setRadius(8);
        this.setStyle({ weight: 2, color: "#fff" });
      });
      marker.on("mouseout", function (this: L.CircleMarker) {
        this.setRadius(5.5);
        this.setStyle({ weight: 1.2, color: "rgba(255,255,255,0.25)" });
      });

      markersRef.current[p.id] = marker;
    });

    return () => {
      map.remove();
      initRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    updateLayers();
  }, [updateLayers]);

  return <div ref={containerRef} className="fixed inset-0 z-[1]" style={{ width: "100vw", height: "100vh" }} />;
}