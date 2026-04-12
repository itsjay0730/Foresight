"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { X } from "lucide-react";
import { FilterState, SelectionState } from "@/data/types";
import { properties } from "@/data/properties";
import { neighborhoods } from "@/data/neighborhoods";
import CommandBar from "@/components/command/CommandBar";
import IntelPanel from "@/components/panel/IntelPanel";
import ScenarioLab from "@/components/modals/ScenarioLab";
import { CompareModal, MemoFullModal } from "@/components/modals/CompareAndMemo";
import { MapControls, Legend, BottomTray, Notification } from "@/components/ui/Overlays";
import { scoreColor } from "@/lib/utils";

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

  // ── Neighborhood properties popup ──
  const [hoodPopupOpen, setHoodPopupOpen] = useState(false);
  const [activeHoodId, setActiveHoodId] = useState<string | undefined>(undefined);

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
    setActiveHoodId(id);
    setHoodPopupOpen(true);

    const h = neighborhoods[id];
    if (h && mapRef.current) {
      mapRef.current.flyTo([h.lat, h.lng], 13, { duration: 0.7 });
    }
  }, []);

  const handleSelectProperty = useCallback((id: number) => {
    setSelection({ type: "property", propertyId: id });
    setPanelOpen(true);
    setHoodPopupOpen(false);

    const p = properties.find(prop => prop.id === id);
    if (p && mapRef.current) {
      mapRef.current.flyTo([p.lat, p.lng], 14, { duration: 0.7 });
    }
  }, []);

  const handleClosePanel = useCallback(() => {
    setPanelOpen(false);
  }, []);

  const handleCloseHoodPopup = useCallback(() => {
    setHoodPopupOpen(false);
  }, []);

  const handleReset = useCallback(() => {
    mapRef.current?.flyTo([41.8781, -87.6298], 12, { duration: 0.7 });
    setSelection({ type: "hood", hoodId: "west-loop" });
    setPanelOpen(false);
    setHoodPopupOpen(false);
    setActiveHoodId(undefined);
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

  const activeNeighborhood = activeHoodId ? neighborhoods[activeHoodId] : undefined;
  const neighborhoodProperties = useMemo(() => {
    if (!activeNeighborhood) return [];
    return properties
      .filter(p => p.hood === activeNeighborhood.name)
      .sort((a, b) => b.score - a.score);
  }, [activeNeighborhood]);

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

      <NeighborhoodPropertiesPopup
        open={hoodPopupOpen}
        onClose={handleCloseHoodPopup}
        neighborhood={activeNeighborhood}
        propertiesInNeighborhood={neighborhoodProperties}
        onSelectProperty={handleSelectProperty}
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

function NeighborhoodPropertiesPopup({
  open,
  onClose,
  neighborhood,
  propertiesInNeighborhood,
  onSelectProperty,
}: {
  open: boolean;
  onClose: () => void;
  neighborhood?: (typeof neighborhoods)[string];
  propertiesInNeighborhood: typeof properties;
  onSelectProperty: (id: number) => void;
}) {
  if (!open || !neighborhood) return null;

  return (
    <div
      className="fixed inset-0 z-[1900] flex items-center justify-center p-3 md:p-5"
      style={{ background: "rgba(0,0,0,0.42)", backdropFilter: "blur(6px)" }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[760px] max-h-[82vh] overflow-y-auto rounded-[16px] p-4 md:p-6 relative custom-scroll"
        style={{
          background: "rgba(10,14,24,0.94)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 16px 64px rgba(0,0,0,0.6)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-t-muted hover:text-t-primary transition-colors"
        >
          <X size={18} />
        </button>

        <div className="pr-8">
          <h2 className="text-[18px] md:text-[20px] font-bold">{neighborhood.name}</h2>
          <p className="text-[12px] text-t-muted mt-[4px]">
            ZIP {neighborhood.zip} · {neighborhood.area} · {propertiesInNeighborhood.length} properties
          </p>
        </div>

        <div className="mt-4 rounded-f p-[12px] border border-white/[0.04] bg-white/[0.02]">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px]">
            <div>
              <span className="text-t-muted uppercase tracking-[0.5px] text-[9px] mr-2">Opportunity</span>
              <span
                className="font-mono font-extrabold text-[18px]"
                style={{ color: scoreColor(neighborhood.scores.opportunity) }}
              >
                {neighborhood.scores.opportunity}
              </span>
            </div>
            <div>
              <span className="text-t-muted uppercase tracking-[0.5px] text-[9px] mr-2">Recommendation</span>
              <span className="font-semibold">{neighborhood.rec}</span>
            </div>
            <div>
              <span className="text-t-muted uppercase tracking-[0.5px] text-[9px] mr-2">Delta</span>
              <span className="font-semibold text-f-green">{neighborhood.delta}</span>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="text-[10px] font-bold text-t-muted uppercase tracking-[1px] mb-3">
            Properties in {neighborhood.name}
          </div>

          {propertiesInNeighborhood.length === 0 ? (
            <div className="rounded-f p-4 border border-white/[0.04] bg-white/[0.02] text-[12px] text-t-muted">
              No properties found for this neighborhood.
            </div>
          ) : (
            <div className="space-y-[8px]">
              {propertiesInNeighborhood.map(property => (
                <button
                  key={property.id}
                  onClick={() => onSelectProperty(property.id)}
                  className="w-full text-left flex items-center justify-between gap-3 px-4 py-3 rounded-f border border-white/[0.04] bg-white/[0.02] hover:border-white/[0.09] hover:bg-white/[0.04] transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-semibold truncate">{property.name}</div>
                    <div className="text-[10.5px] text-t-muted mt-[2px] truncate">
                      {property.type} · {property.est} · {property.sqft} SF · Cap {property.cap}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className="text-[18px] font-extrabold font-mono leading-none"
                      style={{ color: scoreColor(property.score) }}
                    >
                      {property.score}
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.5px] text-t-muted mt-[4px]">
                      {property.rec}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}