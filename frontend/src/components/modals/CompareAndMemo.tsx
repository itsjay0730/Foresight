"use client";

import { X } from "lucide-react";
import { neighborhoods, neighborhoodList } from "@/data/neighborhoods";
import { properties } from "@/data/properties";
import { scoreColor, recColor } from "@/lib/utils";

/* ═══════ COMPARE MODAL ═══════ */
export function CompareModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  const sorted = [...neighborhoodList].sort(
    (a, b) => b.scores.opportunity - a.scores.opportunity
  );

  const recBadge = (rec: string) => {
    const bg =
      rec === "BUY"
        ? "rgba(34,197,94,0.12)"
        : rec === "BUILD"
        ? "rgba(59,130,246,0.12)"
        : rec === "WATCH"
        ? "rgba(245,158,11,0.12)"
        : "rgba(239,68,68,0.12)";
    const color = recColor(rec as any);

    return (
      <span
        className="text-[8px] font-bold uppercase tracking-[0.5px] px-[6px] py-[2px] rounded-[10px] inline-block"
        style={{ background: bg, color }}
      >
        {rec}
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-3 md:p-5"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(10px)" }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[1100px] max-h-[88vh] overflow-y-auto rounded-[16px] p-4 md:p-7 relative custom-scroll"
        style={{
          background: "rgba(10,14,24,0.92)",
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

        <h2 className="text-[18px] md:text-[20px] font-bold pr-8">Neighborhood Comparison</h2>
        <p className="text-[12px] text-t-muted mb-5">
          All {sorted.length} tracked neighborhoods · Sorted by Investment Opportunity Score
        </p>

        <div className="overflow-x-auto custom-scroll">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr>
                {[
                  "Neighborhood",
                  "Score",
                  "Apprec.",
                  "Dev",
                  "Stability",
                  "Family",
                  "Comm.",
                  "Delta",
                  "Strategy",
                ].map(h => (
                  <th
                    key={h}
                    className="text-[9px] uppercase tracking-[0.8px] text-t-dim text-left px-[10px] py-2 border-b border-white/[0.05] whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(h => (
                <tr key={h.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="text-[11px] font-semibold px-[10px] py-2 border-b border-white/[0.02] whitespace-nowrap">
                    {h.name}
                  </td>
                  <td
                    className="text-[11px] font-mono font-semibold px-[10px] py-2 border-b border-white/[0.02]"
                    style={{ color: scoreColor(h.scores.opportunity) }}
                  >
                    {h.scores.opportunity}
                  </td>
                  <td className="text-[11px] font-mono font-semibold px-[10px] py-2 border-b border-white/[0.02]">
                    {h.scores.appreciation}
                  </td>
                  <td className="text-[11px] font-mono font-semibold px-[10px] py-2 border-b border-white/[0.02]">
                    {h.scores.devReady}
                  </td>
                  <td className="text-[11px] font-mono font-semibold px-[10px] py-2 border-b border-white/[0.02]">
                    {h.scores.stability}
                  </td>
                  <td className="text-[11px] font-mono font-semibold px-[10px] py-2 border-b border-white/[0.02]">
                    {h.scores.family}
                  </td>
                  <td className="text-[11px] font-mono font-semibold px-[10px] py-2 border-b border-white/[0.02]">
                    {h.scores.commercial}
                  </td>
                  <td className="text-[11px] font-mono font-semibold px-[10px] py-2 border-b border-white/[0.02] text-f-green whitespace-nowrap">
                    {h.delta}
                  </td>
                  <td className="px-[10px] py-2 border-b border-white/[0.02]">
                    {recBadge(h.rec)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════ FULL MEMO MODAL ═══════ */
export function MemoFullModal({
  open,
  onClose,
  selectionType,
  hoodId,
  propertyId,
  onNotify,
}: {
  open: boolean;
  onClose: () => void;
  selectionType: "hood" | "property";
  hoodId?: string;
  propertyId?: number;
  onNotify: (msg: string) => void;
}) {
  if (!open) return null;

  const hood = neighborhoods[hoodId || "west-loop"];
  const prop = selectionType === "property" ? properties.find(p => p.id === propertyId) : undefined;
  const name = prop ? prop.name : hood.name;
  const score = prop ? prop.score : hood.scores.opportunity;
  const confidence = Math.min(96, 70 + Math.floor(score * 0.28));

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-3 md:p-5"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(10px)" }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[820px] max-h-[88vh] overflow-y-auto rounded-[16px] p-4 md:p-7 relative custom-scroll"
        style={{
          background: "rgba(10,14,24,0.92)",
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

        <h2 className="text-[18px] md:text-[20px] font-bold pr-8">Investment Memo · {name}</h2>
        <p className="text-[12px] text-t-muted mb-5">Full analyst-grade investment memorandum</p>

        {/* Memo body */}
        <div className="rounded-f p-[14px] border border-white/[0.04] bg-white/[0.02] relative mb-4">
          <div
            className="absolute top-0 left-0 right-0 h-[2px] rounded-t-f"
            style={{ background: "linear-gradient(90deg,#3b82f6,#06b6d4)" }}
          />
          <div className="flex items-center gap-[6px] mb-[10px]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span className="text-[10px] font-bold text-f-cyan uppercase tracking-[0.6px]">
              Executive Summary
            </span>
          </div>
          <p className="text-[11.5px] leading-[1.7] text-t-secondary">{hood.memo}</p>
        </div>

        {/* Score grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px] mb-4">
          {[
            { label: "Investment Score", value: score, color: scoreColor(score) },
            { label: "Confidence", value: `${confidence}%`, color: "#3b82f6" },
            { label: "Recommendation", value: hood.rec, color: recColor(hood.rec) },
            { label: "Horizon", value: "3–5 Years", color: "#eaf0fa" },
          ].map(item => (
            <div key={item.label} className="rounded-f p-3 border border-white/[0.04] bg-white/[0.02]">
              <div className="text-[9.5px] font-semibold text-t-muted uppercase tracking-[0.4px] mb-1">
                {item.label}
              </div>
              <div className="text-[18px] font-extrabold font-mono" style={{ color: item.color }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Strengths / Risks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px] mb-5">
          <div className="rounded-f p-3 border border-white/[0.04] bg-white/[0.02]">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.6px] text-f-green mb-2">
              ▲ Key Strengths
            </h4>
            <ul className="space-y-1">
              {hood.strengths.map((s, i) => (
                <li key={i} className="text-[10.5px] text-t-secondary pl-3 relative">
                  <span className="absolute left-0 top-[7px] w-[3px] h-[3px] rounded-full bg-f-green" />
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-f p-3 border border-white/[0.04] bg-white/[0.02]">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.6px] text-f-red mb-2">
              ▼ Key Risks
            </h4>
            <ul className="space-y-1">
              {hood.risks.map((r, i) => (
                <li key={i} className="text-[10.5px] text-t-secondary pl-3 relative">
                  <span className="absolute left-0 top-[7px] w-[3px] h-[3px] rounded-full bg-f-red" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => onNotify("PDF exported · Check your downloads")}
            className="px-4 py-[7px] rounded-f text-[11px] font-semibold bg-f-blue text-white hover:bg-f-blue/80 transition-colors"
          >
            Export as PDF
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`Foresight Investment Memo: ${name}`);
              onNotify("Memo copied to clipboard");
            }}
            className="px-4 py-[7px] rounded-f text-[11px] font-semibold border border-white/[0.08] text-t-secondary hover:text-t-primary transition-all"
          >
            Copy to Clipboard
          </button>
          <button
            onClick={onClose}
            className="px-4 py-[7px] rounded-f text-[11px] font-semibold border border-white/[0.08] text-t-secondary hover:text-t-primary transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}