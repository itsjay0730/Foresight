"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { ScenarioInputs } from "@/data/types";
import { neighborhoods } from "@/data/neighborhoods";
import { properties } from "@/data/properties";
import { scoreColor, parseEstimate, formatCurrency, calculateScenario } from "@/lib/utils";

interface ScenarioLabProps {
  open: boolean;
  onClose: () => void;
  selectionType: "hood" | "property";
  hoodId?: string;
  propertyId?: number;
  onNotify: (msg: string) => void;
}

export default function ScenarioLab({
  open,
  onClose,
  selectionType,
  hoodId,
  propertyId,
  onNotify,
}: ScenarioLabProps) {
  const hood = neighborhoods[hoodId || "west-loop"];
  const prop = selectionType === "property" ? properties.find(p => p.id === propertyId) : undefined;
  const name = prop ? prop.name : hood.name;
  const score = prop ? prop.score : hood.scores.opportunity;
  const estStr = prop ? prop.est : "$2.4M";
  const capStr = prop ? prop.cap : "6.0%";

  const basePrice = parseEstimate(estStr);
  const baseCap = parseFloat(capStr) || 6.0;

  const [holdYears, setHoldYears] = useState(3);
  const [inputs] = useState<ScenarioInputs>({
    acquisitionPrice: basePrice,
    entryCap: baseCap,
    annualAppreciation: parseFloat((score * 0.08).toFixed(1)),
    exitCap: parseFloat((baseCap - 0.3).toFixed(1)),
    leverage: 65,
    debtRate: 6.25,
    holdYears: 3,
  });

  if (!open) return null;

  const results = calculateScenario({ ...inputs, holdYears }, score);

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

        <h2 className="text-[18px] md:text-[20px] font-bold pr-8">Scenario Lab · {name}</h2>
        <p className="text-[12px] text-t-muted mb-5">
          Model acquisition, hold, and exit scenarios with adjustable assumptions
        </p>

        {/* Hold period selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-[10px] mb-5">
          {[1, 3, 5].map(y => (
            <div
              key={y}
              className={`rounded-f p-[14px] text-center cursor-pointer transition-all border ${
                holdYears === y
                  ? "border-f-blue/40 bg-f-blue/10"
                  : "border-white/[0.04] bg-white/[0.02] hover:border-white/[0.08]"
              }`}
              onClick={() => setHoldYears(y)}
            >
              <div className="text-[24px] font-extrabold font-mono text-f-blue">{y}Y</div>
              <div className="text-[10px] text-t-muted uppercase tracking-[0.5px] mt-[2px]">
                {y === 1 ? "Short Hold" : y === 3 ? "Core Hold" : "Long Hold"}
              </div>
            </div>
          ))}
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px] mb-5">
          {[
            { label: "Acquisition Price", value: formatCurrency(inputs.acquisitionPrice), key: "acquisitionPrice" },
            { label: "Entry Cap Rate", value: `${inputs.entryCap}%`, key: "entryCap" },
            { label: "Annual Appreciation", value: `${inputs.annualAppreciation}%`, key: "annualAppreciation" },
            { label: "Exit Cap Rate", value: `${inputs.exitCap}%`, key: "exitCap" },
            { label: "Leverage (LTV)", value: `${inputs.leverage}%`, key: "leverage" },
            { label: "Debt Rate", value: `${inputs.debtRate}%`, key: "debtRate" },
          ].map(item => (
            <div key={item.key} className="rounded-f p-3 border border-white/[0.04] bg-white/[0.02]">
              <label className="text-[10px] font-semibold text-t-muted uppercase tracking-[0.5px] block mb-[6px]">
                {item.label}
              </label>
              <input
                type="text"
                defaultValue={item.value}
                className="w-full h-9 px-[10px] rounded-[6px] text-[12px] font-sans text-t-primary outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              />
            </div>
          ))}
        </div>

        {/* Results */}
        <div className="rounded-f p-4 border border-white/[0.04] bg-white/[0.02] mb-4">
          <h3 className="text-[12px] font-bold uppercase tracking-[0.5px] text-t-secondary mb-3">
            Projected Returns · {holdYears}-Year Hold
          </h3>

          {[
            { label: "Projected Value", value: formatCurrency(results.projectedValue), color: "var(--green)" },
            { label: "Total Appreciation", value: `+${results.totalAppreciation.toFixed(1)}%`, color: "var(--green)" },
            { label: "Unlevered IRR", value: `${results.unleveragedIRR.toFixed(1)}%`, color: undefined },
            { label: "Levered IRR", value: `${results.leveragedIRR.toFixed(1)}%`, color: "var(--green)" },
            { label: "Cash-on-Cash Return", value: `${results.cashOnCash.toFixed(1)}%`, color: undefined },
            { label: "Equity Multiple", value: `${results.equityMultiple.toFixed(2)}x`, color: undefined },
            { label: "Risk-Adjusted Score", value: `${results.riskAdjustedScore}`, color: scoreColor(results.riskAdjustedScore) },
          ].map(row => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-3 py-[6px] border-b border-white/[0.02] last:border-none"
            >
              <span className="text-[12px] text-t-muted">{row.label}</span>
              <span
                className="text-[13px] font-semibold font-mono shrink-0"
                style={{ color: row.color || "#eaf0fa" }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => {
              onNotify("Scenario saved to workspace");
              onClose();
            }}
            className="px-4 py-[7px] rounded-f text-[11px] font-semibold bg-f-blue text-white hover:bg-f-blue/80 transition-colors"
          >
            Save Scenario
          </button>
          <button
            onClick={() => onNotify("PDF exported · Check your downloads")}
            className="px-4 py-[7px] rounded-f text-[11px] font-semibold border border-white/[0.08] text-t-secondary hover:text-t-primary transition-all"
          >
            Export as PDF
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