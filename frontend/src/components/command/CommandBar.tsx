"use client";

import { useState, useRef, useEffect } from "react";
import { Search, RotateCcw, Maximize2, BarChart3, Zap } from "lucide-react";
import { neighborhoods } from "@/data/neighborhoods";
import { properties } from "@/data/properties";
import { FilterState, ScoreLayerKey, TimelineValue } from "@/data/types";
import { scoreColor } from "@/lib/utils";

interface CommandBarProps {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  onSelectHood: (id: string) => void;
  onSelectProperty: (id: number) => void;
  onReset: () => void;
  onCompare: () => void;
  onGenerateInsight: () => void;
  onRefresh: () => void;
}

export default function CommandBar({
  filters,
  onFilterChange,
  onSelectHood,
  onSelectProperty,
  onReset,
  onCompare,
  onGenerateInsight,
  onRefresh,
}: CommandBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const q = query.toLowerCase().trim();

  const hoodResults =
    q.length >= 2
      ? Object.entries(neighborhoods)
          .filter(([, h]) => h.name.toLowerCase().includes(q) || h.zip.includes(q))
          .slice(0, 4)
      : [];

  const propResults =
    q.length >= 2
      ? properties
          .filter(
            p =>
              p.name.toLowerCase().includes(q) ||
              p.hood.toLowerCase().includes(q) ||
              p.type.toLowerCase().includes(q)
          )
          .slice(0, 5)
      : [];

  const hasResults = hoodResults.length > 0 || propResults.length > 0;

  return (
    <div
      className="fixed top-[10px] left-[10px] right-[10px] z-[1000] rounded-[16px] shadow-glass"
      style={{
        background: "rgba(10,14,24,0.82)",
        backdropFilter: "blur(24px) saturate(1.6)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex flex-wrap items-center gap-[8px] px-[10px] py-[10px] md:flex-nowrap md:gap-[6px] md:h-[56px] md:py-[7px]">
        {/* Logo */}
        <div className="flex min-w-0 items-center gap-2 pr-0 md:pr-[14px] md:border-r md:border-white/5 shrink-0">
          <div
            className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center font-extrabold text-[15px] text-white shrink-0"
            style={{
              background:
                "linear-gradient(140deg, #3b82f6 0%, #06b6d4 50%, #22c55e 100%)",
              boxShadow: "0 2px 12px rgba(59,130,246,0.3)",
            }}
          >
            F
          </div>

          <div className="flex flex-col justify-center gap-[4px] min-w-0">
            <div className="text-[15px] font-bold leading-[1.05] tracking-[0.3px] text-t-primary whitespace-nowrap">
              Foresight
            </div>
            <div className="hidden sm:block text-[8.5px] font-normal leading-[1.2] text-t-muted uppercase tracking-[1.2px] whitespace-nowrap">
              Geospatial Investment Intelligence
            </div>
          </div>
        </div>

        {/* City */}
        <select className="cb-select w-[120px] shrink-0" defaultValue="chicago">
          <option value="chicago">◉ Chicago</option>
        </select>

        <div className="hidden md:block w-px h-6 bg-white/5 shrink-0" />

        {/* Search */}
        <div className="order-3 w-full md:order-none md:flex-1 md:max-w-[280px] relative" ref={searchRef}>
          <Search
            className="absolute left-[9px] top-1/2 -translate-y-1/2 text-t-muted pointer-events-none"
            size={13}
          />
          <input
            type="text"
            placeholder="ZIP, neighborhood, address…"
            className="w-full h-[36px] pl-[30px] pr-3 rounded-f text-[11.5px] font-sans text-t-primary outline-none transition-all"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={e => {
              if (e.key === "Escape") setSearchOpen(false);
              if (e.key === "Enter" && hoodResults.length > 0) {
                onSelectHood(hoodResults[0][0]);
                setSearchOpen(false);
                setQuery("");
              }
            }}
          />

          {searchOpen && hasResults && (
            <div
              className="absolute top-[42px] left-0 right-0 rounded-f shadow-deep max-h-[260px] overflow-y-auto z-50"
              style={{
                background: "rgba(10,14,24,0.92)",
                backdropFilter: "blur(24px)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {hoodResults.map(([id, h]) => (
                <div
                  key={id}
                  className="px-3 py-[9px] cursor-pointer flex justify-between items-center text-[12px] border-b border-white/[0.03] hover:bg-white/[0.04] transition-colors gap-3"
                  onClick={() => {
                    onSelectHood(id);
                    setSearchOpen(false);
                    setQuery("");
                  }}
                >
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{h.name}</div>
                    <div className="text-[10px] text-t-muted truncate">
                      Neighborhood · {h.zip}
                    </div>
                  </div>
                  <span
                    className="font-mono font-semibold shrink-0"
                    style={{ color: scoreColor(h.scores.opportunity) }}
                  >
                    {h.scores.opportunity}
                  </span>
                </div>
              ))}

              {propResults.map(p => (
                <div
                  key={p.id}
                  className="px-3 py-[9px] cursor-pointer flex justify-between items-center text-[12px] border-b border-white/[0.03] hover:bg-white/[0.04] transition-colors gap-3"
                  onClick={() => {
                    onSelectProperty(p.id);
                    setSearchOpen(false);
                    setQuery("");
                  }}
                >
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{p.name}</div>
                    <div className="text-[10px] text-t-muted truncate">
                      {p.type} · {p.hood}
                    </div>
                  </div>
                  <span
                    className="font-mono font-semibold shrink-0"
                    style={{ color: scoreColor(p.score) }}
                  >
                    {p.score}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex w-full flex-wrap gap-[8px] md:w-auto md:flex-nowrap md:gap-[6px]">
          <select
            className="cb-select min-w-0 flex-1 md:w-[150px] md:flex-none"
            value={filters.investmentType}
            onChange={e => onFilterChange({ investmentType: e.target.value })}
          >
            <option value="">Investment Type</option>
            <option>Multifamily</option>
            <option>Single Family</option>
            <option>Mixed Use</option>
            <option>Retail</option>
            <option>Office</option>
            <option>Land / Development</option>
          </select>

          <select
            className="cb-select w-[84px] shrink-0"
            value={filters.timeline}
            onChange={e => onFilterChange({ timeline: e.target.value as TimelineValue })}
          >
            <option value="3">3Y</option>
            <option value="1">1Y</option>
            <option value="5">5Y</option>
          </select>

          <select
            className="cb-select min-w-0 flex-1 md:w-[190px] md:flex-none"
            value={filters.scoreLayer}
            onChange={e => onFilterChange({ scoreLayer: e.target.value as ScoreLayerKey })}
          >
            <option value="opportunity">Investment Opportunity</option>
            <option value="appreciation">Appreciation Potential</option>
            <option value="devReady">Development Readiness</option>
            <option value="stability">Market Stability</option>
            <option value="family">Family Demand</option>
            <option value="commercial">Commercial Expansion</option>
          </select>

          <select
            className="cb-select min-w-0 flex-1 md:w-[130px] md:flex-none"
            value={filters.riskLevel}
            onChange={e => onFilterChange({ riskLevel: e.target.value })}
          >
            <option value="">Risk Level</option>
            <option value="low">Low Risk</option>
            <option value="moderate">Moderate Risk</option>
            <option value="high">High Upside</option>
            <option value="emerging">Emerging</option>
            <option value="avoid">Avoid</option>
          </select>
        </div>

        <div className="hidden md:flex flex-1" />

        {/* Actions */}
        <div className="flex w-full items-center justify-between gap-[8px] pt-[2px] md:w-auto md:justify-end md:pt-0">
          <div className="flex items-center gap-[6px]">
            <button onClick={onRefresh} className="cb-btn" title="Refresh Data">
              <RotateCcw size={14} />
            </button>
            <button onClick={onReset} className="cb-btn" title="Reset View">
              <Maximize2 size={14} />
            </button>
          </div>

          <div className="flex items-center gap-[6px] ml-auto">
            <button onClick={onCompare} className="cb-btn-text" title="Compare">
              <BarChart3 size={13} /> <span className="hidden sm:inline">Compare</span>
            </button>
            <button
              onClick={onGenerateInsight}
              className="cb-btn-accent"
              title="Generate Insight"
            >
              <Zap size={13} /> <span className="hidden sm:inline">Generate Insight</span>
            </button>
            <div
              className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-[11px] font-bold text-white cursor-pointer shrink-0"
              style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
            >
              JK
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}