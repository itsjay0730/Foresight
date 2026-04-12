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

  // ── Filters ──
  const [filters, setFilters] = useState<FilterState>({
    investmentType: "",
    timeline: "3",
    scoreLayer: "opportunity",
    riskLevel: "",
    searchQuery: "",
  });

  // ── Selection ──
  const [selection, setSelection] = useState<SelectionState>({
    type: "hood",
    hoodId: "west-loop",
  });

  // ── Panel state ──
  const [panelOpen, setPanelOpen] = useState(false);

  // ── Modals ──
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);

  // ── Notification ──
  const [notif, setNotif] = useState({ message: "", visible: false });
  const notify = useCallback((msg: string) => {
    setNotif({ message: msg, visible: true });
    setTimeout(() => setNotif(prev => ({ ...prev, visible: false })), 2800);
  }, []);

  // ── Handlers ──
  const handleFilterChange = useCallback((partial: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...partial }));
  }, []);

  const handleSelectHood = useCallback((id: string) => {
    setSelection({ type: "hood", hoodId: id });
    setPanelOpen(false);

    const h = neighborhoods[id];
    if (h && mapRef.current) {
      mapRef.current.flyTo([h.lat, h.lng], 13, { duration: 0.7 });
    }
  }, []);

  const handleSelectProperty = useCallback((id: number) => {
    setSelection({ type: "property", propertyId: id });
    setPanelOpen(true);

    const p = properties.find(prop => prop.id === id);
    if (p && mapRef.current) {
      mapRef.current.flyTo([p.lat, p.lng], 14, { duration: 0.7 });
    }
  }, []);

  const handleClosePanel = useCallback(() => {
    setPanelOpen(false);
  }, []);

  const handleReset = useCallback(() => {
    mapRef.current?.flyTo([41.8781, -87.6298], 12, { duration: 0.7 });
    setSelection({ type: "hood", hoodId: "west-loop" });
    setPanelOpen(false);
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

  // ── Tray stats ──
  const trayStats = useMemo(() => {
    let total = 0, buy = 0, build = 0, watch = 0, avoid = 0;

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

      {/* Click-outside layer for closing the right panel */}
      {panelOpen && (
        <div
          className="fixed inset-0 z-[850]"
          onClick={handleClosePanel}
          aria-hidden="true"
        />
      )}

      <MapControls mapRef={mapRef} />
      <Legend />
      <BottomTray stats={trayStats} />

      {panelOpen && selection.type === "property" && (
        <IntelPanel
          selectionType={selection.type}
          hoodId={selection.hoodId}
          propertyId={selection.propertyId}
          onSelectProperty={handleSelectProperty}
          onOpenScenario={() => setScenarioOpen(true)}
          onOpenMemo={() => setMemoOpen(true)}
          onExportPDF={handleExportPDF}
        />
      )}

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