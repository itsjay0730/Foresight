export interface Neighborhood {
  id: string;
  name: string;
  zip: string;
  area: string;
  lat: number;
  lng: number;
  scores: ScoreSet;
  delta: string;
  rec: Recommendation;
  risk: RiskLevel;
  factors: Factor[];
  strengths: string[];
  risks: string[];
  memo: string;
  forecast_scores?: {
    "1y"?: ForecastScorePoint;
    "3y"?: ForecastScorePoint;
    "5y"?: ForecastScorePoint;
  };
}

export interface Property {
  id: number;
  name: string;
  type: InvestmentType;
  lat: number;
  lng: number;
  score: number;
  rec: Recommendation;
  hood: string;
  est: string;
  sqft: string;
  cap: string;
  risk: RiskLevel;
  forecast_scores?: {
    "1y"?: ForecastScorePoint;
    "3y"?: ForecastScorePoint;
    "5y"?: ForecastScorePoint;
  };
}

export interface ScoreSet {
  opportunity: number;
  appreciation: number;
  devReady: number;
  stability: number;
  family: number;
  commercial: number;
}

export interface Factor {
  name: string;
  key: string;
  value: number;
}

export interface ForecastScorePoint {
  finalScore?: number;
  opportunity?: number;
}

export type Recommendation = "BUY" | "BUILD" | "WATCH" | "AVOID";

export type RiskLevel = "low" | "moderate" | "emerging" | "high" | "avoid";

export type InvestmentType =
  | "Multifamily"
  | "Single Family"
  | "Mixed Use"
  | "Retail"
  | "Office"
  | "Land / Development";

export type HousingType = "investment" | "housing";

export type TimelineValue = "0" |"1" | "3" | "5";
export type ScoreLayerKey = keyof ScoreSet;
export interface FilterState {
  investmentType: string;
  housingType: HousingType;
  timeline: TimelineValue;
  scoreLayer: ScoreLayerKey;
  riskLevel: string;
  searchQuery: string;
}

export interface SelectionState {
  type: "hood" | "property";
  hoodId?: string;
  propertyId?: number;
}

export type TabKey = "overview" | "factors" | "memo" | "comps";

export interface ScenarioInputs {
  acquisitionPrice: number;
  entryCap: number;
  annualAppreciation: number;
  exitCap: number;
  leverage: number;
  debtRate: number;
  holdYears: number;
}

export interface ScenarioResults {
  projectedValue: number;
  totalAppreciation: number;
  unleveragedIRR: number;
  leveragedIRR: number;
  cashOnCash: number;
  equityMultiple: number;
  riskAdjustedScore: number;
}
