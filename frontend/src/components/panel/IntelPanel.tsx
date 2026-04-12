"use client";

import { Neighborhood, Property } from "@/data/types";
import { getNeighborhoods, getProperties } from "@/data/api";
import {
  scoreColor,
  recColor,
  recLabel,
  generateSparklinePath,
} from "@/lib/utils";

interface IntelPanelProps {
  selectionType: "hood" | "property";
  hoodId?: string;
  propertyId?: number;
  timeline: string;
  onSelectProperty: (id: number) => void;
  onOpenMemo: () => void;
  onOpenNeighborhoodStats: () => void;
}

function getRecommendationFromScore(
  score: number
): "BUY" | "BUILD" | "WATCH" | "AVOID" {
  if (score >= 85) return "BUY";
  if (score >= 75) return "BUILD";
  if (score >= 65) return "WATCH";
  return "AVOID";
}

function getTimelinePanelScore(
  baseScore: number,
  timeline: string,
  forecastScores?: {
    "1y"?: { finalScore?: number; opportunity?: number };
    "3y"?: { finalScore?: number; opportunity?: number };
    "5y"?: { finalScore?: number; opportunity?: number };
  },
  key: "finalScore" | "opportunity" = "finalScore"
) {
  if (timeline === "0") {
    return Math.max(0, Math.min(100, Math.round(baseScore)));
  }

  const timelineKey = `${timeline}y` as "1y" | "3y" | "5y";
  const value = forecastScores?.[timelineKey]?.[key];

  if (typeof value === "number") {
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  const multipliers: Record<string, number> = {
    "1": 0.94,
    "3": 1,
    "5": 1.08,
  };

  const multiplier = multipliers[timeline] ?? 1;
  return Math.max(0, Math.min(100, Math.round(baseScore * multiplier)));
}

function getTimelinePanelDelta(
  baseScore: number,
  timeline: string,
  forecastScores?: {
    "1y"?: { finalScore?: number; opportunity?: number };
    "3y"?: { finalScore?: number; opportunity?: number };
    "5y"?: { finalScore?: number; opportunity?: number };
  }
) {
  if (timeline === "0") {
    return "Current";
  }

  const timelineKey = `${timeline}y` as "1y" | "3y" | "5y";
  const value = forecastScores?.[timelineKey]?.finalScore;

  if (typeof value === "number") {
    const delta = value - baseScore;
    return `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} pts`;
  }

  return `${baseScore >= 70 ? "+" : ""}${((baseScore - 70) * 0.12).toFixed(
    1
  )}%`;
}

function getTimelineAwareScoreSet(hood: Neighborhood, timeline: string) {
  const metrics = (hood as any)?.metrics as Record<string, { score: number; trend?: number[] }> | undefined;

  const trendIndex: Record<string, number> = { "0": 0, "1": 1, "3": 2, "5": 3 };
  const idx = trendIndex[timeline] ?? 0;

  function getFromTrend(metricKey: string, fallbackScore: number): number {
    const trend = metrics?.[metricKey]?.trend;
    if (trend && idx < trend.length) {
      return Math.max(0, Math.min(100, Math.round(trend[idx])));
    }
    const mult = timeline === "1" ? 0.98 : timeline === "5" ? 1.02 : 1.0;
    return Math.max(0, Math.min(100, Math.round(fallbackScore * mult)));
  }

  return {
    opportunity: getFromTrend("investmentOpportunity", hood.scores?.opportunity ?? 70),
    appreciation: getFromTrend("appreciationPotential", hood.scores?.appreciation ?? 65),
    devReady: getFromTrend("developmentReadiness", hood.scores?.devReady ?? 65),
    stability: getFromTrend("marketStability", hood.scores?.stability ?? 65),
    family: getFromTrend("familyDemand", hood.scores?.family ?? 65),
    commercial: getFromTrend("commercialExpansion", hood.scores?.commercial ?? 60),
  };
}

function getTimelineDisplayLabel(timeline: string) {
  return timeline === "0" ? "Current" : `${timeline}Y Forecast`;
}

export default function IntelPanel({
  selectionType,
  hoodId,
  propertyId,
  timeline,
  onSelectProperty,
  onOpenMemo,
  onOpenNeighborhoodStats,
}: IntelPanelProps) {
  const neighborhoods = getNeighborhoods();
  const properties = getProperties();

  const hood: Neighborhood | undefined =
    selectionType === "hood"
      ? neighborhoods[hoodId || Object.keys(neighborhoods)[0] || "west-loop"]
      : neighborhoods[
          Object.keys(neighborhoods).find(
            (k) =>
              neighborhoods[k].name ===
              properties.find((p) => p.id === propertyId)?.hood
          ) ||
            Object.keys(neighborhoods)[0] ||
            "west-loop"
        ];

  if (!hood) return null;

  const prop: Property | undefined =
    selectionType === "property"
      ? properties.find((p) => p.id === propertyId)
      : undefined;

  // Use the property's own metrics when a property is selected (each has different scores)
  const scoreSource = prop
    ? { ...hood, metrics: (prop as any).metrics ?? (hood as any)?.metrics } as any
    : hood;
  const timelineAwareHoodScores = getTimelineAwareScoreSet(scoreSource ?? hood, timeline);

  const score = prop
    ? getTimelinePanelScore(
        prop.score,
        timeline,
        (prop as any).forecast_scores,
        "finalScore"
      )
    : timelineAwareHoodScores.opportunity;

  const name = prop ? prop.name : hood.name;

  const subtitle = `${hood.zip} • ${getMarketLabel({
    ...hood,
    scores: timelineAwareHoodScores,
  } as Neighborhood)} • ${getOpportunityType({
    ...hood,
    scores: timelineAwareHoodScores,
  } as Neighborhood)}`;

  const rec: "BUY" | "BUILD" | "WATCH" | "AVOID" = prop
    ? getRecommendationFromScore(score)
    : getRecommendationFromScore(timelineAwareHoodScores.opportunity);

  const delta = prop
    ? getTimelinePanelDelta(prop.score, timeline, (prop as any).forecast_scores)
    : getTimelinePanelDelta(
        hood.scores.opportunity,
        timeline,
        (hood as any).forecast_scores
      );

  const confidence = Math.min(96, 70 + Math.floor(score * 0.28));

  return (
    <div
      className="fixed left-[10px] right-[10px] bottom-[10px] h-[46vh] z-[900] rounded-[16px] flex flex-col overflow-hidden shadow-deep md:left-auto md:top-[78px] md:right-[10px] md:bottom-[10px] md:h-auto md:w-[390px]"
      style={{
        background: "rgba(10,14,24,0.82)",
        backdropFilter: "blur(24px) saturate(1.6)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="px-[14px] pt-4 shrink-0 md:px-[18px]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-[17px] md:text-[18px] font-bold leading-tight truncate">
              {name}
            </h2>
            <p className="text-[11px] text-t-muted mt-[4px] truncate">
              {subtitle}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <div className="flex items-center justify-end gap-[8px]">
              <div>
                <div
                  className="text-[28px] md:text-[32px] font-extrabold font-mono leading-none"
                  style={{ color: scoreColor(score) }}
                >
                  {score}
                </div>
                <div
                  className={`text-[11px] font-semibold mt-[3px] ${
                    delta.startsWith("-") ? "text-f-red" : "text-f-green"
                  }`}
                >
                  {delta.startsWith("-") ? "▼" : "▲"} {delta}
                </div>
              </div>

              <div
                className="px-[10px] py-[6px] rounded-[10px] text-[10px] font-bold uppercase tracking-[0.7px]"
                style={{
                  color: recColor(rec),
                  background:
                    rec === "BUY"
                      ? "rgba(34,197,94,0.12)"
                      : rec === "BUILD"
                      ? "rgba(59,130,246,0.12)"
                      : rec === "WATCH"
                      ? "rgba(245,158,11,0.12)"
                      : "rgba(239,68,68,0.12)",
                  border: `1px solid ${recColor(rec)}22`,
                }}
              >
                {rec}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-[14px] py-[14px] pb-7 custom-scroll md:px-[18px]">
        <OverviewContent
          hood={{ ...hood, scores: timelineAwareHoodScores } as Neighborhood}
          rec={rec}
          confidence={confidence}
          onOpenMemo={onOpenMemo}
          onOpenNeighborhoodStats={onOpenNeighborhoodStats}
          timelineLabel={getTimelineDisplayLabel(timeline)}
          rawData={prop ? (prop as any) : (hood as any)}
        />

        {/*
        <FactorsTab hood={hood} />
        */}

        {/*
        <MemoTab hood={hood} score={score} onOpenMemo={onOpenMemo} />
        */}

        {/*
        <CompsTab hood={hood} prop={prop} onSelectProperty={onSelectProperty} />
        */}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  delta,
  reason,
}: {
  label: string;
  value: number;
  delta: string;
  reason?: string;
}) {
  const positive = !delta.startsWith("-");
  const color = scoreColor(value);

  return (
    <div className="rounded-f border border-white/[0.04] bg-white/[0.02] px-[12px] py-[11px]">
      <div className="text-[9px] font-semibold text-t-muted uppercase tracking-[0.75px] mb-[8px]">
        {label}
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div
            className="text-[17px] font-extrabold font-mono leading-none"
            style={{ color }}
          >
            {value}
          </div>
          <div
            className={`text-[9.5px] font-semibold mt-[7px] ${
              positive ? "text-f-green" : "text-f-red"
            }`}
          >
            {positive ? "▲" : "▼"} {delta}
          </div>
        </div>

        <div className="shrink-0 opacity-95">
          <svg width="74" height="28" viewBox="0 0 74 28">
            <polyline
              points={generateSparklinePath(value)
                .split(" ")
                .map((pair) => {
                  const [x, y] = pair.split(",").map(Number);
                  const scaledX = 8 + (x / 54) * 58;
                  const scaledY = 4 + (y / 16) * 18;
                  return `${scaledX},${scaledY}`;
                })
                .join(" ")}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {reason && (
        <div className="text-[9px] leading-[1.4] text-t-dim mt-[7px] border-t border-white/[0.03] pt-[6px]">
          {reason}
        </div>
      )}
    </div>
  );
}

function OverviewContent({
  hood,
  rec,
  confidence,
  onOpenMemo,
  onOpenNeighborhoodStats,
  timelineLabel,
  rawData,
}: {
  hood: Neighborhood;
  rec: "BUY" | "BUILD" | "WATCH" | "AVOID";
  confidence: number;
  onOpenMemo: () => void;
  onOpenNeighborhoodStats: () => void;
  timelineLabel: string;
  rawData?: Record<string, any>;
}) {
  // Generate data-driven one-sentence reasons for each metric
  const r = rawData || {};
  const income = r.income ?? 0;
  const permits = r.permit_count_nearby ?? 0;
  const transitStops = r.transit_stop_count_nearby ?? 0;
  const crimeCount = r.crime_count_nearby ?? 0;
  const violentCrime = r.violent_crime_count_nearby ?? 0;
  const popGrowth = r.population_growth ?? 0;
  const permitActivity = r.permit_activity ?? 0;
  const schoolRating = r.average_school_rating_nearby ?? 0;
  const parks = r.park_count_nearby ?? 0;
  const restaurants = r.restaurant_count_nearby ?? 0;
  const coffee = r.coffee_shop_count_nearby ?? 0;
  const offices = r.office_poi_count_nearby ?? 0;
  const amenityDensity = r.amenity_density_score ?? 0;
  const hardship = r.hardship_index ?? 0;
  const transitDist = r.transit_distance ?? 0;
  const grocery = r.grocery_count_nearby ?? 0;

  function getInvestmentReason(score: number): string {
    if (score >= 85) return `Strong fundamentals: $${(income/1000).toFixed(0)}K income, ${permits} permits, and ${transitStops} transit stops nearby.`;
    if (score >= 75) return `Solid base with $${(income/1000).toFixed(0)}K median income and ${permits} active permits in the area.`;
    if (score >= 65) return `Moderate signal: $${(income/1000).toFixed(0)}K income and ${permits} permits, but gaps in some indicators.`;
    return `Weak composite: $${(income/1000).toFixed(0)}K income and limited permit activity (${permits}) constrain opportunity.`;
  }

  function getAppreciationReason(score: number): string {
    const pg = (popGrowth * 100).toFixed(1);
    const pa = (permitActivity * 100).toFixed(0);
    if (score >= 80) return `Population growing ${pg}% with ${pa}% permit momentum — strong upward trajectory.`;
    if (score >= 70) return `Moderate growth with ${pg}% population change and ${pa}% permit shift.`;
    if (score >= 60) return `Limited growth drivers: ${pg}% population change and modest permit trends.`;
    return `Negative trajectory: ${pg}% population change signals weakening demand.`;
  }

  function getDevReadyReason(score: number): string {
    if (score >= 80) return `Active pipeline with ${permits} nearby permits and favorable zoning (${r.zoning || 'mixed'}).`;
    if (score >= 70) return `${permits} permits nearby with developable parcels — zoning supports moderate density.`;
    if (score >= 60) return `Some activity with ${permits} permits, but zoning or parcel availability limits pipeline.`;
    return `Minimal pipeline — only ${permits} permits and restrictive zoning constrain development.`;
  }

  function getStabilityReason(score: number): string {
    if (score >= 80) return `Low risk profile: ${crimeCount} incidents nearby (${violentCrime} violent), hardship index ${hardship}.`;
    if (score >= 70) return `Moderate stability with ${crimeCount} crime incidents and hardship index of ${hardship}.`;
    if (score >= 60) return `Elevated risk: ${crimeCount} nearby incidents (${violentCrime} violent) and hardship at ${hardship}.`;
    return `High instability: ${crimeCount} crime incidents, ${violentCrime} violent, hardship index ${hardship}.`;
  }

  function getFamilyReason(score: number): string {
    if (score >= 80) return `Strong family profile: ${schoolRating.toFixed(1)} avg school rating, ${parks} parks, and solid demographics.`;
    if (score >= 70) return `Adequate family infrastructure: ${schoolRating.toFixed(1)} school rating with ${parks} parks nearby.`;
    if (score >= 60) return `Limited family appeal: school rating at ${schoolRating.toFixed(1)} and ${parks} parks — below average.`;
    return `Weak family demand: ${schoolRating.toFixed(1)} school rating with minimal park and amenity access.`;
  }

  function getCommercialReason(score: number): string {
    if (score >= 75) return `Active commercial base: ${restaurants} restaurants, ${coffee} cafés, and ${offices} offices — ${(amenityDensity*100).toFixed(0)}% density.`;
    if (score >= 65) return `Moderate commercial: ${restaurants} restaurants and ${coffee} cafés, but amenity density at ${(amenityDensity*100).toFixed(0)}%.`;
    if (score >= 55) return `Underdeveloped: only ${restaurants} restaurants and ${coffee} cafés — ${(amenityDensity*100).toFixed(0)}% density limits draw.`;
    return `Critically weak: ${restaurants} restaurants, ${coffee} cafés — commercial infrastructure severely lacking.`;
  }

  const scores = [
    {
      label: "Investment Opportunity",
      val: hood.scores.opportunity,
      delta: hood.delta,
      reason: getInvestmentReason(hood.scores.opportunity),
    },
    {
      label: "Appreciation Potential",
      val: hood.scores.appreciation,
      delta: getDeltaForMetric("appreciation", hood),
      reason: getAppreciationReason(hood.scores.appreciation),
    },
    {
      label: "Development Readiness",
      val: hood.scores.devReady,
      delta: getDeltaForMetric("devReady", hood),
      reason: getDevReadyReason(hood.scores.devReady),
    },
    {
      label: "Market Stability",
      val: hood.scores.stability,
      delta: getDeltaForMetric("stability", hood),
      reason: getStabilityReason(hood.scores.stability),
    },
    {
      label: "Family Demand",
      val: hood.scores.family,
      delta: getDeltaForMetric("family", hood),
      reason: getFamilyReason(hood.scores.family),
    },
    {
      label: "Commercial Expansion",
      val: hood.scores.commercial,
      delta: getDeltaForMetric("commercial", hood),
      reason: getCommercialReason(hood.scores.commercial),
    },
  ];

  const drivers = getKeyDrivers(hood);

  return (
    <>
      <div className="rounded-f p-[13px] border border-white/[0.04] bg-white/[0.02] mb-[14px]">
        <div className="text-[10px] font-bold uppercase tracking-[0.8px] text-t-muted mb-[10px]">
          Key Drivers
        </div>
        <ul className="space-y-[7px]">
          {drivers.map((driver, i) => (
            <li
              key={i}
              className="text-[10.8px] text-t-secondary leading-[1.45] pl-[12px] relative"
            >
              <span className="absolute left-0 top-[6px] w-[4px] h-[4px] rounded-full bg-f-cyan" />
              {driver}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[8px] mb-[14px]">
        {scores.map((s) => (
          <MetricCard
            key={s.label}
            label={s.label}
            value={s.val}
            delta={s.delta}
            reason={s.reason}
          />
        ))}
      </div>

      <div
        className="rounded-f p-[13px] mb-3 border"
        style={{
          background: "rgba(34,197,94,0.06)",
          borderColor: "rgba(34,197,94,0.1)",
        }}
      >
        <div className="text-[9px] font-bold text-t-muted uppercase tracking-[0.8px] mb-[6px]">
          Recommended Strategy
        </div>

        <div className="flex items-start justify-between gap-3">
          <div>
            <div
              className="text-[22px] font-extrabold tracking-[0.3px]"
              style={{ color: recColor(rec) }}
            >
              {rec}
            </div>
            <div className="text-[10px] text-t-muted mt-[8px]">
              Opportunity Type
            </div>
            <div className="text-[11px] font-semibold text-t-primary mt-[2px]">
              {getOpportunityType(hood)}
            </div>
            <div className="text-[10px] text-t-muted mt-[8px]">Horizon</div>
            <div className="text-[11px] font-semibold text-t-primary mt-[2px]">
              {timelineLabel}
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-[10px] text-t-muted">Confidence</div>
            <div className="text-[18px] font-bold font-mono text-t-primary mt-[2px]">
              {confidence}%
            </div>
          </div>
        </div>
      </div>

      {/* Property Snapshot — real data from predicted_plots */}
      {rawData && (
        <div className="rounded-f p-[13px] mb-3 border border-white/[0.04] bg-white/[0.02]">
          <div className="text-[10px] font-bold uppercase tracking-[0.8px] text-t-muted mb-[10px]">
            Property Snapshot
          </div>

          <div className="grid grid-cols-2 gap-x-[16px] gap-y-[1px]">
            {[
              { label: "Median Income", val: income > 0 ? `$${(income/1000).toFixed(0)}K` : "—" },
              { label: "Hardship Index", val: hardship > 0 ? `${hardship} / 100` : "—" },
              { label: "Transit Stops", val: `${transitStops} nearby` },
              { label: "Nearest Station", val: r.nearest_station ? `${r.nearest_station}` : "—" },
              { label: "Crime Nearby", val: `${crimeCount} incidents` },
              { label: "Violent Crime", val: `${violentCrime} incidents` },
              { label: "Permits Nearby", val: `${permits} active` },
              { label: "School Rating", val: schoolRating > 0 ? `${schoolRating.toFixed(1)} / 10` : "—" },
              { label: "Restaurants", val: `${restaurants} nearby` },
              { label: "Grocery Stores", val: `${grocery} nearby` },
              { label: "Parks", val: `${parks} nearby` },
              { label: "Amenity Density", val: `${(amenityDensity * 100).toFixed(0)}%` },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between py-[5px] border-b border-white/[0.02]"
              >
                <span className="text-[9.5px] text-t-dim">{row.label}</span>
                <span className="text-[9.5px] font-semibold text-t-secondary font-mono">{row.val}</span>
              </div>
            ))}
          </div>

          {/* Demographics row */}
          {(r.median_age || r.renter_pct || r.unemployment_rate) && (
            <div className="mt-[10px] pt-[8px] border-t border-white/[0.03]">
              <div className="text-[9px] font-bold uppercase tracking-[0.6px] text-t-dim mb-[6px]">Demographics</div>
              <div className="grid grid-cols-3 gap-[8px]">
                {r.median_age && (
                  <div className="text-center">
                    <div className="text-[14px] font-bold font-mono text-t-primary">{r.median_age}</div>
                    <div className="text-[8px] text-t-dim uppercase tracking-[0.5px]">Med. Age</div>
                  </div>
                )}
                {r.renter_pct && (
                  <div className="text-center">
                    <div className="text-[14px] font-bold font-mono text-t-primary">{(r.renter_pct * 100).toFixed(0)}%</div>
                    <div className="text-[8px] text-t-dim uppercase tracking-[0.5px]">Renters</div>
                  </div>
                )}
                {r.unemployment_rate && (
                  <div className="text-center">
                    <div className="text-[14px] font-bold font-mono text-t-primary">{(r.unemployment_rate * 100).toFixed(1)}%</div>
                    <div className="text-[8px] text-t-dim uppercase tracking-[0.5px]">Unemploy.</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sale history if available */}
          {(r.last_sale_price || r.assessed_value) && (
            <div className="mt-[10px] pt-[8px] border-t border-white/[0.03]">
              <div className="text-[9px] font-bold uppercase tracking-[0.6px] text-t-dim mb-[6px]">Valuation</div>
              <div className="grid grid-cols-2 gap-x-[16px] gap-y-[1px]">
                {r.last_sale_price && (
                  <div className="flex items-center justify-between py-[4px]">
                    <span className="text-[9.5px] text-t-dim">Last Sale</span>
                    <span className="text-[9.5px] font-semibold text-t-secondary font-mono">${(r.last_sale_price / 1000).toFixed(0)}K</span>
                  </div>
                )}
                {r.assessed_value && (
                  <div className="flex items-center justify-between py-[4px]">
                    <span className="text-[9.5px] text-t-dim">Assessed</span>
                    <span className="text-[9.5px] font-semibold text-t-secondary font-mono">${(r.assessed_value / 1000).toFixed(0)}K</span>
                  </div>
                )}
                {r.ownership_duration_years && (
                  <div className="flex items-center justify-between py-[4px]">
                    <span className="text-[9.5px] text-t-dim">Held</span>
                    <span className="text-[9.5px] font-semibold text-t-secondary font-mono">{r.ownership_duration_years.toFixed(1)} yrs</span>
                  </div>
                )}
                {r.poverty_rate && (
                  <div className="flex items-center justify-between py-[4px]">
                    <span className="text-[9.5px] text-t-dim">Poverty Rate</span>
                    <span className="text-[9.5px] font-semibold text-t-secondary font-mono">{(r.poverty_rate * 100).toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={onOpenNeighborhoodStats}
        className="w-full px-3 py-[8px] rounded-f text-[10.5px] font-semibold border border-white/[0.08] text-t-secondary hover:text-t-primary hover:border-white/[0.15] transition-all mb-3"
      >
        Neighborhood Stats
      </button>
    </>
  );
}

function FactorsTab({ hood }: { hood: Neighborhood }) {
  return (
    <>
      <div className="mb-3">
        <div className="text-[10px] font-bold text-t-muted uppercase tracking-[1px] py-2">
          Investment Factors
        </div>
        {hood.factors.map((f: Neighborhood["factors"][number]) => (
          <div
            key={f.key}
            className="flex items-center justify-between gap-3 py-[7px] border-b border-white/[0.02] last:border-none"
          >
            <span className="text-[11.5px] text-t-secondary min-w-0 pr-2">
              {f.name}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <div
                className="w-[56px] h-[3px] rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${f.value}%`,
                    background: scoreColor(f.value),
                  }}
                />
              </div>
              <span
                className="text-[11.5px] font-semibold font-mono min-w-[24px] text-right"
                style={{ color: scoreColor(f.value) }}
              >
                {f.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2">
        <div className="text-[10px] font-bold text-t-muted uppercase tracking-[1px] py-2">
          Methodology
        </div>
        <div className="rounded-f p-[14px] border border-white/[0.04] bg-white/[0.02] relative">
          <div
            className="absolute top-0 left-0 right-0 h-[2px] rounded-t-f"
            style={{ background: "linear-gradient(90deg,#3b82f6,#06b6d4)" }}
          />
          <p className="text-[10.5px] leading-[1.7] text-t-secondary">
            Composite scores derive from 14 z-scored indicators spanning Census
            ACS 5-year estimates, CoStar market analytics, Zillow ZHVI, City of
            Chicago permit data, CTA ridership, and CPD CLEAR crime data. Each
            indicator is normalized to 0–100 and weighted against historical
            3-year appreciation outcomes. Confidence intervals are bootstrapped
            at 95%.
          </p>
        </div>
      </div>
    </>
  );
}

function MemoTab({
  hood,
  score,
  onOpenMemo,
}: {
  hood: Neighborhood;
  score: number;
  onOpenMemo: () => void;
}) {
  const confidence = Math.min(96, 70 + Math.floor(score * 0.28));

  return (
    <>
      <div className="rounded-f p-[14px] border border-white/[0.04] bg-white/[0.02] relative mb-[14px]">
        <div
          className="absolute top-0 left-0 right-0 h-[2px] rounded-t-f"
          style={{ background: "linear-gradient(90deg,#3b82f6,#06b6d4)" }}
        />
        <div className="flex items-center gap-[6px] mb-[10px]">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#06b6d4"
            strokeWidth="2"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <span className="text-[10px] font-bold text-f-cyan uppercase tracking-[0.6px]">
            AI Investment Memo
          </span>
        </div>
        <p className="text-[11.5px] leading-[1.7] text-t-secondary">
          {hood.memo}
        </p>
      </div>

      <button
        onClick={onOpenMemo}
        className="w-full px-3 py-[8px] rounded-f text-[10.5px] font-semibold bg-f-blue text-white hover:bg-f-blue/80 transition-colors mb-3"
      >
        Open Full Memo
      </button>

      <div className="flex items-start gap-[6px] text-[9.5px] text-t-dim pt-2 border-t border-white/[0.03]">
        <span className="w-[5px] h-[5px] rounded-full bg-f-green animate-blink mt-[4px] shrink-0" />
        <span>
          Memo generated Apr 11, 2026 · Model v3.2 · Confidence: {confidence}%
        </span>
      </div>
    </>
  );
}

function CompsTab({
  hood,
  prop,
  onSelectProperty,
}: {
  hood: Neighborhood;
  prop?: Property;
  onSelectProperty: (id: number) => void;
}) {
  const excludeHood = prop ? prop.hood : hood.name;
  const comps = getProperties()
    .filter((p: Property) => p.hood !== excludeHood)
    .sort((a: Property, b: Property) => b.score - a.score)
    .slice(0, 6);

  const recBadgeStyle = (r: string) => {
    const color =
      r === "BUY"
        ? "#22c55e"
        : r === "BUILD"
        ? "#3b82f6"
        : r === "WATCH"
        ? "#f59e0b"
        : "#ef4444";

    const bg =
      r === "BUY"
        ? "rgba(34,197,94,0.12)"
        : r === "BUILD"
        ? "rgba(59,130,246,0.12)"
        : r === "WATCH"
        ? "rgba(245,158,11,0.12)"
        : "rgba(239,68,68,0.12)";

    return { color, background: bg };
  };

  return (
    <>
      <div className="text-[10px] font-bold text-t-muted uppercase tracking-[1px] py-2">
        Comparable Opportunities
      </div>

      {comps.map((c) => {
        const bs = recBadgeStyle(c.rec);
        return (
          <div
            key={c.id}
            className="flex items-center justify-between gap-3 px-3 py-[10px] rounded-f border border-white/[0.04] bg-white/[0.02] mb-[5px] cursor-pointer hover:border-white/[0.08] hover:bg-white/[0.04] transition-all"
            onClick={() => onSelectProperty(c.id)}
          >
            <div className="min-w-0 flex-1">
              <div className="text-[11.5px] font-semibold truncate">
                {c.name}
              </div>
              <div className="text-[9.5px] text-t-muted mt-[1px] truncate">
                {c.type} · {c.hood} · {c.est}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div
                className="text-[15px] font-bold font-mono"
                style={{ color: scoreColor(c.score) }}
              >
                {c.score}
              </div>
              <span
                className="text-[8px] font-bold uppercase tracking-[0.5px] px-[6px] py-[2px] rounded-[10px] inline-block mt-[2px]"
                style={bs as React.CSSProperties}
              >
                {c.rec}
              </span>
            </div>
          </div>
        );
      })}

      <div className="flex items-start gap-[6px] text-[9.5px] text-t-dim pt-3 border-t border-white/[0.03] mt-2">
        <span className="w-[5px] h-[5px] rounded-full bg-f-green animate-blink mt-[4px] shrink-0" />
        <span>
          Ranked by score proximity, geography, and asset type alignment
        </span>
      </div>
    </>
  );
}

function getMarketLabel(hood: Neighborhood) {
  if (hood.scores.stability >= 88) return "Premium Stable";
  if (hood.scores.opportunity >= 84) return "Core Growth";
  if (hood.scores.family >= 78) return "Family Strong";
  if (hood.scores.commercial >= 84) return "Commercial Strong";
  return "Balanced Market";
}

function getOpportunityType(hood: Neighborhood) {
  if (
    hood.delta.startsWith("+7") ||
    hood.delta.startsWith("+8") ||
    hood.delta.startsWith("+9")
  ) {
    return "Emerging Growth";
  }
  if (hood.scores.stability >= 88 && hood.scores.opportunity >= 80) {
    return "Stable Investment";
  }
  if (hood.scores.devReady >= 75) {
    return "Development Upside";
  }
  if (hood.scores.commercial >= 84) {
    return "Commercial Expansion";
  }
  return "Selective Opportunity";
}

function getMomentumLabel(hood: Neighborhood) {
  const deltaNum = parseFloat(hood.delta.replace("%", "").replace("+", ""));
  if (deltaNum >= 6) return "Improving";
  if (deltaNum >= 3) return "Steady";
  return "Stable";
}

function getDeltaForMetric(metric: string, hood: Neighborhood) {
  switch (metric) {
    case "appreciation":
      return hood.scores.appreciation >= 80
        ? "+3.1%"
        : hood.scores.appreciation >= 72
        ? "+1.2%"
        : "-0.4%";
    case "devReady":
      return hood.scores.devReady >= 75
        ? "+2.2%"
        : hood.scores.devReady >= 65
        ? "+1.1%"
        : "-0.5%";
    case "stability":
      return hood.scores.stability >= 85
        ? "+0.9%"
        : hood.scores.stability >= 72
        ? "+0.3%"
        : "-0.8%";
    case "family":
      return hood.scores.family >= 80
        ? "+3.1%"
        : hood.scores.family >= 70
        ? "+1.6%"
        : "-0.3%";
    case "commercial":
      return hood.scores.commercial >= 85
        ? "+4.6%"
        : hood.scores.commercial >= 72
        ? "+1.4%"
        : "-0.6%";
    default:
      return "+0.0%";
  }
}

function getKeyDrivers(hood: Neighborhood) {
  const drivers: string[] = [];

  if (hood.scores.commercial >= 84)
    drivers.push("High commercial corridor momentum");
  if (hood.scores.devReady >= 74)
    drivers.push("Growing permit and development activity");
  if (hood.scores.stability >= 84)
    drivers.push("Strong market stability and lower downside risk");
  if (hood.scores.family >= 78)
    drivers.push("Healthy family demand and neighborhood retention");
  if (hood.scores.appreciation >= 80)
    drivers.push("Strong forward appreciation potential");
  if (hood.scores.opportunity >= 86)
    drivers.push("High overall investment opportunity score");

  for (const strength of hood.strengths) {
    if (drivers.length >= 4) break;

    if (/transit|line|connectivity/i.test(strength)) {
      drivers.push("High transit accessibility");
      continue;
    }
    if (/income/i.test(strength)) {
      drivers.push("Strong median income profile");
      continue;
    }
    if (/permit|development|parcel/i.test(strength)) {
      drivers.push("Growing permit activity");
      continue;
    }
    if (/retail|commercial|corridor|office/i.test(strength)) {
      drivers.push("Expanding commercial demand");
      continue;
    }
  }

  return Array.from(new Set(drivers)).slice(0, 4);
}