/*
 * api.ts — Bridge between the FastAPI backend and the existing frontend UI.
 *
 * Fetches PlotRecord[] from GET /map-data, then transforms them into the
 * exact Neighborhood and Property shapes every component already consumes.
 * No UI components are changed — only this data layer.
 */

import {
  Neighborhood,
  Property,
  ScoreSet,
  Factor,
  Recommendation,
  RiskLevel,
  InvestmentType,
} from "./types";

// ─── Raw backend record shape ───────────────────────────────────────────────
interface BackendPlot {
  id: string;
  lat: number;
  lng: number;
  neighborhood: string;
  zip: string;
  property_type: string;
  parcel_size: number;
  zoning: string;
  crime_trend: number | null;
  permit_activity: number | null;
  income: number | null;
  population_growth: number | null;
  transit_distance: number | null;
  crime_count_nearby: number;
  violent_crime_count_nearby: number;
  permit_count_nearby: number;
  nearest_station: string | null;
  transit_stop_count_nearby: number;
  crime_history?: { year: number; crime_count: number; violent_crime_count: number }[];
  permit_history?: { year: number; permit_count: number }[];
  population_history?: { year: number; population: number }[];
  features?: {
    crimeTrend: number;
    permitGrowth: number;
    transitScore: number;
    incomeScore: number;
    populationGrowth: number;
  };
  scores?: {
    investmentScore: number;
    growthScore: number;
    riskScore: number;
    finalScore: number;
  };
  metrics?: {
    investmentOpportunity?: { score: number; change: number; trend: number[] };
    appreciationPotential?: { score: number; change: number; trend: number[] };
    developmentReadiness?: { score: number; change: number; trend: number[] };
    marketStability?: { score: number; change: number; trend: number[] };
    familyDemand?: { score: number; change: number; trend: number[] };
    commercialExpansion?: { score: number; change: number; trend: number[] };
  };
  forecast?: {
    crime_forecast?: { "1y": number; "3y": number; "5y": number };
    permit_forecast?: { "1y": number; "3y": number; "5y": number };
    population_forecast?: { "1y": number; "3y": number; "5y": number };
  };
  forecast_scores?: {
    "1y"?: { investmentScore: number; growthScore: number; riskScore: number; finalScore: number };
    "3y"?: { investmentScore: number; growthScore: number; riskScore: number; finalScore: number };
    "5y"?: { investmentScore: number; growthScore: number; riskScore: number; finalScore: number };
  };
  // Enrichment fields (may or may not be present)
  full_address?: string;
  last_sale_price?: number | null;
  assessed_value?: number | null;
  average_school_rating_nearby?: number | null;
  amenity_density_score?: number | null;
  hardship_index?: number | null;
  unemployment_rate?: number | null;
  poverty_rate?: number | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Singleton cache ────────────────────────────────────────────────────────
let _cache: {
  plots: BackendPlot[];
  neighborhoods: Record<string, Neighborhood>;
  neighborhoodList: Neighborhood[];
  properties: Property[];
} | null = null;

let _fetchPromise: Promise<void> | null = null;

async function loadData(): Promise<void> {
  if (_cache) return;
  if (_fetchPromise) return _fetchPromise;

  _fetchPromise = (async () => {
    let plots: BackendPlot[] = [];
    try {
      const res = await fetch(`${API_BASE}/map-data`);
      if (res.ok) {
        const data = await res.json();
        plots = data.results || [];
      }
    } catch {
      /* API unavailable */
    }

    // Fallback to static file
    if (plots.length === 0) {
      try {
        const res = await fetch("/predicted_plots.json");
        if (res.ok) plots = await res.json();
      } catch {
        /* no fallback either */
      }
    }

    _cache = transformData(plots);
  })();

  return _fetchPromise;
}

// ─── Transform backend plots → Neighborhood + Property ──────────────────────

function titleCase(s: string): string {
  return s.toLowerCase().split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function toHoodId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function scoreToRec(score: number): Recommendation {
  if (score >= 83) return "BUY";
  if (score >= 70) return "WATCH";
  return "AVOID";
}

function scoreToRisk(score: number): RiskLevel {
  if (score >= 82) return "low";
  if (score >= 74) return "moderate";
  if (score >= 68) return "emerging";
  return "high";
}

function mapPropertyType(backendType: string): InvestmentType {
  const t = backendType.toLowerCase();
  if (t.includes("business")) return "Mixed Use";
  if (t.includes("retail") || t.includes("food")) return "Retail";
  if (t.includes("office")) return "Office";
  if (t.includes("multi") || t.includes("residential")) return "Multifamily";
  if (t.includes("land") || t.includes("parcel") || t.includes("vacant") || t.includes("opportunity")) return "Land / Development";
  if (t.includes("single")) return "Single Family";
  return "Mixed Use";
}

function getArea(hood: string): string {
  const areas: Record<string, string> = {
    "NEAR NORTH SIDE": "North Side",
    "NEAR WEST SIDE": "West Side",
    "NEAR SOUTH SIDE": "South Side",
    "LOOP": "Central",
    "LAKE VIEW": "North Side",
    "LINCOLN SQUARE": "Northwest Side",
    "NORTH CENTER": "North Side",
    "HUMBOLDT PARK": "West Side",
    "NORTH LAWNDALE": "West Side",
    "GRAND BOULEVARD": "South Side",
    "OAKLAND": "South Side",
    "ENGLEWOOD": "South Side",
    "WEST ENGLEWOOD": "South Side",
    "AUBURN GRESHAM": "South Side",
    "ROSELAND": "Far South Side",
    "SOUTH CHICAGO": "South Side",
    "WEST PULLMAN": "Far South Side",
    "GAGE PARK": "Southwest Side",
    "WASHINGTON HEIGHTS": "South Side",
  };
  return areas[hood] || "Chicago";
}

function buildFactors(plots: BackendPlot[]): Factor[] {
  // Average the feature scores across plots to produce the 8 factors the UI expects
  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 50;

  const incomes = plots.filter(p => p.income).map(p => p.income!);
  const avgIncome = avg(incomes);
  const incomeScore = Math.min(96, Math.max(35, Math.round((avgIncome / 150000) * 100)));

  const transitScores = plots.filter(p => p.features?.transitScore != null).map(p => Math.round(p.features!.transitScore * 100));
  const transitVal = Math.min(96, Math.max(35, Math.round(avg(transitScores))));

  const permitActs = plots.filter(p => p.permit_activity != null).map(p => p.permit_activity!);
  const avgPermit = avg(permitActs);
  const permitScore = Math.min(96, Math.max(35, Math.round(50 + avgPermit * 30)));

  const crimeTs = plots.filter(p => p.crime_trend != null).map(p => p.crime_trend!);
  const avgCrime = avg(crimeTs);
  // Lower crime trend = better stability
  const crimeScore = Math.min(96, Math.max(35, Math.round(70 - avgCrime * 20)));

  const popGrowths = plots.filter(p => p.population_growth != null).map(p => p.population_growth!);
  const avgPop = avg(popGrowths);
  const popScore = Math.min(96, Math.max(35, Math.round(50 + avgPop * 200)));

  const permitCounts = plots.map(p => p.permit_count_nearby);
  const avgPermitCount = avg(permitCounts);
  const propValScore = Math.min(96, Math.max(35, Math.round(40 + avgPermitCount * 0.5)));

  const schoolRatings = plots.filter(p => (p as any).average_school_rating_nearby).map(p => (p as any).average_school_rating_nearby);
  const schoolScore = schoolRatings.length > 0 ? Math.min(96, Math.max(35, Math.round(avg(schoolRatings) * 14))) : Math.min(96, Math.max(35, Math.round(incomeScore * 0.8)));

  const rentGrowth = Math.min(96, Math.max(35, Math.round(permitScore * 0.9 + popScore * 0.1)));

  return [
    { name: "Median Income", key: "income", value: incomeScore },
    { name: "School Quality", key: "school", value: schoolScore },
    { name: "Property Value Trend", key: "propVal", value: propValScore },
    { name: "Rent Growth", key: "rentGr", value: rentGrowth },
    { name: "Permit Activity", key: "permit", value: permitScore },
    { name: "Crime / Stability", key: "crime", value: crimeScore },
    { name: "Transit Access", key: "transit", value: transitVal },
    { name: "Population Growth", key: "popGr", value: popScore },
  ];
}

function buildStrengths(plots: BackendPlot[], scores: ScoreSet): string[] {
  const strengths: string[] = [];
  if (scores.opportunity >= 80) strengths.push("High overall investment opportunity score");
  if (scores.commercial >= 70) strengths.push("Strong commercial corridor momentum");
  if (scores.stability >= 75) strengths.push("Above-average market stability and lower downside risk");

  const avgTransit = plots.reduce((a, p) => a + (p.features?.transitScore ?? 0), 0) / plots.length;
  if (avgTransit > 0.6) strengths.push("Excellent transit accessibility");

  const avgIncome = plots.reduce((a, p) => a + (p.income ?? 0), 0) / plots.length;
  if (avgIncome > 80000) strengths.push("Strong median income profile supports pricing");

  const avgPermit = plots.reduce((a, p) => a + p.permit_count_nearby, 0) / plots.length;
  if (avgPermit > 40) strengths.push("Active permit pipeline indicates development interest");

  if (strengths.length < 3) strengths.push("Favorable investment fundamentals in current cycle");
  if (strengths.length < 4) strengths.push("Positioned within established urban infrastructure");
  return strengths.slice(0, 4);
}

function buildRisks(plots: BackendPlot[], scores: ScoreSet): string[] {
  const risks: string[] = [];
  const avgCrime = plots.reduce((a, p) => a + p.crime_count_nearby, 0) / plots.length;
  if (avgCrime > 30) risks.push("Elevated crime metrics require block-level diligence");

  if (scores.stability < 72) risks.push("Market stability below institutional threshold");
  if (scores.family < 65) risks.push("Limited family demand may constrain residential pricing");
  if (scores.devReady < 65) risks.push("Development readiness constrained by zoning or density");

  const avgPop = plots.reduce((a, p) => a + (p.population_growth ?? 0), 0) / plots.length;
  if (avgPop < 0) risks.push("Population decline trend may weaken demand outlook");

  if (risks.length < 3) risks.push("Acquisition cost compression may limit cap rate upside");
  if (risks.length < 4) risks.push("Macro interest rate environment creates refinancing risk");
  return risks.slice(0, 4);
}

function buildMemo(name: string, scores: ScoreSet, plots: BackendPlot[]): string {
  const avgIncome = plots.reduce((a, p) => a + (p.income ?? 0), 0) / plots.length;
  const avgPermit = plots.reduce((a, p) => a + p.permit_count_nearby, 0) / plots.length;
  const titleName = titleCase(name);
  const scoreDesc = scores.opportunity >= 80 ? "strong" : scores.opportunity >= 72 ? "moderate" : "emerging";
  const recWord = scores.opportunity >= 80 ? "acquisition" : scores.opportunity >= 72 ? "selective entry" : "monitoring";

  return `${titleName} presents ${scoreDesc} investment fundamentals with a composite opportunity score of ${scores.opportunity}. ` +
    `The submarket shows ${avgPermit > 40 ? "robust" : avgPermit > 20 ? "moderate" : "limited"} permit activity (avg ${Math.round(avgPermit)} nearby) ` +
    `and median income of $${Math.round(avgIncome).toLocaleString()}. ` +
    `${scores.stability >= 75 ? "Market stability is above average, supporting institutional allocation." : "Stability metrics warrant careful position sizing."} ` +
    `${scores.appreciation >= 72 ? "Appreciation trajectory supports a growth thesis." : "Appreciation potential is modest — focus on cash flow fundamentals."} ` +
    `Recommended strategy: ${recWord} with a 3–5 year horizon. ` +
    `${plots.length} opportunity sites identified in the current pipeline.`;
}

function transformData(plots: BackendPlot[]) {
  // Group by neighborhood
  const hoodGroups: Record<string, BackendPlot[]> = {};
  for (const p of plots) {
    const key = toHoodId(p.neighborhood);
    if (!hoodGroups[key]) hoodGroups[key] = [];
    hoodGroups[key].push(p);
  }

  const neighborhoods: Record<string, Neighborhood> = {};
  const allProperties: Property[] = [];
  let propIdCounter = 1;

  for (const [hoodId, group] of Object.entries(hoodGroups)) {
    const first = group[0];
    const avgLat = group.reduce((a, p) => a + p.lat, 0) / group.length;
    const avgLng = group.reduce((a, p) => a + p.lng, 0) / group.length;

    // Build ScoreSet from metrics (the 6-dimension scores)
    const m = first.metrics;
    const oppScore = m?.investmentOpportunity?.score ?? first.scores?.finalScore ?? 70;
    const apprScore = m?.appreciationPotential?.score ?? first.scores?.growthScore ?? 65;
    const devScore = m?.developmentReadiness?.score ?? 60;
    const stabScore = m?.marketStability?.score ?? 70;
    const famScore = m?.familyDemand?.score ?? 65;
    const commScore = m?.commercialExpansion?.score ?? 60;

    const scores: ScoreSet = {
      opportunity: oppScore,
      appreciation: apprScore,
      devReady: devScore,
      stability: stabScore,
      family: famScore,
      commercial: commScore,
    };

    // Delta from metrics change field or forecast_scores
    const change = m?.investmentOpportunity?.change;
    const delta = change != null ? `+${change.toFixed(1)}%` :
      (first.forecast_scores?.["3y"]
        ? `+${(first.forecast_scores["3y"].finalScore - (first.scores?.finalScore ?? 0)).toFixed(1)}%`
        : "+2.0%");

    const factors = buildFactors(group);
    const strengths = buildStrengths(group, scores);
    const risks = buildRisks(group, scores);
    const memo = buildMemo(first.neighborhood, scores, group);

    // Fix bad ZIPs
    let zip = first.zip;
    if (zip === "0" || zip === "00000") {
      zip = group.find(p => p.zip !== "0" && p.zip !== "00000")?.zip || "60601";
    }

    neighborhoods[hoodId] = {
      id: hoodId,
      name: titleCase(first.neighborhood),
      zip,
      area: getArea(first.neighborhood),
      lat: avgLat,
      lng: avgLng,
      scores,
      delta,
      rec: scoreToRec(oppScore),
      risk: scoreToRisk(oppScore),
      factors,
      strengths,
      risks,
      memo,
    };

    // Convert each plot to a Property
    for (const plot of group) {
      const finalScore = plot.scores?.finalScore ?? 70;
      const salePrice = (plot as any).last_sale_price;
      const est = salePrice
        ? (salePrice >= 1_000_000 ? `$${(salePrice / 1_000_000).toFixed(1)}M` : `$${(salePrice / 1000).toFixed(0)}K`)
        : (plot.income ? `$${(plot.income * 2.5 / 1000).toFixed(0)}K` : "—");

      allProperties.push({
        id: propIdCounter++,
        name: (plot as any).full_address
          ? (plot as any).full_address.split(",")[0]
          : `Site ${plot.id}`,
        type: mapPropertyType(plot.property_type),
        lat: plot.lat,
        lng: plot.lng,
        score: finalScore,
        rec: scoreToRec(finalScore),
        hood: titleCase(plot.neighborhood),
        est,
        sqft: plot.parcel_size > 0 ? plot.parcel_size.toLocaleString() : "—",
        cap: finalScore >= 75 ? `${(5 + (90 - finalScore) * 0.05).toFixed(1)}%` : "—",
        risk: scoreToRisk(finalScore),
        // Attach raw backend data for IntelPanel per-property metrics + snapshot
        ...Object.fromEntries(
          Object.entries(plot).filter(([k]) =>
            !["id","lat","lng","property_type","parcel_size","zoning"].includes(k)
          ).map(([k, v]) => [`_${k}`, v])
        ),
        metrics: plot.metrics,
        forecast_scores: plot.forecast_scores,
        income: plot.income,
        crime_count_nearby: plot.crime_count_nearby,
        violent_crime_count_nearby: plot.violent_crime_count_nearby,
        permit_count_nearby: plot.permit_count_nearby,
        transit_stop_count_nearby: plot.transit_stop_count_nearby,
        nearest_station: plot.nearest_station,
        transit_distance: plot.transit_distance,
        population_growth: plot.population_growth,
        permit_activity: plot.permit_activity,
        average_school_rating_nearby: (plot as any).average_school_rating_nearby,
        park_count_nearby: (plot as any).park_count_nearby,
        restaurant_count_nearby: (plot as any).restaurant_count_nearby,
        coffee_shop_count_nearby: (plot as any).coffee_shop_count_nearby,
        grocery_count_nearby: (plot as any).grocery_count_nearby,
        office_poi_count_nearby: (plot as any).office_poi_count_nearby,
        amenity_density_score: (plot as any).amenity_density_score,
        hardship_index: (plot as any).hardship_index,
        median_age: (plot as any).median_age,
        renter_pct: (plot as any).renter_pct,
        unemployment_rate: (plot as any).unemployment_rate,
        last_sale_price: (plot as any).last_sale_price,
        assessed_value: (plot as any).assessed_value,
        ownership_duration_years: (plot as any).ownership_duration_years,
        poverty_rate: (plot as any).poverty_rate,
        zoning: plot.zoning,
      } as any);
    }
  }

  return {
    plots,
    neighborhoods,
    neighborhoodList: Object.values(neighborhoods),
    properties: allProperties.sort((a, b) => b.score - a.score),
  };
}

// ─── Public API: same exports as the old hardcoded files ────────────────────

// Synchronous fallback so components that import at module level don't break.
// This gets populated after the first fetch completes.
let _syncNeighborhoods: Record<string, Neighborhood> = {};
let _syncNeighborhoodList: Neighborhood[] = [];
let _syncProperties: Property[] = [];

// Kick off the fetch immediately on module load (client-side only)
if (typeof window !== "undefined") {
  loadData().then(() => {
    if (_cache) {
      _syncNeighborhoods = _cache.neighborhoods;
      _syncNeighborhoodList = _cache.neighborhoodList;
      _syncProperties = _cache.properties;
    }
  });
}

export function getNeighborhoods(): Record<string, Neighborhood> {
  return _cache?.neighborhoods ?? _syncNeighborhoods;
}

export function getNeighborhoodList(): Neighborhood[] {
  return _cache?.neighborhoodList ?? _syncNeighborhoodList;
}

export function getProperties(): Property[] {
  return _cache?.properties ?? _syncProperties;
}

export async function fetchAndGetData() {
  await loadData();
  return {
    neighborhoods: _cache!.neighborhoods,
    neighborhoodList: _cache!.neighborhoodList,
    properties: _cache!.properties,
  };
}