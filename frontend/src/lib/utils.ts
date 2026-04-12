import { Recommendation, ScoreLayerKey, ScenarioInputs, ScenarioResults, Neighborhood } from "@/data/types";

export function scoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 70) return "#f59e0b";
  if (score >= 60) return "#ef4444";
  return "#a855f7";
}

export function scoreBg(score: number): string {
  if (score >= 80) return "rgba(34,197,94,0.12)";
  if (score >= 70) return "rgba(245,158,11,0.1)";
  if (score >= 60) return "rgba(239,68,68,0.1)";
  return "rgba(168,85,247,0.1)";
}

export function recColor(rec: Recommendation): string {
  switch (rec) {
    case "BUY": return "#22c55e";
    case "BUILD": return "#3b82f6";
    case "WATCH": return "#f59e0b";
    case "AVOID": return "#ef4444";
  }
}

export function recBgClass(rec: Recommendation): string {
  switch (rec) {
    case "BUY": return "bg-f-green/10 border-f-green/15 text-f-green";
    case "BUILD": return "bg-f-blue/10 border-f-blue/15 text-f-blue";
    case "WATCH": return "bg-f-orange/10 border-f-orange/15 text-f-orange";
    case "AVOID": return "bg-f-red/10 border-f-red/15 text-f-red";
  }
}

export function recLabel(rec: Recommendation): string {
  switch (rec) {
    case "BUY": return "ACQUIRE";
    case "BUILD": return "DEVELOP";
    case "WATCH": return "MONITOR";
    case "AVOID": return "AVOID";
  }
}

export function getScoreValue(hood: Neighborhood, layer: ScoreLayerKey): number {
  return hood.scores[layer];
}

export function parseEstimate(est: string): number {
  const cleaned = est.replace(/[$,]/g, "");
  if (cleaned.endsWith("M")) return parseFloat(cleaned) * 1_000_000;
  if (cleaned.endsWith("K")) return parseFloat(cleaned) * 1_000;
  return parseFloat(cleaned);
}

export function formatCurrency(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

export function calculateScenario(inputs: ScenarioInputs, score: number): ScenarioResults {
  const { acquisitionPrice, annualAppreciation, holdYears, leverage, debtRate, entryCap } = inputs;
  const appreciationRate = annualAppreciation / 100;
  const projectedValue = acquisitionPrice * Math.pow(1 + appreciationRate, holdYears);
  const totalAppreciation = ((projectedValue / acquisitionPrice) - 1) * 100;
  const noi = acquisitionPrice * (entryCap / 100);
  const debtAmount = acquisitionPrice * (leverage / 100);
  const equity = acquisitionPrice - debtAmount;
  const annualDebtService = debtAmount * (debtRate / 100);
  const annualCashFlow = noi - annualDebtService;
  const cashOnCash = (annualCashFlow / equity) * 100;
  const totalReturn = (projectedValue - acquisitionPrice) + (annualCashFlow * holdYears);
  const equityMultiple = (equity + totalReturn) / equity;
  const unleveragedIRR = ((Math.pow(projectedValue / acquisitionPrice, 1 / holdYears)) - 1) * 100 + (entryCap);
  const leveragedIRR = ((Math.pow((equity + totalReturn) / equity, 1 / holdYears)) - 1) * 100;

  return {
    projectedValue,
    totalAppreciation,
    unleveragedIRR: Math.min(unleveragedIRR, 25),
    leveragedIRR: Math.min(leveragedIRR, 35),
    cashOnCash: Math.max(cashOnCash, 0),
    equityMultiple: Math.max(equityMultiple, 1),
    riskAdjustedScore: score,
  };
}

export function generateSparklinePath(seed: number, width: number = 54, height: number = 16): string {
  const points: string[] = [];
  const steps = 10;
  for (let i = 0; i < steps; i++) {
    const x = (i / (steps - 1)) * width;
    const noise = Math.sin(seed * 0.1 + i * 1.3) * 4 + Math.cos(seed * 0.3 + i * 0.7) * 2;
    const trend = (i / steps) * 4;
    const y = height / 2 - noise - trend;
    points.push(`${x.toFixed(1)},${Math.max(1, Math.min(height - 1, y)).toFixed(1)}`);
  }
  return points.join(" ");
}
