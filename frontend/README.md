# Foresight — Geospatial Investment Intelligence

> Where in Chicago should you buy, build, or invest over the next 2–5 years?

Foresight is a **premium B2B geospatial investment intelligence platform** built for real estate developers, property investors, banks/lenders, location strategy teams, and commercial real estate analysts.

---

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + custom glassmorphic CSS |
| Map | Leaflet + CartoDB dark vector tiles |
| Fonts | Outfit (display) + IBM Plex Mono (data) |
| Icons | Lucide React |

---

## Architecture

```
src/
├── app/
│   ├── layout.tsx          # Root layout, metadata
│   └── page.tsx            # Main orchestrator — all state lives here
├── components/
│   ├── command/
│   │   └── CommandBar.tsx   # Top floating command bar with search + filters
│   ├── map/
│   │   └── MapView.tsx      # Leaflet map with zone circles + property markers
│   ├── panel/
│   │   └── IntelPanel.tsx   # Right-side analyst panel (Overview/Factors/Memo/Comps)
│   ├── modals/
│   │   ├── ScenarioLab.tsx  # Investment scenario modeling modal
│   │   └── CompareAndMemo.tsx # Compare table + full memo modal
│   └── ui/
│       └── Overlays.tsx     # Map controls, legend, bottom tray, notifications
├── data/
│   ├── types.ts             # All TypeScript interfaces
│   ├── neighborhoods.ts     # 20 Chicago neighborhoods with full data
│   └── properties.ts        # 42 investment site opportunities
├── lib/
│   └── utils.ts             # Score colors, calculations, formatting
└── styles/
    ├── globals.css           # Tailwind + Leaflet overrides + glass tokens
    └── components.css        # Command bar button styles
```

---

## Features

### Map Experience
- **Real Chicago geography** — CartoDB dark tiles with dim labels overlay
- **20 neighborhood zone circles** — radius-based, color-coded by score layer
- **42 property markers** — clickable with rich tooltips showing score, value, cap rate
- **Dynamic filtering** — zones recolor by score layer; markers filter by type/risk

### Command Bar
- **Live search** — autocomplete across neighborhoods (by name/ZIP) and properties
- **6 functional filters** — Investment Type, Timeline, Score Layer, Risk Level, City
- **Action buttons** — Reset View, Compare, Generate Insight, Refresh Data
- All filters reactively update the map and panel

### Intelligence Panel (Right Side)
- **Overview** — 6 score cards with sparklines + strengths/risks + suggested action
- **Factors** — 8 investment factors with progress bars + methodology disclosure
- **AI Memo** — Professional analyst-grade narrative per neighborhood
- **Comps** — 6 comparable opportunities ranked by score

### Modals
- **Scenario Lab** — Adjustable acquisition price, cap rate, leverage, hold period → projected IRR, equity multiple, cash-on-cash
- **Full Memo** — Complete investment memorandum with executive summary, scores, strengths/risks
- **Compare** — All 20 neighborhoods side-by-side in a sortable table

### Bottom Tray
- Real-time filtered counts: total sites, buy/build/watch/avoid breakdown, pipeline value

---

## Data Model

### Neighborhoods (20)
Each has: name, ZIP, lat/lng, 6 score dimensions, delta, recommendation (BUY/BUILD/WATCH/AVOID), risk level, 8 investment factors, 4 strengths, 4 risks, professional AI memo.

### Properties (42)
Each has: name, type, lat/lng, score, recommendation, neighborhood, estimated value, square footage, cap rate, risk level.

### Score Dimensions
| Score | Description |
|-------|-------------|
| Investment Opportunity | Composite of all factors |
| Appreciation Potential | Projected value growth |
| Development Readiness | Available parcels + zoning favorability |
| Market Stability | Volatility and institutional liquidity |
| Family Demand | School quality + demographic profile |
| Commercial Expansion | Retail/office absorption + corridor health |

---

## Extending with Real Data

### Free Data Sources
| Source | Use |
|--------|-----|
| [Chicago Open Data Portal](https://data.cityofchicago.org/) | Permits, crimes, zoning, vacant lots, building violations |
| [US Census ACS](https://data.census.gov/) | Income, population, demographics, housing |
| [Zillow ZHVI](https://www.zillow.com/research/data/) | Home value indices, rent indices |
| [CTA Ridership](https://www.transitchicago.com/data/) | Station-level ridership for transit scoring |
| [Cook County Assessor](https://www.cookcountyassessor.com/data) | Parcel data, assessed values, property characteristics |
| [HUD USPS Vacancy](https://www.huduser.gov/portal/datasets/usps.html) | Vacancy rates by ZIP |

### Backend Integration (Future)
```
backend/
├── api/
│   ├── main.py              # FastAPI app
│   ├── routes/
│   │   ├── neighborhoods.py  # GET /api/neighborhoods
│   │   ├── properties.py     # GET /api/properties
│   │   └── scores.py         # GET /api/scores?layer=appreciation
│   └── services/
│       ├── scoring.py         # Weighted composite score engine
│       ├── forecasting.py     # scikit-learn appreciation forecasts
│       └── data_ingestion.py  # Census/Zillow/Chicago data ETL
├── models/
│   └── schemas.py             # Pydantic models
└── data/
    └── chicago_data.db        # SQLite or Postgres
```

---

## Design Language

- **Glassmorphic dark mode** — translucent panels with `backdrop-filter: blur(24px)`
- **Color system**: green (buy/strong), blue (build/selected), orange (watch/emerging), red (avoid/risk), purple (<60 score)
- **Typography**: Outfit for UI, IBM Plex Mono for data/scores
- **Aesthetic reference**: Palantir meets Bloomberg Terminal, but modern and map-first

---

## Hackathon Judges — What to Note

| Criterion | How Foresight Scores |
|-----------|---------------------|
| **Technical Complexity (30%)** | Real-time map with 20 zone overlays + 42 interactive markers, dynamic filter system, scenario modeling engine, glassmorphic design system |
| **Usefulness (30%)** | Solves a real problem for RE investment teams — "where to invest in Chicago" with actionable scores and professional memos |
| **Originality (20%)** | Map-first geospatial investment intelligence — not a typical dashboard or consumer app |
| **Design (15%)** | Premium glassmorphic enterprise UI, Palantir-grade aesthetic, investor-demo ready |
| **Presentation (5%)** | Clear product framing, professional language, institutional credibility |

---

## License

Built for WildHacks 2026.
