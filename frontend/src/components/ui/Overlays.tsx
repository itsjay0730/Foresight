"use client";

import { Plus, Minus, Crosshair } from "lucide-react";

/* ═══════ MAP CONTROLS ═══════ */
export function MapControls({ mapRef }: { mapRef: React.MutableRefObject<any> }) {
  return (
    <div className="fixed bottom-5 left-4 z-[900] flex flex-col gap-[3px]">
      {[
        { icon: <Plus size={16} />, action: () => mapRef.current?.zoomIn() },
        { icon: <Minus size={16} />, action: () => mapRef.current?.zoomOut() },
        { icon: <Crosshair size={14} />, action: () => mapRef.current?.flyTo([41.8781, -87.6298], 12, { duration: 0.7 }) },
      ].map((btn, i) => (
        <button key={i} onClick={btn.action}
          className="w-9 h-9 rounded-f flex items-center justify-center text-t-muted hover:text-t-primary transition-all cursor-pointer"
          style={{ background: "rgba(12,16,28,0.62)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {btn.icon}
        </button>
      ))}
    </div>
  );
}

/* ═══════ LEGEND ═══════ */
export function Legend() {
  return (
    <div className="fixed bottom-5 left-[70px] z-[900] flex items-center gap-[14px] px-4 py-[10px] rounded-f-lg text-[10px] shadow-glass"
      style={{ background: "rgba(12,16,28,0.62)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <span className="font-bold text-t-secondary uppercase tracking-[0.5px] text-[9px]">Score</span>
      {[
        { color: "#22c55e", label: "80+ Strong" },
        { color: "#f59e0b", label: "70–79 Moderate" },
        { color: "#ef4444", label: "60–69 Caution" },
        { color: "#a855f7", label: "<60 Avoid" },
      ].map(item => (
        <div key={item.label} className="flex items-center gap-[5px] text-t-muted">
          <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
          {item.label}
        </div>
      ))}
      <div className="w-px h-4 bg-white/5" />
      <div className="flex items-center gap-[5px] text-t-muted">
        <div className="w-[10px] h-[10px] rounded-full border-2" style={{ borderColor: "rgba(255,255,255,0.15)" }} />
        Zone
      </div>
      <div className="flex items-center gap-[5px] text-t-muted">
        <div className="w-[7px] h-[7px] rounded-full bg-f-blue" />
        Site
      </div>
    </div>
  );
}

/* ═══════ BOTTOM TRAY ═══════ */
interface TrayStats {
  total: number;
  buy: number;
  build: number;
  watch: number;
  avoid: number;
  pipeline: string;
}

export function BottomTray({ stats }: { stats: TrayStats }) {
  return (
    <div className="fixed bottom-5 z-[900] flex justify-center" style={{ right: "410px", left: "200px" }}>
      <div className="flex items-center gap-5 px-[18px] py-2 rounded-f-lg text-[10px] text-t-muted shadow-glass"
        style={{ background: "rgba(12,16,28,0.62)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.06)" }}>
        {[
          { val: stats.total, label: "Sites", color: "#eaf0fa" },
          { val: stats.buy, label: "Buy", color: "#22c55e" },
          { val: stats.build, label: "Build", color: "#3b82f6" },
          { val: stats.watch, label: "Watch", color: "#f59e0b" },
          { val: stats.avoid, label: "Avoid", color: "#ef4444" },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-[6px]">
            <span className="font-mono font-semibold text-[13px]" style={{ color: s.color }}>{s.val}</span>
            <span className="text-[9px] uppercase tracking-[0.5px]">{s.label}</span>
          </div>
        ))}
        <div className="w-px h-4 bg-white/5" />
        <div className="flex items-center gap-[6px]">
          <span className="font-mono font-semibold text-[13px] text-t-primary">{stats.pipeline}</span>
          <span className="text-[9px] uppercase tracking-[0.5px]">Pipeline</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════ NOTIFICATION TOAST ═══════ */
export function Notification({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div className={`fixed top-[72px] left-1/2 z-[3000] px-5 py-[10px] rounded-f text-[12px] font-semibold shadow-deep transition-all duration-300 pointer-events-none ${
      visible ? "opacity-100 -translate-x-1/2 translate-y-0" : "opacity-0 -translate-x-1/2 -translate-y-5"
    }`}
    style={{ background: "rgba(10,14,24,0.92)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.06)" }}>
      {message}
    </div>
  );
}