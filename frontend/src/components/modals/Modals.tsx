"use client";
import { X } from "lucide-react";
import { NeighborhoodAgg, PlotRecord } from "@/data/types";
import { scoreColor, scoreRec, titleCase, fmtCurrency, fmtPct } from "@/lib/api";

export function CompareModal({ open, onClose, neighborhoods }: { open: boolean; onClose: () => void; neighborhoods: Record<string, NeighborhoodAgg> }) {
  if (!open) return null;
  const sorted = Object.values(neighborhoods).sort((a, b) => b.avgScore - a.avgScore);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 md:p-5" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(10px)" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-[900px] max-h-[88vh] overflow-y-auto rounded-[16px] p-4 md:p-7 relative custom-scroll" style={{ background: "rgba(10,14,24,0.94)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 16px 64px rgba(0,0,0,0.6)" }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-t-muted hover:text-t-primary transition-colors"><X size={18} /></button>
        <h2 className="text-[20px] font-bold pr-8">Neighborhood Comparison</h2>
        <p className="text-[12px] text-t-muted mb-5">{sorted.length} neighborhoods · Sorted by avg score</p>

        <div className="overflow-x-auto custom-scroll">
          <table className="w-full min-w-[700px] border-collapse">
            <thead>
              <tr>{["Neighborhood", "ZIP", "Plots", "Avg Score", "Avg Income", "Crime Trend", "Permits", "Pop Growth", "Strategy"].map(h => (
                <th key={h} className="text-[9px] uppercase tracking-[0.8px] text-t-dim text-left px-[10px] py-2 border-b border-white/[0.05] whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {sorted.map(h => {
                const r = scoreRec(h.avgScore);
                return (
                  <tr key={h.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="text-[11px] font-semibold px-[10px] py-2 border-b border-white/[0.02] whitespace-nowrap">{titleCase(h.name)}</td>
                    <td className="text-[11px] font-mono px-[10px] py-2 border-b border-white/[0.02]">{h.zip}</td>
                    <td className="text-[11px] font-mono font-semibold px-[10px] py-2 border-b border-white/[0.02]">{h.plotCount}</td>
                    <td className="text-[11px] font-mono font-semibold px-[10px] py-2 border-b border-white/[0.02]" style={{ color: scoreColor(h.avgScore) }}>{h.avgScore}</td>
                    <td className="text-[11px] font-mono px-[10px] py-2 border-b border-white/[0.02]">{fmtCurrency(h.avgIncome)}</td>
                    <td className="text-[11px] font-mono px-[10px] py-2 border-b border-white/[0.02]">{h.avgCrimeTrend != null ? fmtPct(h.avgCrimeTrend) : "—"}</td>
                    <td className="text-[11px] font-mono px-[10px] py-2 border-b border-white/[0.02]">{h.avgPermitActivity?.toFixed(1) ?? "—"}</td>
                    <td className="text-[11px] font-mono px-[10px] py-2 border-b border-white/[0.02]">{h.avgPopGrowth != null ? fmtPct(h.avgPopGrowth) : "—"}</td>
                    <td className="px-[10px] py-2 border-b border-white/[0.02]"><span className="text-[8px] font-bold uppercase tracking-[0.5px] px-[6px] py-[2px] rounded-[10px] inline-block" style={{ background: r.bg, color: r.color }}>{r.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function NeighborhoodModal({ open, onClose, hood, onSelectPlot }: { open: boolean; onClose: () => void; hood?: NeighborhoodAgg; onSelectPlot: (id: string) => void }) {
  if (!open || !hood) return null;
  const r = scoreRec(hood.avgScore);

  return (
    <div className="fixed inset-0 z-[1900] flex items-center justify-center p-3 md:p-5" style={{ background: "rgba(0,0,0,0.42)", backdropFilter: "blur(6px)" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-[760px] max-h-[82vh] overflow-y-auto rounded-[16px] p-4 md:p-6 relative custom-scroll" style={{ background: "rgba(10,14,24,0.94)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 16px 64px rgba(0,0,0,0.6)" }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-t-muted hover:text-t-primary transition-colors"><X size={18} /></button>

        <h2 className="text-[20px] font-bold pr-8">{titleCase(hood.name)}</h2>
        <p className="text-[12px] text-t-muted mt-1">ZIP {hood.zip} · {hood.plotCount} opportunity plots</p>

        <div className="mt-4 rounded-f p-[12px] border border-white/[0.04] bg-white/[0.02]">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px]">
            <div><span className="text-t-muted uppercase tracking-[0.5px] text-[9px] mr-2">Avg Score</span><span className="font-mono font-extrabold text-[18px]" style={{ color: scoreColor(hood.avgScore) }}>{hood.avgScore}</span></div>
            <div><span className="text-t-muted uppercase tracking-[0.5px] text-[9px] mr-2">Strategy</span><span className="font-semibold" style={{ color: r.color }}>{r.label}</span></div>
            <div><span className="text-t-muted uppercase tracking-[0.5px] text-[9px] mr-2">Income</span><span className="font-semibold">{fmtCurrency(hood.avgIncome)}</span></div>
          </div>
        </div>

        <div className="mt-5">
          <div className="text-[10px] font-bold text-t-muted uppercase tracking-[1px] mb-3">Opportunity Plots</div>
          <div className="space-y-[8px]">
            {hood.plots.map(p => {
              const ps = p.scores?.finalScore ?? 0;
              return (
                <button key={p.id} onClick={() => onSelectPlot(p.id)} className="w-full text-left flex items-center justify-between gap-3 px-4 py-3 rounded-f border border-white/[0.04] bg-white/[0.02] hover:border-white/[0.09] hover:bg-white/[0.04] transition-all">
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-semibold">Plot {p.id}</div>
                    <div className="text-[10.5px] text-t-muted mt-[2px]">{p.zoning} · {p.nearest_station ?? "—"} · {fmtCurrency(p.income)}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[18px] font-extrabold font-mono leading-none" style={{ color: scoreColor(ps) }}>{ps}</div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.5px] text-t-muted mt-[4px]">{scoreRec(ps).label}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
