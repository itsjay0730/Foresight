"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { X } from "lucide-react";
import {
  FilterState,
  SelectionState,
  Neighborhood,
  Property,
} from "@/data/types";
import { fetchAndGetData } from "@/data/api";
import CommandBar from "@/components/command/CommandBar";
import IntelPanel from "@/components/panel/IntelPanel";
import {
  CompareModal,
  MemoFullModal,
} from "@/components/modals/CompareAndMemo";
import {
  MapControls,
  Legend,
  BottomTray,
  Notification,
} from "@/components/ui/Overlays";
import { scoreColor } from "@/lib/utils";

const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
});

type ForecastScores = {
  "1y"?: { finalScore?: number; opportunity?: number };
  "3y"?: { finalScore?: number; opportunity?: number };
  "5y"?: { finalScore?: number; opportunity?: number };
};

function getTimelineAdjustedScore(
  baseScore: number,
  timeline: string,
  forecastScores?: ForecastScores
) {
  if (timeline === "0") {
    return Math.max(0, Math.min(100, Math.round(baseScore)));
  }

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

function getRecommendationFromScore(score: number) {
  if (score >= 85) return "BUY";
  if (score >= 75) return "BUILD";
  if (score >= 65) return "WATCH";
  return "AVOID";
}

function getTimelineLayerScore(
  baseScore: number,
  timeline: string,
  forecastScores?: ForecastScores,
  layerKey: "opportunity" | "finalScore" = "opportunity"
) {
  if (timeline === "0") {
    return Math.max(0, Math.min(100, Math.round(baseScore)));
  }

  const timelineKey = `${timeline}y` as "1y" | "3y" | "5y";
  const source = forecastScores?.[timelineKey];

  if (source) {
    const layerValue =
      layerKey === "opportunity" ? source.opportunity : source.finalScore;

    if (typeof layerValue === "number") {
      return Math.max(0, Math.min(100, Math.round(layerValue)));
    }
  }

  return getTimelineAdjustedScore(baseScore, timeline, forecastScores);
}

function getTimelineDelta(
  baseScore: number,
  timeline: string,
  forecastScores?: ForecastScores
) {
  if (timeline === "0") {
    return "Current";
  }

  const timelineKey = `${timeline}y` as "1y" | "3y" | "5y";
  const forecastScore = forecastScores?.[timelineKey]?.finalScore;

  if (typeof forecastScore === "number") {
    const delta = forecastScore - baseScore;
    return `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} pts`;
  }

  return timeline === "1"
    ? "Near-term outlook"
    : timeline === "5"
    ? "Long-range upside"
    : "Balanced horizon";
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

function LoadingScreen() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: "#06080d" }}
    >
      <div className="text-center">
        <div
          className="w-[40px] h-[40px] rounded-[10px] flex items-center justify-center font-extrabold text-[18px] text-white mx-auto mb-4"
          style={{
            background:
              "linear-gradient(140deg,#3b82f6 0%,#06b6d4 50%,#22c55e 100%)",
            boxShadow: "0 2px 20px rgba(59,130,246,0.4)",
          }}
        >
          F
        </div>
        <div className="text-[16px] font-bold text-t-primary mb-1">
          Foresight
        </div>
        <div className="text-[11px] text-t-muted">
          Loading Chicago investment data…
        </div>
      </div>
    </div>
  );
}

export default function ForesightApp() {
  const mapRef = useRef<any>(null);

  const [dataReady, setDataReady] = useState(false);
  const [apiNeighborhoods, setApiNeighborhoods] = useState<
    Record<string, Neighborhood>
  >({});
  const [apiNeighborhoodList, setApiNeighborhoodList] = useState<
    Neighborhood[]
  >([]);
  const [apiProperties, setApiProperties] = useState<Property[]>([]);

  const [filters, setFilters] = useState<FilterState>({
    investmentType: "",
    housingType: "investment",
    timeline: "3",
    scoreLayer: "opportunity",
    riskLevel: "",
    searchQuery: "",
  });

  const [selection, setSelection] = useState<SelectionState>({
    type: "hood",
    hoodId: "west-loop",
  });

  const [panelOpen, setPanelOpen] = useState(false);
  const [hoodPopupOpen, setHoodPopupOpen] = useState(false);
  const [activeHoodId, setActiveHoodId] = useState<string | undefined>(
    undefined
  );

  const [compareOpen, setCompareOpen] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);

  const [notif, setNotif] = useState({ message: "", visible: false });

  useEffect(() => {
  let mounted = true;

  setDataReady(false);

  fetchAndGetData()
    .then((data) => {
      if (!mounted) return;
      setApiNeighborhoods(data.neighborhoods ?? {});
      setApiNeighborhoodList(data.neighborhoodList ?? []);
      setApiProperties(data.properties ?? []);
      setActiveHoodId(undefined);
      setPanelOpen(false);
      setHoodPopupOpen(false);
      setDataReady(true);
    })
    .catch(() => {
      if (!mounted) return;
      setApiNeighborhoods({});
      setApiNeighborhoodList([]);
      setApiProperties([]);
      setActiveHoodId(undefined);
      setPanelOpen(false);
      setHoodPopupOpen(false);
      setDataReady(true);
    });

  return () => {
    mounted = false;
  };
}, [filters.housingType]);

  const notify = useCallback((msg: string) => {
    setNotif({ message: msg, visible: true });
    setTimeout(() => setNotif((prev) => ({ ...prev, visible: false })), 2800);
  }, []);

  const handleFilterChange = useCallback((partial: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleSelectHood = useCallback(
    (id: string) => {
      setSelection({ type: "hood", hoodId: id });
      setPanelOpen(false);
      setActiveHoodId(id);
      setHoodPopupOpen(true);

      const h = apiNeighborhoods[id];
      if (h && mapRef.current) {
        mapRef.current.flyTo([h.lat, h.lng], 13, { duration: 0.7 });
      }
    },
    [apiNeighborhoods]
  );

  const handleSelectProperty = useCallback(
    (id: number) => {
      const p = apiProperties.find((prop) => prop.id === id);
      if (!p) return;

      const matchedHoodId =
        Object.keys(apiNeighborhoods).find(
          (k) => apiNeighborhoods[k]?.name === p.hood
        ) ||
        Object.keys(apiNeighborhoods)[0] ||
        "unknown";

      setSelection({ type: "property", propertyId: id, hoodId: matchedHoodId });
      setActiveHoodId(matchedHoodId);
      setPanelOpen(true);
      setHoodPopupOpen(false);

      if (mapRef.current) {
        mapRef.current.flyTo([p.lat, p.lng], 14, { duration: 0.7 });
      }
    },
    [apiNeighborhoods, apiProperties]
  );

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
      housingType: "investment",
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

  const trayStats = useMemo(() => {
    let total = 0;
    let buy = 0;
    let build = 0;
    let watch = 0;
    let avoid = 0;

    apiProperties.forEach((p) => {
      let show = true;

      if (filters.investmentType && p.type !== filters.investmentType) {
        show = false;
      }

      if (filters.riskLevel) {
        if (filters.riskLevel === "low" && p.risk !== "low") show = false;
        if (filters.riskLevel === "moderate" && p.risk !== "moderate") {
          show = false;
        }
        if (
          filters.riskLevel === "high" &&
          !["emerging", "high"].includes(p.risk)
        ) {
          show = false;
        }
        if (filters.riskLevel === "emerging" && p.risk !== "emerging") {
          show = false;
        }
        if (filters.riskLevel === "avoid" && p.risk !== "avoid") {
          show = false;
        }
      }

      if (show) {
        total++;

        const adjustedScore = getModeScore(
          p,
          filters.timeline,
          filters.housingType
        );
        const adjustedRec = getRecommendationFromScore(adjustedScore);

        if (adjustedRec === "BUY") buy++;
        else if (adjustedRec === "BUILD") build++;
        else if (adjustedRec === "WATCH") watch++;
        else avoid++;
      }
    });

    return { total, buy, build, watch, avoid };
  }, [apiProperties, filters]);

  const activeNeighborhood = activeHoodId
    ? apiNeighborhoods[activeHoodId]
    : undefined;

  const adjustedNeighborhoodStats = useMemo(() => {
    if (!activeNeighborhood) return undefined;

    const neighborhoodPlots = apiProperties.filter(
      (p) => p.hood === activeNeighborhood.name
    );

    const adjustedOpportunity =
      filters.housingType === "housing"
        ? neighborhoodPlots.reduce(
            (sum, p) => sum + getModeScore(p, filters.timeline, "housing"),
            0
          ) / Math.max(neighborhoodPlots.length, 1)
        : getTimelineLayerScore(
            activeNeighborhood.scores.opportunity,
            filters.timeline,
            (activeNeighborhood as any).forecast_scores,
            "opportunity"
          );

    return {
      opportunity: Math.round(adjustedOpportunity),
      recommendation: getRecommendationFromScore(
        Math.round(adjustedOpportunity)
      ),
      timelineLabel: `${filters.timeline}Y`,
      delta:
        filters.housingType === "housing"
          ? "Housing market view"
          : getTimelineDelta(
              activeNeighborhood.scores.opportunity,
              filters.timeline,
              (activeNeighborhood as any).forecast_scores
            ),
    };
  }, [
    activeNeighborhood,
    apiProperties,
    filters.timeline,
    filters.housingType,
  ]);

  const neighborhoodProperties = useMemo(() => {
    if (!activeNeighborhood) return [];

    return apiProperties
      .filter((p) => p.hood === activeNeighborhood.name)
      .map((p) => {
        const adjustedScore = getModeScore(
          p,
          filters.timeline,
          filters.housingType
        );

        return {
          ...p,
          adjustedScore,
          adjustedRec: getRecommendationFromScore(adjustedScore),
        };
      })
      .sort((a, b) => b.adjustedScore - a.adjustedScore);
  }, [
    activeNeighborhood,
    apiProperties,
    filters.timeline,
    filters.housingType,
  ]);

  useEffect(() => {
    if (!dataReady) return;
    if (activeHoodId) return;

    const firstNeighborhoodId = apiNeighborhoodList[0]?.id;
    if (!firstNeighborhoodId) return;

    setSelection({ type: "hood", hoodId: firstNeighborhoodId });
    setActiveHoodId(firstNeighborhoodId);
  }, [dataReady, activeHoodId, apiNeighborhoodList]);

  if (!dataReady) {
    return <LoadingScreen />;
  }

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
        key={apiProperties.length}
        filters={filters}
        onSelectHood={handleSelectHood}
        onSelectProperty={handleSelectProperty}
        mapRef={mapRef}
      />

      {panelOpen && !hoodPopupOpen && (
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
          timeline={filters.timeline}
          // housingType={filters.housingType}
          onSelectProperty={handleSelectProperty}
          onOpenMemo={() => setMemoOpen(true)}
          onOpenNeighborhoodStats={() => {
            setHoodPopupOpen(true);
          }}
        />
      )}

      <NeighborhoodPropertiesPopup
        open={hoodPopupOpen}
        onClose={handleCloseHoodPopup}
        neighborhood={activeNeighborhood}
        propertiesInNeighborhood={neighborhoodProperties}
        onSelectProperty={handleSelectProperty}
        adjustedNeighborhoodStats={adjustedNeighborhoodStats}
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
  adjustedNeighborhoodStats,
}: {
  open: boolean;
  onClose: () => void;
  neighborhood?: Neighborhood;
  propertiesInNeighborhood: Array<
    Property & {
      adjustedScore: number;
      adjustedRec: string;
    }
  >;
  onSelectProperty: (id: number) => void;
  adjustedNeighborhoodStats?: {
    opportunity: number;
    recommendation: string;
    timelineLabel: string;
    delta: string;
  };
}) {
  if (!open || !neighborhood) return null;

  return (
    <div
      className="fixed inset-0 z-[1900] flex items-center justify-center p-3 md:p-5"
      style={{ background: "rgba(0,0,0,0.42)", backdropFilter: "blur(6px)" }}
      onClick={(e) => {
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
          <h2 className="text-[18px] md:text-[20px] font-bold">
            {neighborhood.name}
          </h2>
          <p className="text-[12px] text-t-muted mt-[4px]">
            ZIP {neighborhood.zip} · {neighborhood.area} ·{" "}
            {propertiesInNeighborhood.length} properties
          </p>
        </div>

        <div className="mt-4 rounded-f p-[12px] border border-white/[0.04] bg-white/[0.02]">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px]">
            <div>
              <span className="text-t-muted uppercase tracking-[0.5px] text-[9px] mr-2">
                {adjustedNeighborhoodStats?.timelineLabel ?? "Current"}{" "}
                Opportunity
              </span>
              <span
                className="font-mono font-extrabold text-[18px]"
                style={{
                  color: scoreColor(
                    adjustedNeighborhoodStats?.opportunity ??
                      neighborhood.scores.opportunity
                  ),
                }}
              >
                {adjustedNeighborhoodStats?.opportunity ??
                  neighborhood.scores.opportunity}
              </span>
            </div>
            <div>
              <span className="text-t-muted uppercase tracking-[0.5px] text-[9px] mr-2">
                Recommendation
              </span>
              <span className="font-semibold">
                {adjustedNeighborhoodStats?.recommendation ?? neighborhood.rec}
              </span>
            </div>
            <div>
              <span className="text-t-muted uppercase tracking-[0.5px] text-[9px] mr-2">
                Horizon
              </span>
              <span className="font-semibold text-f-green">
                {adjustedNeighborhoodStats?.delta ?? neighborhood.delta}
              </span>
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
              {propertiesInNeighborhood.map((property) => (
                <button
                  key={property.id}
                  onClick={() => onSelectProperty(property.id)}
                  className="w-full text-left flex items-center justify-between gap-3 px-4 py-3 rounded-f border border-white/[0.04] bg-white/[0.02] hover:border-white/[0.09] hover:bg-white/[0.04] transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-semibold truncate">
                      {property.name}
                    </div>
                    <div className="text-[10.5px] text-t-muted mt-[2px] truncate">
                      {property.type} · {property.est} · {property.sqft} SF ·
                      Cap {property.cap}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className="text-[18px] font-extrabold font-mono leading-none"
                      style={{ color: scoreColor(property.adjustedScore) }}
                    >
                      {property.adjustedScore}
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.5px] text-t-muted mt-[4px]">
                      {property.adjustedRec}
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
