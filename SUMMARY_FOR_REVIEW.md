# ClientWorks Copilot - Complete Implementation Summary

## Project Overview

**Name:** ClientWorks Copilot  
**Purpose:** AI-powered decision-support copilot for financial advisors at LPL Financial  
**Status:** Hackathon Demo (Fully Functional with Mock Data)  
**Repository:** https://github.com/BryanAW/clientworks-copilot  
**Tech Stack:** React + Vite + TypeScript (frontend), Node.js + Express (backend)

---

## Core Concept

A financial advisor AI copilot that:
1. **Appears as a floating popup panel** in the bottom-right corner of the advisor UI
2. **Reads client context** (profile, holdings, risk tolerance, goals)
3. **Pulls current market context** from real RSS feeds (Bloomberg, CNBC, Reuters, MarketWatch, NY Times)
4. **Proposes advisor-reviewed actions** (never auto-executes)
5. **Requires explicit advisor approval** before any simulated action
6. **Logs a complete audit trail** of all interactions (JSONL format)

This is a **human-in-the-loop** system - all decisions rest with the advisor.

---

## What Has Been Implemented

### 1. Frontend Application (React + Vite + TypeScript + Tailwind CSS)

**Location:** `frontend/` | **Port:** 5173

#### Main Layout (`App.tsx`)
- Responsive 3-column dashboard layout
- Header with "ClientWorks Advisor Copilot" branding
- Floating copilot popup button (bottom-right, always visible)
- State management for selected client

#### Components Implemented:

| Component | File | Purpose |
|-----------|------|---------|
| `ClientProfilePanel` | `ClientProfilePanel.tsx` | Lists mock clients, shows selected client details (name, risk tolerance, AUM, status) |
| `HoldingsTable` | `HoldingsTable.tsx` | Displays client portfolio holdings from CSV data (symbol, shares, value, allocation) |
| `AgentPanel` | `AgentPanel.tsx` | **Core feature** - Generates and displays 3 action proposals with approve workflow |
| `AuditLogPanel` | `AuditLogPanel.tsx` | Real-time audit trail display, auto-refreshes, shows simulation summaries |
| `CopilotPopup` | `CopilotPopup.tsx` | Floating market context panel with RSS headlines and market signals |

---

### 2. Backend Server (Node.js + Express)

**Location:** `server/` | **Port:** 3000

#### API Endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/clients` | GET | List all mock clients |
| `/api/clients/:id` | GET | Get single client profile |
| `/api/clients/:id/holdings` | GET | Get client holdings from CSV |
| `/api/market/headlines` | GET | Fetch real RSS headlines from 5 financial news sources |
| `/api/market/summary` | GET | Generate market signals with citations (LLM or deterministic fallback) |
| `/api/agent/propose` | POST | **Core feature** - Generate exactly 3 action proposals for a client |
| `/api/agent/approve` | POST | Approve an action and simulate execution |
| `/api/agent/proposals/:clientId` | GET | Get active proposals for a client |
| `/api/audit` | GET | Retrieve audit log entries |
| `/api/audit` | POST | Create manual audit entry |

---

### 3. Market Context Layer (Vertical Slice #1)

**Files:**
- `server/src/routes/market.js` - RSS ingestion + summarization
- `server/src/prompts/marketSummary.js` - LLM prompts for market analysis
- `frontend/src/components/CopilotPopup.tsx` - Floating UI

**Features:**
- **Real RSS Feed Ingestion** from 5 major financial news sources:
  - Bloomberg (`feeds.bloomberg.com/markets/news.rss`)
  - CNBC (`cnbc.com/id/100003114/device/rss/rss.html`)
  - Reuters (`feeds.reuters.com/reuters/businessNews`)
  - MarketWatch (`feeds.marketwatch.com/marketwatch/topstories/`)
  - NY Times Business (`rss.nytimes.com/services/xml/rss/nyt/Business.xml`)

- **10-Minute Caching** for headlines and summaries (in-memory)

- **Market Signal Generation:**
  - If `OPENAI_API_KEY` is set: Uses GPT-4o-mini for intelligent summarization
  - If no key: Uses deterministic keyword-based categorization (still works great)

- **Signal Categories:** Rates, Inflation, Equities, Tech, Energy, Geopolitics, Earnings

- **Floating Popup UI:**
  - Toggle button in bottom-right corner
  - Shows loading/error states
  - Displays market signals with clickable citations
  - "AI Enhanced" badge when LLM was used

---

### 4. Advisor Action Proposal Generation (Vertical Slice #2) - CORE FEATURE

**Files:**
- `server/src/utils/portfolioAnalytics.js` - Deterministic portfolio calculations
- `server/src/prompts/actionComposer.js` - LLM prompts + fallback templates
- `server/src/routes/agent.js` - Proposal + approval endpoints
- `frontend/src/components/AgentPanel.tsx` - Action card UI

#### Portfolio Analytics (Pure Code - No LLM)

The system calculates these metrics deterministically:

```javascript
// Asset allocation by class (Equity, Fixed Income, Cash, Commodity)
calculateAssetAllocation(holdings)

// Drift from target allocation based on risk profile
calculateAllocationDrift(holdings, riskProfile)
// Returns: { maxDrift: 15.2, exceedsThreshold: true, ... }

// Single-position concentration risk
detectConcentrationRisk(holdings)
// Returns: { hasConcentration: true, topPosition: { symbol: 'VTI', pct: 56.8 }, ... }

// Cash bucket need for near-term goals
checkCashBucketNeed(client, holdings)
// Returns: { needsCashBucket: true, goalMonths: 12, currentCashPct: 0, ... }
```

#### Target Allocations by Risk Profile:

```javascript
conservative: { Equity: 30, 'Fixed Income': 50, Cash: 15, Commodity: 5 }
moderate:     { Equity: 55, 'Fixed Income': 30, Cash: 10, Commodity: 5 }
aggressive:   { Equity: 80, 'Fixed Income': 10, Cash: 5,  Commodity: 5 }
```

#### Trigger Thresholds:
- **Drift Threshold:** > 10% triggers rebalance recommendation
- **Concentration Threshold:** > 20% single position triggers diversification recommendation
- **Cash Bucket:** Goal within 18 months + cash < 10% triggers liquidity recommendation

#### Fixed Action Types (Exactly 3):

**1️⃣ REBALANCE - Portfolio Rebalance to Target Allocation**
- Triggered when asset allocation drifts > 10% from target
- Based on client's risk profile (conservative/moderate/aggressive)
- Shows drift percentage and target allocation

**2️⃣ CONCENTRATION - Reduce Single-Position Concentration Risk**
- Triggered when any single holding exceeds 20% of portfolio
- Shows the concentrated position symbol and percentage
- Suggests gradual reduction approach

**3️⃣ CASH_BUCKET - Create Near-Term Cash Bucket**
- Triggered when goal is within 18 months AND cash allocation < 10%
- Shows goal timeline and current vs required cash percentage
- Suggests systematic transfer to money market

#### Action Proposal Response Structure:

```typescript
interface ActionProposal {
  id: string;                    // Unique action ID
  type: "REBALANCE" | "CONCENTRATION" | "CASH_BUCKET";
  title: string;                 // Human-readable title
  whyNow: string;                // 2-3 sentences, advisor-safe explanation
  metrics: {
    driftPct?: number;           // For REBALANCE
    concentrationPct?: number;   // For CONCENTRATION
    cashPct?: number;            // For CASH_BUCKET
    goalMonths?: number;
    symbol?: string;
    threshold: number;
    triggered: boolean;          // Whether this action is actively recommended
  };
  proposedSteps: string[];       // High-level steps (3 items)
  constraintsChecked: string[];  // Risk tolerance, time horizon, liquidity
  marketContextUsed: string[];   // References to current market signals
  riskNotes: string;             // Neutral risk considerations
  approvalRequired: true;        // Always true - human-in-the-loop
  usedLLM: boolean;              // Whether AI phrasing was used
}
```

#### LLM Usage (Optional, Controlled):
- If `OPENAI_API_KEY` exists: LLM phrases `whyNow`, `proposedSteps`, `riskNotes`
- All numbers and triggers come from code (never LLM)
- If no key: Uses deterministic templates (still professional language)
- Prompts live in `server/src/prompts/actionComposer.js`

#### Approval Flow:

1. Advisor clicks "Approve Action" on any card
2. Confirmation modal appears with warning: "This is a simulation. No real trades will be executed."
3. On confirm: `POST /api/agent/approve` is called
4. Backend simulates the action and generates summary
5. Audit log entry is created with full details
6. UI updates to show "Approved" status

#### Audit Log Entry on Approval:

```json
{
  "timestamp": "2026-01-30T20:40:56.624Z",
  "clientId": "1",
  "actionId": "a16cd6457fe0",
  "actionType": "REBALANCE",
  "approvedBy": "Advisor Demo User",
  "status": "APPROVED",
  "simulationSummary": "Simulated rebalance: Drift reduced from 45% to 0%. Portfolio realigned to Margaret Chen's target allocation."
}
```

---

### 5. Mock Data

**Location:** `server/data/`

#### Clients (`clients.json`):
```json
[
  { "id": "1", "name": "Margaret Chen", "risk_profile": "moderate", "aum": 2500000 },
  { "id": "2", "name": "James Morrison", "risk_profile": "conservative", "aum": 1800000 },
  { "id": "3", "name": "Sarah Williams", "risk_profile": "aggressive", "aum": 3200000 }
]
```

#### Holdings (`holdings.csv`):
- Client 1 (Margaret): AAPL, MSFT, VTI - 100% Equity, high concentration in VTI
- Client 2 (James): JNJ, PG, BND - Conservative mix with 45% bonds
- Client 3 (Sarah): TSLA, NVDA, SPY, GLD - Aggressive with commodity exposure

#### Audit Log (`server/src/logs/audit.jsonl`):
- JSONL format (one JSON object per line)
- Append-only for compliance
- Tracks all system events and advisor actions

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Port 5173)                        │
│                  React + Vite + TypeScript + Tailwind            │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Client     │  │   Holdings   │  │   Agent Panel        │   │
│  │   Panel      │  │   Table      │  │   (3 Action Cards)   │   │
│  │              │  │              │  │   + Approve Flow     │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                                       ┌──────────────────────┐   │
│                                       │   Audit Log Panel    │   │
│                                       │   (Real-time)        │   │
│                                       └──────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  Copilot Popup (Floating)                 │   │
│  │                  Market Headlines + Signals               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼ HTTP (axios)
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Port 3000)                         │
│                     Node.js + Express                            │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ /api/clients    │  │ /api/market     │  │ /api/agent      │  │
│  │ Mock JSON data  │  │ RSS + LLM       │  │ Proposals +     │  │
│  │                 │  │ Summarization   │  │ Approvals       │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────────────────────────┐   │
│  │ /api/audit      │  │ Utils: portfolioAnalytics.js        │   │
│  │ JSONL logging   │  │ Prompts: actionComposer.js          │   │
│  └─────────────────┘  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                            │
│  • RSS Feeds (Bloomberg, CNBC, Reuters, MarketWatch, NY Times)  │
│  • OpenAI API (optional - graceful fallback if not provided)    │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
clientworks-copilot/
├── frontend/
│   ├── src/
│   │   ├── App.tsx                      # Main app with 3-column layout
│   │   ├── components/
│   │   │   ├── ClientProfilePanel.tsx   # Client list + selection
│   │   │   ├── HoldingsTable.tsx        # Portfolio holdings display
│   │   │   ├── AgentPanel.tsx           # Action proposals + approval
│   │   │   ├── AuditLogPanel.tsx        # Real-time audit trail
│   │   │   └── CopilotPopup.tsx         # Floating market context
│   │   └── index.css                    # Tailwind imports
│   ├── package.json
│   └── vite.config.ts
│
├── server/
│   ├── src/
│   │   ├── server.js                    # Express app setup
│   │   ├── routes/
│   │   │   ├── clients.js               # Client data endpoints
│   │   │   ├── market.js                # RSS + summarization
│   │   │   ├── agent.js                 # Proposals + approvals
│   │   │   └── audit.js                 # Audit log endpoints
│   │   ├── prompts/
│   │   │   ├── marketSummary.js         # Market signal prompts
│   │   │   └── actionComposer.js        # Action phrasing prompts
│   │   ├── utils/
│   │   │   ├── audit.js                 # JSONL logging
│   │   │   └── portfolioAnalytics.js    # Portfolio calculations
│   │   └── logs/
│   │       └── audit.jsonl              # Audit trail file
│   ├── data/
│   │   ├── clients.json                 # Mock client profiles
│   │   └── holdings.csv                 # Mock portfolio holdings
│   └── package.json
│
├── .env.example                          # Environment template
├── README.md                             # Project overview
└── QUICKSTART.md                         # Setup instructions
```

---

## How to Run

```bash
# Terminal 1 - Backend
cd server && npm install && npm start
# Runs on http://localhost:3000

# Terminal 2 - Frontend
cd frontend && npm install && npm run dev
# Runs on http://localhost:5173
```

**Optional:** Create `server/.env` with `OPENAI_API_KEY=sk-...` for AI-enhanced phrasing.

---

## Demo Flow (< 3 Minutes)

1. **Open** http://localhost:5173
2. **Select** a client (e.g., Margaret Chen)
3. **View** holdings in center panel
4. **Click** "Generate Action Proposals" in Agent Panel
5. **See** 3 action cards appear:
   - ⚖️ Rebalance (45% drift detected)
   - 🎯 Concentration (VTI at 56.8%)
   - 💵 Cash Bucket (0% cash, goal in 18 months)
6. **Expand** any card to see full details
7. **Click** "Approve Action" → Confirmation modal
8. **Confirm** → See "Approved" badge + simulation summary
9. **Check** Audit Log Panel for the entry
10. **Click** floating button (bottom-right) to see Market Context popup with real headlines

---

## Design Principles

1. **Human-in-the-Loop** - All actions require explicit advisor approval
2. **Transparency** - Citations link to source articles, metrics shown clearly
3. **Audit Everything** - JSONL log captures all system events
4. **Graceful Degradation** - Works without OpenAI key using deterministic fallbacks
5. **Real Data Where Possible** - Live RSS feeds, not hardcoded headlines
6. **Compliance-Friendly** - Neutral language, no guarantees, no pressure
7. **Demo-Ready** - Single command to start, works with mock data

---

## What This Demo Shows (For Judges)

1. **Client Context Awareness** - System understands client profile, holdings, risk tolerance
2. **Market Intelligence** - Real-time market context from major news sources
3. **Intelligent Analysis** - Portfolio analytics detect actionable situations
4. **Structured Recommendations** - Clear, professional action proposals
5. **Advisor Control** - Human approval required for every action
6. **Compliance Trail** - Full audit logging of all decisions
7. **Production Architecture** - Clean separation of concerns, ready to extend

---

## Future Enhancements (TODOs in Code)

- Connect to real ClientView API instead of mock data
- Add authentication and advisor sessions
- Implement real trade execution via broker API
- Add more sophisticated LLM reasoning chains
- Build compliance review workflow
- Add email/notification for pending actions
- Implement proposal expiration
- Add multi-client batch analysis
