"use client";

import { Neighborhood, Property } from "@/data/types";
import { neighborhoods } from "@/data/neighborhoods";
import { properties } from "@/data/properties";
import { scoreColor, recColor, recLabel, generateSparklinePath } from "@/lib/utils";

interface IntelPanelProps {
  selectionType: "hood" | "property";
  hoodId?: string;
  propertyId?: number;
  onSelectProperty: (id: number) => void;
  onOpenMemo: () => void;
  onOpenNeighborhoodStats: () => void;
}

export default function IntelPanel({
  selectionType,
  hoodId,
  propertyId,
  onSelectProperty,
  onOpenMemo,
  onOpenNeighborhoodStats,
}: IntelPanelProps) {
  const hood: Neighborhood =
    selectionType === "hood"
      ? neighborhoods[hoodId || "west-loop"]
      : neighborhoods[
          Object.keys(neighborhoods).find(
            (k) => neighborhoods[k].name === properties.find((p) => p.id === propertyId)?.hood
          ) || "west-loop"
        ];

  const prop: Property | undefined =
    selectionType === "property" ? properties.find((p) => p.id === propertyId) : undefined;

  const score = prop ? prop.score : hood.scores.opportunity;
  const name = prop ? prop.name : hood.name;
  const subtitle = `${hood.zip} • ${getMarketLabel(hood)} • ${getOpportunityType(hood)}`;
  const rec = prop ? prop.rec : hood.rec;
  const delta = prop ? `+${((prop.score - 70) * 0.12).toFixed(1)}%` : hood.delta;
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
            <h2 className="text-[17px] md:text-[18px] font-bold leading-tight truncate">{name}</h2>
            <p className="text-[11px] text-t-muted mt-[4px] truncate">{subtitle}</p>
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

      {/* Tabs intentionally commented out for now to make this one continuous intelligence column */}
      {/*
      <div className="flex px-[14px] pt-3 shrink-0 overflow-x-auto no-scrollbar md:px-[18px]">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`px-[13px] py-2 text-[11px] font-semibold tracking-[0.2px] border-b-2 transition-all whitespace-nowrap ${
              tab === t.key
                ? "text-f-blue border-f-blue"
                : "text-t-muted border-transparent hover:text-t-secondary"
            }`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="h-px mx-[14px] bg-white/5 shrink-0 md:mx-[18px]" />
      */}

      <div className="flex-1 overflow-y-auto px-[14px] py-[14px] pb-7 custom-scroll md:px-[18px]">
        <OverviewContent
          hood={hood}
          rec={rec}
          confidence={confidence}
          onOpenMemo={onOpenMemo}
          onOpenNeighborhoodStats={onOpenNeighborhoodStats}
        />

        {/* Keep these sections commented out for now, do not remove yet */}
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
}: {
  label: string;
  value: number;
  delta: string;
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
    </div>
  );
}

function OverviewContent({
  hood,
  rec,
  confidence,
  onOpenMemo,
  onOpenNeighborhoodStats,
}: {
  hood: Neighborhood;
  rec: string;
  confidence: number;
  onOpenMemo: () => void;
  onOpenNeighborhoodStats: () => void;
}) {
  const scores = [
    { label: "Investment Opportunity", val: hood.scores.opportunity, delta: hood.delta },
    { label: "Appreciation Potential", val: hood.scores.appreciation, delta: getDeltaForMetric("appreciation", hood) },
    { label: "Development Readiness", val: hood.scores.devReady, delta: getDeltaForMetric("devReady", hood) },
    { label: "Market Stability", val: hood.scores.stability, delta: getDeltaForMetric("stability", hood) },
    { label: "Family Demand", val: hood.scores.family, delta: getDeltaForMetric("family", hood) },
    { label: "Commercial Expansion", val: hood.scores.commercial, delta: getDeltaForMetric("commercial", hood) },
  ];

  const drivers = getKeyDrivers(hood);

  return (
    <>
      {/* "Overview" heading intentionally removed, content remains as one continuous analysis */}

      <div className="rounded-f p-[13px] border border-white/[0.04] bg-white/[0.02] mb-[14px]">
        <div className="text-[10px] font-bold uppercase tracking-[0.8px] text-t-muted mb-[10px]">
          Key Drivers
        </div>
        <ul className="space-y-[7px]">
          {drivers.map((driver, i) => (
            <li key={i} className="text-[10.8px] text-t-secondary leading-[1.45] pl-[12px] relative">
              <span className="absolute left-0 top-[6px] w-[4px] h-[4px] rounded-full bg-f-cyan" />
              {driver}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[8px] mb-[14px]">
        {scores.map((s) => (
          <MetricCard key={s.label} label={s.label} value={s.val} delta={s.delta} />
        ))}
      </div>

      <div
        className="rounded-f p-[13px] mb-3 border"
        style={{ background: "rgba(34,197,94,0.06)", borderColor: "rgba(34,197,94,0.1)" }}
      >
        <div className="text-[9px] font-bold text-t-muted uppercase tracking-[0.8px] mb-[6px]">
          Recommended Strategy
        </div>

        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[22px] font-extrabold tracking-[0.3px]" style={{ color: recColor(rec as any) }}>
              {rec}
            </div>
            <div className="text-[10px] text-t-muted mt-[8px]">Opportunity Type</div>
            <div className="text-[11px] font-semibold text-t-primary mt-[2px]">
              {getOpportunityType(hood)}
            </div>
            <div className="text-[10px] text-t-muted mt-[8px]">Momentum</div>
            <div className="text-[11px] font-semibold text-t-primary mt-[2px]">
              {getMomentumLabel(hood)}
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

      {/* <div className="flex gap-[5px] mt-[10px] mb-3 flex-wrap">
        <button
          onClick={onOpenMemo}
          className="px-3 py-[6px] rounded-f text-[10.5px] font-semibold bg-f-green text-black hover:bg-f-green/80 transition-colors"
        >
          Generate Full Memo
        </button>
      </div> */}

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
        {hood.factors.map((f) => (
          <div
            key={f.key}
            className="flex items-center justify-between gap-3 py-[7px] border-b border-white/[0.02] last:border-none"
          >
            <span className="text-[11.5px] text-t-secondary min-w-0 pr-2">{f.name}</span>
            <div className="flex items-center gap-2 shrink-0">
              <div
                className="w-[56px] h-[3px] rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${f.value}%`, background: scoreColor(f.value) }}
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
            Composite scores derive from 14 z-scored indicators spanning Census ACS 5-year
            estimates, CoStar market analytics, Zillow ZHVI, City of Chicago permit data, CTA
            ridership, and CPD CLEAR crime data. Each indicator is normalized to 0–100 and
            weighted against historical 3-year appreciation outcomes. Confidence intervals are
            bootstrapped at 95%.
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <span className="text-[10px] font-bold text-f-cyan uppercase tracking-[0.6px]">
            AI Investment Memo
          </span>
        </div>
        <p className="text-[11.5px] leading-[1.7] text-t-secondary">{hood.memo}</p>
      </div>

      <button
        onClick={onOpenMemo}
        className="w-full px-3 py-[8px] rounded-f text-[10.5px] font-semibold bg-f-blue text-white hover:bg-f-blue/80 transition-colors mb-3"
      >
        Open Full Memo
      </button>

      <div className="flex items-start gap-[6px] text-[9.5px] text-t-dim pt-2 border-t border-white/[0.03]">
        <span className="w-[5px] h-[5px] rounded-full bg-f-green animate-blink mt-[4px] shrink-0" />
        <span>Memo generated Apr 11, 2026 · Model v3.2 · Confidence: {confidence}%</span>
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
  const comps = properties
    .filter((p) => p.hood !== excludeHood)
    .sort((a, b) => b.score - a.score)
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
              <div className="text-[11.5px] font-semibold truncate">{c.name}</div>
              <div className="text-[9.5px] text-t-muted mt-[1px] truncate">
                {c.type} · {c.hood} · {c.est}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[15px] font-bold font-mono" style={{ color: scoreColor(c.score) }}>
                {c.score}
              </div>
              <span
                className="text-[8px] font-bold uppercase tracking-[0.5px] px-[6px] py-[2px] rounded-[10px] inline-block mt-[2px]"
                style={bs}
              >
                {c.rec}
              </span>
            </div>
          </div>
        );
      })}

      <div className="flex items-start gap-[6px] text-[9.5px] text-t-dim pt-3 border-t border-white/[0.03] mt-2">
        <span className="w-[5px] h-[5px] rounded-full bg-f-green animate-blink mt-[4px] shrink-0" />
        <span>Ranked by score proximity, geography, and asset type alignment</span>
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
  if (hood.delta.startsWith("+7") || hood.delta.startsWith("+8") || hood.delta.startsWith("+9")) {
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
      return hood.scores.appreciation >= 80 ? "+3.1%" : hood.scores.appreciation >= 72 ? "+1.2%" : "-0.4%";
    case "devReady":
      return hood.scores.devReady >= 75 ? "+2.2%" : hood.scores.devReady >= 65 ? "+1.1%" : "-0.5%";
    case "stability":
      return hood.scores.stability >= 85 ? "+0.9%" : hood.scores.stability >= 72 ? "+0.3%" : "-0.8%";
    case "family":
      return hood.scores.family >= 80 ? "+3.1%" : hood.scores.family >= 70 ? "+1.6%" : "-0.3%";
    case "commercial":
      return hood.scores.commercial >= 85 ? "+4.6%" : hood.scores.commercial >= 72 ? "+1.4%" : "-0.6%";
    default:
      return "+0.0%";
  }
}

function getKeyDrivers(hood: Neighborhood) {
  const drivers: string[] = [];

  if (hood.scores.commercial >= 84) drivers.push("High commercial corridor momentum");
  if (hood.scores.devReady >= 74) drivers.push("Growing permit and development activity");
  if (hood.scores.stability >= 84) drivers.push("Strong market stability and lower downside risk");
  if (hood.scores.family >= 78) drivers.push("Healthy family demand and neighborhood retention");
  if (hood.scores.appreciation >= 80) drivers.push("Strong forward appreciation potential");
  if (hood.scores.opportunity >= 86) drivers.push("High overall investment opportunity score");

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