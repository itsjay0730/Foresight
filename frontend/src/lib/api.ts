import { PlotRecord, MapDataResponse, NeighborhoodAgg } from "@/data/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchMapData(): Promise<PlotRecord[]> {
  try {
    const res = await fetch(`${API_BASE}/map-data`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data: MapDataResponse = await res.json();
    return data.results || [];
  } catch (err) {
    console.warn("API fetch failed, loading fallback data:", err);
    // Fallback: try loading from predicted_plots.json via public folder
    try {
      const fallback = await fetch("/predicted_plots.json");
      if (fallback.ok) return await fallback.json();
    } catch { /* ignore */ }
    return [];
  }
}

/* ═══ Aggregate plots into neighborhoods ═══ */
export function aggregateNeighborhoods(plots: PlotRecord[]): Record<string, NeighborhoodAgg> {
  const map: Record<string, PlotRecord[]> = {};
  for (const p of plots) {
    const key = p.neighborhood.toLowerCase().replace(/\s+/g, "-");
    if (!map[key]) map[key] = [];
    map[key].push(p);
  }

  const result: Record<string, NeighborhoodAgg> = {};
  for (const [key, groupPlots] of Object.entries(map)) {
    const scores = groupPlots.map(p => p.scores?.finalScore ?? 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const incomes = groupPlots.filter(p => p.income != null).map(p => p.income!);
    const crimes = groupPlots.filter(p => p.crime_trend != null).map(p => p.crime_trend!);
    const permits = groupPlots.filter(p => p.permit_activity != null).map(p => p.permit_activity!);
    const pops = groupPlots.filter(p => p.population_growth != null).map(p => p.population_growth!);

    const avgLat = groupPlots.reduce((a, p) => a + p.lat, 0) / groupPlots.length;
    const avgLng = groupPlots.reduce((a, p) => a + p.lng, 0) / groupPlots.length;

    result[key] = {
      id: key,
      name: groupPlots[0].neighborhood,
      zip: groupPlots[0].zip,
      lat: avgLat,
      lng: avgLng,
      avgScore,
      plotCount: groupPlots.length,
      avgIncome: incomes.length > 0 ? Math.round(incomes.reduce((a, b) => a + b, 0) / incomes.length) : null,
      avgCrimeTrend: crimes.length > 0 ? crimes.reduce((a, b) => a + b, 0) / crimes.length : null,
      avgPermitActivity: permits.length > 0 ? permits.reduce((a, b) => a + b, 0) / permits.length : null,
      avgPopGrowth: pops.length > 0 ? pops.reduce((a, b) => a + b, 0) / pops.length : null,
      plots: groupPlots.sort((a, b) => (b.scores?.finalScore ?? 0) - (a.scores?.finalScore ?? 0)),
    };
  }
  return result;
}

/* ═══ Score color ═══ */
export function scoreColor(score: number | null | undefined): string {
  if (score == null) return "#6b7280";
  if (score >= 75) return "#22c55e";
  if (score >= 55) return "#f59e0b";
  if (score >= 35) return "#ef4444";
  return "#a855f7";
}

/* ═══ Recommendation from score ═══ */
export function scoreRec(score: number | null | undefined): { label: string; color: string; bg: string } {
  if (score == null) return { label: "N/A", color: "#6b7280", bg: "rgba(107,114,128,0.1)" };
  if (score >= 75) return { label: "STRONG BUY", color: "#22c55e", bg: "rgba(34,197,94,0.08)" };
  if (score >= 60) return { label: "OPPORTUNITY", color: "#f59e0b", bg: "rgba(245,158,11,0.08)" };
  if (score >= 45) return { label: "MONITOR", color: "#3b82f6", bg: "rgba(59,130,246,0.08)" };
  if (score >= 30) return { label: "CAUTION", color: "#ef4444", bg: "rgba(239,68,68,0.08)" };
  return { label: "AVOID", color: "#a855f7", bg: "rgba(168,85,247,0.08)" };
}

/* ═══ Format helpers ═══ */
export function fmt(val: number | null | undefined, opts?: { prefix?: string; suffix?: string; decimals?: number }): string {
  if (val == null) return "N/A";
  const d = opts?.decimals ?? 0;
  const num = val.toFixed(d);
  return `${opts?.prefix ?? ""}${Number(num).toLocaleString()}${opts?.suffix ?? ""}`;
}

export function fmtPct(val: number | null | undefined): string {
  if (val == null) return "N/A";
  const sign = val >= 0 ? "+" : "";
  return `${sign}${(val * 100).toFixed(1)}%`;
}

export function fmtCurrency(val: number | null | undefined): string {
  if (val == null) return "N/A";
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toLocaleString()}`;
}

export function titleCase(s: string): string {
  return s.toLowerCase().split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
