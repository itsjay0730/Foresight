"use client";

import { FilterState } from "@/data/types";

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
}: CommandBarProps) {
  const modeValue = filters.housingType ?? "investment";

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

        <select
          className="cb-select w-[90px] shrink-0"
          value={filters.timeline}
          onChange={(e) =>
            onFilterChange({ timeline: e.target.value as "1" | "3" | "5" })
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
