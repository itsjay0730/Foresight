"use client";

import { Plus, Minus, Crosshair } from "lucide-react";

/* ═══════ MAP CONTROLS ═══════ */
export function MapControls({
  mapRef,
}: {
  mapRef: React.MutableRefObject<any>;
}) {
  return (
    <div className="fixed left-4 bottom-[22px] z-[900] flex flex-col gap-[6px]">
      {[
        { icon: <Plus size={16} />, action: () => mapRef.current?.zoomIn() },
        { icon: <Minus size={16} />, action: () => mapRef.current?.zoomOut() },
        {
          icon: <Crosshair size={14} />,
          action: () =>
            mapRef.current?.flyTo([41.8781, -87.6298], 12, { duration: 0.7 }),
        },
      ].map((btn, i) => (
        <button
          key={i}
          onClick={btn.action}
          className="w-9 h-9 rounded-f flex items-center justify-center text-t-muted hover:text-t-primary transition-all cursor-pointer"
          style={{
            background: "rgba(12,16,28,0.62)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {btn.icon}
        </button>
      ))}
    </div>
  );
}

/* ═══════ LEGEND ═══════ */
export function Legend() {
  return (
    <div
      className="fixed left-[62px] bottom-[22px] z-[900] hidden xl:flex flex-col gap-[5.1px] px-3 py-3 rounded-f-lg text-[10px] shadow-glass"
      style={{
        background: "rgba(12,16,28,0.62)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <span className="font-bold text-t-secondary uppercase tracking-[0.5px] text-[9px] whitespace-nowrap">
        Score
      </span>

      {[
        { color: "#22c55e", label: "85+ Strong" },
        { color: "#f59e0b", label: "75–84 Moderate" },
        { color: "#ef4444", label: "60–74 Caution" },
        { color: "#a855f7", label: "<60 Avoid" },
      ].map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-[6px] text-t-muted whitespace-nowrap"
        >
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: item.color }}
          />
          <span>{item.label}</span>
        </div>
      ))}
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
}

export function BottomTray({ stats }: { stats: TrayStats }) {
  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-[22px] z-[910] hidden xl:flex justify-center max-w-[calc(100vw-40px)]">
      <div
        className="flex items-center gap-5 px-[18px] py-2 rounded-f-lg text-[10px] text-t-muted shadow-glass"
        style={{
          background: "rgba(12,16,28,0.62)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {[
          { val: stats.total, label: "Sites", color: "#eaf0fa" },
          { val: stats.buy, label: "Buy", color: "#22c55e" },
          { val: stats.build, label: "Build", color: "#3b82f6" },
          { val: stats.watch, label: "Watch", color: "#f59e0b" },
          { val: stats.avoid, label: "Avoid", color: "#ef4444" },
        ].map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-[6px] whitespace-nowrap"
          >
            <span
              className="font-mono font-semibold text-[13px]"
              style={{ color: s.color }}
            >
              {s.val}
            </span>
            <span className="text-[9px] uppercase tracking-[0.5px]">
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════ NOTIFICATION TOAST ═══════ */
export function Notification({
  message,
  visible,
}: {
  message: string;
  visible: boolean;
}) {
  return (
    <div
      className={`fixed top-[118px] left-1/2 z-[3000] w-[calc(100vw-20px)] max-w-[420px] px-4 py-[10px] rounded-f text-[12px] font-semibold shadow-deep transition-all duration-300 pointer-events-none md:top-[72px] ${
        visible
          ? "opacity-100 -translate-x-1/2 translate-y-0"
          : "opacity-0 -translate-x-1/2 -translate-y-5"
      }`}
      style={{
        background: "rgba(10,14,24,0.92)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {message}
    </div>
  );
}
