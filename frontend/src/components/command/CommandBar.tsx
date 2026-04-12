"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { FilterState } from "@/data/types";
import { getNeighborhoods, getProperties } from "@/data/api";

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

type SearchResult =
  | {
      type: "hood";
      id: string;
      title: string;
      subtitle: string;
      score: number;
      matchRank: number;
    }
  | {
      type: "property";
      id: number;
      title: string;
      subtitle: string;
      score: number;
      matchRank: number;
    };

function scoreMatch(text: string, query: string) {
  const t = text.toLowerCase();
  const q = query.toLowerCase().trim();

  if (!q) return 9999;
  if (t === q) return 0;
  if (t.startsWith(q)) return 1;

  const idx = t.indexOf(q);
  if (idx >= 0) return 10 + idx;

  return 9999;
}

export default function CommandBar({
  filters,
  onFilterChange,
  onSelectHood,
  onSelectProperty,
}: CommandBarProps) {
  const modeValue = filters.housingType ?? "investment";

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState(filters.searchQuery ?? "");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(filters.searchQuery ?? "");
  }, [filters.searchQuery]);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const results = useMemo(() => {
    const q = query.trim();
    if (q.length < 1) return [];

    const neighborhoods = getNeighborhoods();
    const properties = getProperties();

    const hoodResults: SearchResult[] = Object.values(neighborhoods)
      .map((hood) => {
        const fields = [
          hood.name,
          hood.zip,
          hood.area,
          `${hood.name} ${hood.zip} ${hood.area}`,
        ];

        const rank = Math.min(...fields.map((f) => scoreMatch(f, q)));
        return {
          type: "hood" as const,
          id: hood.id,
          title: hood.name,
          subtitle: `${hood.area} · ZIP ${hood.zip}`,
          score: hood.scores.opportunity,
          matchRank: rank,
        };
      })
      .filter((item) => item.matchRank < 9999);

    const propertyResults: SearchResult[] = properties
      .map((property) => {
        const fields = [
          property.name,
          property.hood,
          property.type,
          `${property.name} ${property.hood} ${property.type}`,
        ];

        const rank = Math.min(...fields.map((f) => scoreMatch(f, q)));
        return {
          type: "property" as const,
          id: property.id,
          title: property.name,
          subtitle: `${property.type} · ${property.hood}`,
          score: property.score,
          matchRank: rank,
        };
      })
      .filter((item) => item.matchRank < 9999);

    return [...hoodResults, ...propertyResults]
      .sort((a, b) => {
        if (a.matchRank !== b.matchRank) return a.matchRank - b.matchRank;
        return b.score - a.score;
      })
      .slice(0, 8);
  }, [query]);

  function handleSelect(result: SearchResult) {
    setSearchOpen(false);
    setQuery(result.title);
    onFilterChange({ searchQuery: result.title });

    if (result.type === "hood") {
      onSelectHood(result.id);
    } else {
      onSelectProperty(result.id);
    }
  }

  return (
    <div
      className="fixed top-[10px] left-[10px] right-[10px] z-[1000] rounded-[16px] shadow-glass"
      style={{
        background: "rgba(10,14,24,0.82)",
        backdropFilter: "blur(24px) saturate(1.6)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center gap-[10px] px-[12px] py-[10px] overflow-x-auto no-scrollbar min-w-0">
        <div className="flex items-center gap-2 pr-[16px] mr-[8px] border-r border-white/5 shrink-0">
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

          <div className="flex flex-col justify-center gap-[5px] min-w-0">
            <div className="text-[15px] font-bold leading-[1.05] tracking-[0.3px] text-t-primary whitespace-nowrap">
              Foresight
            </div>
            <div className="hidden 2xl:block text-[8.5px] font-normal leading-[1.2] text-t-muted uppercase tracking-[1.2px] whitespace-nowrap">
              Geospatial Investment Intelligence
            </div>
          </div>
        </div>

        <select
          className="cb-select w-[190px] shrink-0"
          value={modeValue}
          onChange={(e) =>
            onFilterChange({
              housingType: e.target.value as "investment" | "housing",
            })
          }
        >
          <option value="investment">Investment</option>
          <option value="housing">Housing</option>
        </select>

        <div ref={wrapperRef} className="relative w-[320px] shrink-0">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-t-muted pointer-events-none"
          />
          <input
            type="text"
            value={query}
            placeholder="Search neighborhood or property..."
            onFocus={() => setSearchOpen(true)}
            onChange={(e) => {
              const value = e.target.value;
              setQuery(value);
              onFilterChange({ searchQuery: value });
              setSearchOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSearchOpen(false);
              }

              if (e.key === "Enter" && results.length > 0) {
                handleSelect(results[0]);
              }
            }}
            className="w-full h-[36px] rounded-[10px] pl-9 pr-3 text-[12px] text-t-primary outline-none"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          />

          {searchOpen && query.trim().length > 0 && (
            <div
              className="absolute top-[42px] left-0 right-0 rounded-[12px] overflow-hidden shadow-xl"
              style={{
                background: "rgba(10,14,24,0.96)",
                backdropFilter: "blur(24px)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {results.length > 0 ? (
                results.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    type="button"
                    onClick={() => handleSelect(result)}
                    className="w-full text-left px-3 py-3 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold text-t-primary truncate">
                          {result.title}
                        </div>
                        <div className="text-[10px] text-t-muted truncate mt-[2px]">
                          {result.type === "hood" ? "Neighborhood" : "Property"} ·{" "}
                          {result.subtitle}
                        </div>
                      </div>

                      <div
                        className="text-[11px] font-bold shrink-0"
                        style={{
                          color:
                            result.score >= 85
                              ? "#22c55e"
                              : result.score >= 75
                              ? "#f59e0b"
                              : result.score >= 60
                              ? "#ef4444"
                              : "#a855f7",
                        }}
                      >
                        {result.score}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-3 py-3 text-[11px] text-t-muted">
                  No matches found
                </div>
              )}
            </div>
          )}
        </div>

        <select
          className="cb-select w-[96px] shrink-0"
          value={filters.timeline}
          onChange={(e) =>
            onFilterChange({ timeline: e.target.value as "0" | "1" | "3" | "5" })
          }
        >
          <option value="0">Current</option>
          <option value="1">1Y</option>
          <option value="3">3Y</option>
          <option value="5">5Y</option>
        </select>
      </div>
    </div>
  );
}