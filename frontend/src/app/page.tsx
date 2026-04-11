"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { FilterState, SelectionState } from "@/data/types";
import { properties } from "@/data/properties";
import { neighborhoods } from "@/data/neighborhoods";
import CommandBar from "@/components/command/CommandBar";
import IntelPanel from "@/components/panel/IntelPanel";
import ScenarioLab from "@/components/modals/ScenarioLab";
import { CompareModal, MemoFullModal } from "@/components/modals/CompareAndMemo";
import { MapControls, Legend, BottomTray, Notification } from "@/components/ui/Overlays";

// Dynamic import for Leaflet (SSR-incompatible)
const MapView = dynamic(() => import("@/components/map/MapView"), { ssr: false });

export default function ForesightApp() {
  const mapRef = useRef<any>(null);

  const [filters, setFilters] = useState<FilterState>({
    investmentType: "",
    timeline: "3",
    scoreLayer: "opportunity",
    riskLevel: "",
    searchQuery: "",
  });

  const [selection, setSelection] = useState<SelectionState>({
    type: "hood",
    hoodId: "west-loop",
  });

  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);

  const [notif, setNotif] = useState({ message: "", visible: false });

  const notify = useCallback((msg: string) => {
    setNotif({ message: msg, visible: true });
    setTimeout(() => setNotif(prev => ({ ...prev, visible: false })), 2800);
  }, []);

  const handleFilterChange = useCallback((partial: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...partial }));
  }, []);

  const handleSelectHood = useCallback((id: string) => {
    setSelection({ type: "hood", hoodId: id });
    const h = neighborhoods[id];
    if (h && mapRef.current) {
      mapRef.current.flyTo([h.lat, h.lng], 13, { duration: 0.7 });
    }
  }, []);

  const handleSelectProperty = useCallback((id: number) => {
    setSelection({ type: "property", propertyId: id });
    const p = properties.find(prop => prop.id === id);
    if (p && mapRef.current) {
      mapRef.current.flyTo([p.lat, p.lng], 14, { duration: 0.7 });
    }
  }, []);

  const handleReset = useCallback(() => {
    mapRef.current?.flyTo([41.8781, -87.6298], 12, { duration: 0.7 });
    setSelection({ type: "hood", hoodId: "west-loop" });
    setFilters({
      investmentType: "",
      timeline: "3",
      scoreLayer: "opportunity",
      riskLevel: "",
      searchQuery: "",
    });
  }, []);

  const handleGenerateInsight = useCallback(() => {
    notify("AI insight generated for current selection");
  }, [notify]);

  const handleRefresh = useCallback(() => {
    notify("Data refreshed · All scores current as of today");
  }, [notify]);

  const handleExportPDF = useCallback(() => {
    notify("PDF exported · Check your downloads");
  }, [notify]);

  const trayStats = useMemo(() => {
    let total = 0;
    let buy = 0;
    let build = 0;
    let watch = 0;
    let avoid = 0;

    properties.forEach(p => {
      let show = true;

      if (filters.investmentType && p.type !== filters.investmentType) show = false;

      if (filters.riskLevel) {
        if (filters.riskLevel === "low" && p.risk !== "low") show = false;
        if (filters.riskLevel === "moderate" && p.risk !== "moderate") show = false;
        if (filters.riskLevel === "high" && !["emerging", "high"].includes(p.risk)) show = false;
        if (filters.riskLevel === "emerging" && p.risk !== "emerging") show = false;
        if (filters.riskLevel === "avoid" && p.risk !== "avoid") show = false;
      }

      if (show) {
        total++;
        if (p.rec === "BUY") buy++;
        else if (p.rec === "BUILD") build++;
        else if (p.rec === "WATCH") watch++;
        else avoid++;
      }
    });

    return { total, buy, build, watch, avoid, pipeline: "$284M" };
  }, [filters]);

  return (
    <>
      <Notification message={notif.message} visible={notif.visible} />

      <CommandBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onSelectHood={handleSelectHood}
        onSelectProperty={handleSelectProperty}
        onReset={handleReset}
        onCompare={() => setCompareOpen(true)}
        onGenerateInsight={handleGenerateInsight}
        onRefresh={handleRefresh}
      />

      <MapView
        filters={filters}
        onSelectHood={handleSelectHood}
        onSelectProperty={handleSelectProperty}
        mapRef={mapRef}
      />

      <MapControls mapRef={mapRef} />
      <Legend />
      <BottomTray stats={trayStats} />

      <IntelPanel
        selectionType={selection.type}
        hoodId={selection.hoodId}
        propertyId={selection.propertyId}
        onSelectProperty={handleSelectProperty}
        onOpenScenario={() => setScenarioOpen(true)}
        onOpenMemo={() => setMemoOpen(true)}
        onExportPDF={handleExportPDF}
      />

      <ScenarioLab
        open={scenarioOpen}
        onClose={() => setScenarioOpen(false)}
        selectionType={selection.type}
        hoodId={selection.hoodId}
        propertyId={selection.propertyId}
        onNotify={notify}
      />

      <CompareModal open={compareOpen} onClose={() => setCompareOpen(false)} />

      <MemoFullModal
        open={memoOpen}
        onClose={() => setMemoOpen(false)}
        selectionType={selection.type}
        hoodId={selection.hoodId}
        propertyId={selection.propertyId}
        onNotify={notify}
      />
    </>
  );
}