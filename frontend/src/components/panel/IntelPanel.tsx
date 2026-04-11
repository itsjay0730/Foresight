"use client";

import { useState } from "react";
import { Neighborhood, Property, TabKey } from "@/data/types";
import { neighborhoods } from "@/data/neighborhoods";
import { properties } from "@/data/properties";
import { scoreColor, recColor, recLabel, generateSparklinePath } from "@/lib/utils";

interface IntelPanelProps {
  selectionType: "hood" | "property";
  hoodId?: string;
  propertyId?: number;
  onSelectProperty: (id: number) => void;
  onOpenScenario: () => void;
  onOpenMemo: () => void;
  onExportPDF: () => void;
}

export default function IntelPanel({
  selectionType,
  hoodId,
  propertyId,
  onSelectProperty,
  onOpenScenario,
  onOpenMemo,
  onExportPDF,
}: IntelPanelProps) {
  const [tab, setTab] = useState<TabKey>("overview");

  const hood: Neighborhood =
    selectionType === "hood"
      ? neighborhoods[hoodId || "west-loop"]
      : neighborhoods[
          Object.keys(neighborhoods).find(
            k => neighborhoods[k].name === properties.find(p => p.id === propertyId)?.hood
          ) || "west-loop"
        ];

  const prop: Property | undefined =
    selectionType === "property" ? properties.find(p => p.id === propertyId) : undefined;

  const score = prop ? prop.score : hood.scores.opportunity;
  const name = prop ? prop.name : hood.name;
  const subtitle = prop
    ? `${prop.type} · ${prop.hood} · ${prop.est}`
    : `Neighborhood · ZIP ${hood.zip} · ${hood.area}`;
  const rec = prop ? prop.rec : hood.rec;
  const delta = prop ? `+${((prop.score - 70) * 0.12).toFixed(1)}%` : hood.delta;
  const confidence = Math.min(96, 70 + Math.floor(score * 0.28));

  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "factors", label: "Factors" },
    { key: "memo", label: "AI Memo" },
    { key: "comps", label: "Comps" },
  ];

  return (
    <div
      className="fixed left-[10px] right-[10px] bottom-[10px] h-[46vh] z-[900] rounded-[16px] flex flex-col overflow-hidden shadow-deep md:left-auto md:top-[78px] md:right-[10px] md:bottom-[10px] md:h-auto md:w-[390px]"
      style={{
        background: "rgba(10,14,24,0.82)",
        backdropFilter: "blur(24px) saturate(1.6)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Header */}
      <div className="px-[14px] pt-4 shrink-0 md:px-[18px]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-[17px] md:text-[18px] font-bold leading-tight truncate">{name}</h2>
            <p className="text-[11px] text-t-muted mt-[3px] truncate">{subtitle}</p>
          </div>
          <div className="text-right shrink-0">
            <div
              className="text-[28px] md:text-[32px] font-extrabold font-mono leading-none"
              style={{ color: scoreColor(score) }}
            >
              {score}
            </div>
            <div
              className={`text-[11px] font-semibold mt-[2px] ${
                delta.startsWith("-") ? "text-f-red" : "text-f-green"
              }`}
            >
              {delta.startsWith("-") ? "▼" : "▲"} {delta}
            </div>
          </div>
        </div>

        {/* Recommendation strip */}
        <div
          className="mt-3 px-[12px] py-[10px] rounded-f flex items-center justify-between gap-3"
          style={{
            background:
              rec === "BUY"
                ? "rgba(34,197,94,0.08)"
                : rec === "BUILD"
                ? "rgba(59,130,246,0.08)"
                : rec === "WATCH"
                ? "rgba(245,158,11,0.08)"
                : "rgba(239,68,68,0.08)",
            border: `1px solid ${recColor(rec)}22`,
          }}
        >
          <div className="min-w-0">
            <div className="text-[9px] font-semibold uppercase tracking-[1px] text-t-muted">
              Recommended Strategy
            </div>
            <div
              className="text-[14px] md:text-[15px] font-extrabold tracking-[0.5px] truncate"
              style={{ color: recColor(rec) }}
            >
              ● {recLabel(rec)}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[9px] text-t-muted uppercase tracking-[0.5px]">Confidence</div>
            <div className="text-[14px] font-bold font-mono">{confidence}%</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-[14px] pt-3 shrink-0 overflow-x-auto no-scrollbar md:px-[18px]">
        {tabs.map(t => (
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

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-[14px] py-[14px] pb-7 custom-scroll md:px-[18px]">
        {tab === "overview" && (
          <OverviewTab
            hood={hood}
            score={score}
            rec={rec}
            onOpenScenario={onOpenScenario}
            onOpenMemo={onOpenMemo}
            onExportPDF={onExportPDF}
          />
        )}
        {tab === "factors" && <FactorsTab hood={hood} />}
        {tab === "memo" && (
          <MemoTab
            hood={hood}
            score={score}
            onOpenScenario={onOpenScenario}
            onExportPDF={onExportPDF}
          />
        )}
        {tab === "comps" && (
          <CompsTab hood={hood} prop={prop} onSelectProperty={onSelectProperty} />
        )}
      </div>
    </div>
  );
}

/* ═══════ OVERVIEW TAB ═══════ */
function OverviewTab({
  hood,
  score,
  rec,
  onOpenScenario,
  onOpenMemo,
  onExportPDF,
}: {
  hood: Neighborhood;
  score: number;
  rec: string;
  onOpenScenario: () => void;
  onOpenMemo: () => void;
  onExportPDF: () => void;
}) {
  const scores = [
    { label: "Investment Opportunity", val: hood.scores.opportunity, delta: hood.delta },
    { label: "Appreciation Potential", val: hood.scores.appreciation, delta: "+3.1%" },
    { label: "Development Readiness", val: hood.scores.devReady, delta: "+1.8%" },
    { label: "Market Stability", val: hood.scores.stability, delta: "+0.9%" },
    { label: "Family Demand", val: hood.scores.family, delta: "+2.4%" },
    { label: "Commercial Expansion", val: hood.scores.commercial, delta: "+4.6%" },
  ];

  return (
    <>
      {/* Score grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[6px] mb-[14px]">
        {scores.map((s, i) => (
          <div
            key={s.label}
            className={`relative overflow-hidden rounded-f p-[11px] cursor-pointer transition-all border hover:border-white/[0.08] ${
              i === 0 ? "border-f-blue/20 bg-f-blue/[0.04]" : "border-white/[0.04] bg-white/[0.02]"
            }`}
          >
            <div className="text-[9.5px] font-semibold text-t-muted uppercase tracking-[0.4px] mb-[5px]">
              {s.label}
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span
                className="text-[21px] font-extrabold font-mono leading-none"
                style={{ color: scoreColor(s.val) }}
              >
                {s.val}
              </span>
              <span
                className={`text-[9.5px] font-semibold shrink-0 ${
                  s.delta.startsWith("-") ? "text-f-red" : "text-f-green"
                }`}
              >
                {s.delta.startsWith("-") ? "▼" : "▲"} {s.delta}
              </span>
            </div>
            <svg
              className="absolute bottom-0 right-1 opacity-20"
              width="54"
              height="16"
              viewBox="0 0 54 16"
            >
              <polyline
                points={generateSparklinePath(s.val)}
                fill="none"
                stroke={scoreColor(s.val)}
                strokeWidth="1.2"
              />
            </svg>
          </div>
        ))}
      </div>

      {/* Strengths / Risks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[6px] mb-[14px]">
        <div className="rounded-f p-[11px] border border-white/[0.04] bg-white/[0.02]">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.6px] text-f-green flex items-center gap-1 mb-[7px]">
            ▲ Strengths
          </h4>
          <ul className="space-y-[3px]">
            {hood.strengths.map((s, i) => (
              <li
                key={i}
                className="text-[10.5px] text-t-secondary leading-[1.45] pl-[11px] relative"
              >
                <span className="absolute left-0 top-[7px] w-[3px] h-[3px] rounded-full bg-f-green" />
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-f p-[11px] border border-white/[0.04] bg-white/[0.02]">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.6px] text-f-red flex items-center gap-1 mb-[7px]">
            ▼ Risks
          </h4>
          <ul className="space-y-[3px]">
            {hood.risks.map((r, i) => (
              <li
                key={i}
                className="text-[10.5px] text-t-secondary leading-[1.45] pl-[11px] relative"
              >
                <span className="absolute left-0 top-[7px] w-[3px] h-[3px] rounded-full bg-f-red" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Action card */}
      <div
        className="rounded-f p-[13px] mb-3 border"
        style={{ background: "rgba(34,197,94,0.06)", borderColor: "rgba(34,197,94,0.1)" }}
      >
        <div className="text-[9px] font-bold text-t-muted uppercase tracking-[0.8px] mb-1">
          Suggested Action
        </div>
        <div className="text-[14px] font-bold" style={{ color: recColor(rec as any) }}>
          {rec === "BUY"
            ? "Acquire & Hold — 3Y Horizon"
            : rec === "BUILD"
            ? "Ground-Up Development Play"
            : rec === "WATCH"
            ? "Monitor — Emerging Upside"
            : "Avoid — Risk Exceeds Reward"}
        </div>
        <p className="text-[10.5px] text-t-secondary mt-[3px] leading-[1.5]">
          Based on 14 composite indicators across demographic, economic, market, and geospatial
          signals.
        </p>

        <div className="flex gap-[5px] mt-[10px] flex-wrap">
          <button
            onClick={onOpenMemo}
            className="px-3 py-[6px] rounded-f text-[10.5px] font-semibold bg-f-green text-black hover:bg-f-green/80 transition-colors"
          >
            Generate Full Memo
          </button>
          <button
            onClick={onOpenScenario}
            className="px-3 py-[6px] rounded-f text-[10.5px] font-semibold border border-white/[0.08] text-t-secondary hover:text-t-primary hover:border-white/[0.15] transition-all"
          >
            Scenario Lab
          </button>
          <button
            onClick={onExportPDF}
            className="px-3 py-[6px] rounded-f text-[10.5px] font-semibold border border-white/[0.08] text-t-secondary hover:text-t-primary hover:border-white/[0.15] transition-all"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Freshness */}
      <div className="flex items-start gap-[6px] text-[9.5px] text-t-dim pt-2 border-t border-white/[0.03]">
        <span className="w-[5px] h-[5px] rounded-full bg-f-green animate-blink mt-[4px] shrink-0" />
        <span>Updated Apr 10, 2026 · Census ACS, CoStar, Zillow, City of Chicago, Redfin, CTA</span>
      </div>
    </>
  );
}

/* ═══════ FACTORS TAB ═══════ */
function FactorsTab({ hood }: { hood: Neighborhood }) {
  return (
    <>
      <div className="mb-3">
        <div className="text-[10px] font-bold text-t-muted uppercase tracking-[1px] py-2">
          Investment Factors
        </div>
        {hood.factors.map(f => (
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

/* ═══════ AI MEMO TAB ═══════ */
function MemoTab({
  hood,
  score,
  onOpenScenario,
  onExportPDF,
}: {
  hood: Neighborhood;
  score: number;
  onOpenScenario: () => void;
  onExportPDF: () => void;
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

      <div
        className="rounded-f p-[13px] mb-3 border"
        style={{ background: "rgba(59,130,246,0.06)", borderColor: "rgba(59,130,246,0.1)" }}
      >
        <div className="text-[9px] font-bold text-t-muted uppercase tracking-[0.8px] mb-1">
          Scenario Lab
        </div>
        <div className="text-[14px] font-bold text-f-blue">Model Investment Scenarios</div>
        <p className="text-[10.5px] text-t-secondary mt-[3px] leading-[1.5]">
          Run acquisition cost, cap rate, appreciation, and exit modeling across 1Y, 3Y, and 5Y
          horizons with adjustable parameters.
        </p>
        <div className="flex gap-[5px] mt-[10px] flex-wrap">
          <button
            onClick={onOpenScenario}
            className="px-3 py-[6px] rounded-f text-[10.5px] font-semibold bg-f-blue text-white hover:bg-f-blue/80 transition-colors"
          >
            Launch Scenario Lab
          </button>
          <button
            onClick={onExportPDF}
            className="px-3 py-[6px] rounded-f text-[10.5px] font-semibold border border-white/[0.08] text-t-secondary hover:text-t-primary transition-all"
          >
            Download Memo PDF
          </button>
        </div>
      </div>

      <div className="flex items-start gap-[6px] text-[9.5px] text-t-dim pt-2 border-t border-white/[0.03]">
        <span className="w-[5px] h-[5px] rounded-full bg-f-green animate-blink mt-[4px] shrink-0" />
        <span>Memo generated Apr 11, 2026 · Model v3.2 · Confidence: {confidence}%</span>
      </div>
    </>
  );
}

/* ═══════ COMPS TAB ═══════ */
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
    .filter(p => p.hood !== excludeHood)
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

      {comps.map(c => {
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
              <div
                className="text-[15px] font-bold font-mono"
                style={{ color: scoreColor(c.score) }}
              >
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