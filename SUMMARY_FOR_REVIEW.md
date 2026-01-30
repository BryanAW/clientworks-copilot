# ClientWorks Copilot - Complete Implementation Summary

> **Last Updated:** January 30, 2026  
> **Purpose:** This document provides full context for all implemented features, their locations, and how they work together.

---

## Project Overview

**Name:** ClientWorks Copilot  
**Purpose:** AI-powered decision-support copilot for financial advisors at LPL Financial  
**Status:** Hackathon Demo (Fully Functional with Mock Data)  
**Repository:** https://github.com/BryanAW/clientworks-copilot  
**Tech Stack:** React + Vite + TypeScript (frontend), Node.js + Express (backend)

---

## Quick Reference: Where Each Feature Lives

| Feature | Frontend Location | Backend Location | UI Location |
|---------|-------------------|------------------|-------------|
| Market Headlines | `CopilotPopup.tsx` | `routes/market.js` | **Floating Popup** (bottom-right) |
| Market Summary/Signals | `CopilotPopup.tsx` | `routes/market.js`, `prompts/marketSummary.js` | **Floating Popup** |
| Client List | `ClientProfilePanel.tsx` | `routes/clients.js` | **Left Sidebar** |
| Client Profile | `ClientProfilePanel.tsx` | `routes/clients.js` | **Left Sidebar** |
| Holdings Table | `HoldingsTable.tsx` | `routes/clients.js`, `utils/portfolioAnalytics.js` | **Center Panel** |
| Action Proposals | `AgentPanel.tsx` | `routes/agent.js`, `prompts/actionComposer.js` | **Right Sidebar** |
| Approve Actions | `AgentPanel.tsx` | `routes/agent.js` | **Right Sidebar** (modal) |
| **Regenerate/Pivot Actions** | `AgentPanel.tsx` | `routes/agent.js`, `prompts/actionComposer.js` | **Right Sidebar** (modal) |
| Audit Log | `AuditLogPanel.tsx` | `routes/audit.js`, `utils/audit.js` | **Below Holdings** |

---

## Core Concept

A financial advisor AI copilot that:
1. **Appears as a floating popup panel** in the bottom-right corner of the advisor UI
2. **Reads client context** (profile, holdings, risk tolerance, goals)
3. **Pulls current market context** from real RSS feeds (Bloomberg, CNBC, Reuters, MarketWatch, NY Times)
4. **Proposes advisor-reviewed actions** (never auto-executes)
5. **Allows advisors to request different approaches** (regenerate/pivot feature)
6. **Requires explicit advisor approval** before any simulated action
7. **Logs a complete audit trail** of all interactions (JSONL format)

This is a **human-in-the-loop** system - all decisions rest with the advisor.

---

## Detailed Feature Breakdown

---

### 1. Client Selection & Holdings Display

**Purpose:** Allow advisors to select a client and view their portfolio holdings.

#### Frontend Components:

**`ClientProfilePanel.tsx`** (Left Sidebar)
- Displays list of 3 mock clients
- Click to select a client
- Shows client details: Name, Email, AUM
- Currently uses mock data (TODO: fetch from API)

**`HoldingsTable.tsx`** (Center Panel)
- Fetches holdings from `/api/clients/:id/holdings`
- Displays: Symbol, Name, Shares, Price, Value, Allocation %
- **Updates dynamically when client changes** (fixed from mock data)
- Shows loading and error states

#### Backend:

**`routes/clients.js`**
- `GET /api/clients` - List all clients
- `GET /api/clients/:id` - Get single client
- `GET /api/clients/:id/holdings` - **Reads from CSV file** (`data/holdings.csv`)

**`utils/portfolioAnalytics.js`**
- `loadClientHoldings(clientId)` - Parses CSV, filters by client_id

#### Data Files:

**`data/clients.json`**
```json
[
  { "id": "1", "name": "Margaret Chen", "riskProfile": "moderate", "aum": 2500000 },
  { "id": "2", "name": "James Morrison", "riskProfile": "conservative", "aum": 1800000 },
  { "id": "3", "name": "Sarah Williams", "riskProfile": "aggressive", "aum": 3200000 }
]
```

**`data/holdings.csv`**
- Client 1: AAPL, MSFT, VTI (Tech-heavy, 100% Equity)
- Client 2: JNJ, PG, BND (Conservative, 45% Bonds)
- Client 3: TSLA, NVDA, SPY, GLD (Aggressive with commodities)

---

### 2. Market Context Layer (Floating Popup)

**Purpose:** Show advisors current market conditions to inform their decisions.

#### Frontend Component:

**`CopilotPopup.tsx`** (Bottom-Right Floating Panel)
- Toggle button appears in bottom-right corner
- Opens floating panel with market signals
- Shows:
  - Market signals with categories (Rates, Inflation, Equities, etc.)
  - Citations linking to original news sources
  - "AI Enhanced" badge when LLM was used
  - "Deterministic" badge when using fallback
  - Loading and error states
- Refresh button to fetch new data

#### Backend:

**`routes/market.js`**
- `GET /api/market/headlines` - Fetches RSS feeds from 5 sources
- `GET /api/market/summary` - Generates market signals

**`prompts/marketSummary.js`**
- `MARKET_SUMMARY_SYSTEM_PROMPT` - Instructions for LLM
- `MARKET_SUMMARY_USER_PROMPT(headlines)` - Headlines to summarize
- `generateDeterministicSummary(headlines)` - Keyword-based fallback

#### RSS Sources:
- Bloomberg Markets
- CNBC
- Reuters Business
- MarketWatch
- NY Times Business

#### Caching:
- 10-minute in-memory cache for headlines and summaries
- Prevents excessive API calls

---

### 3. Action Proposal Generation (Right Sidebar)

**Purpose:** Generate intelligent action recommendations for advisor review.

#### Frontend Component:

**`AgentPanel.tsx`** (Right Sidebar)
- "Generate Action Proposals" button
- Displays exactly 3 action cards:
  1. **REBALANCE** - Portfolio drift correction
  2. **CONCENTRATION** - Single-position risk reduction
  3. **CASH_BUCKET** - Near-term liquidity planning
- Each card shows:
  - Title with icon (⚖️ / 🎯 / 💵)
  - Status badge (Action Recommended / For Review / Approved)
  - AI badge (AI-enhanced / Deterministic)
  - "Why Now" explanation
  - Expandable details (metrics, steps, constraints, risk notes)

#### Backend:

**`routes/agent.js`**
- `POST /api/agent/propose` - Generates 3 proposals for a client
- Uses `analyzePortfolio(clientId)` for deterministic calculations
- Uses `composeAction()` for LLM/fallback phrasing

**`utils/portfolioAnalytics.js`** (Pure Code - No LLM)
```javascript
calculateAssetAllocation(holdings)     // % by asset class
calculateAllocationDrift(holdings, riskProfile)  // Drift from target
detectConcentrationRisk(holdings)      // Single-position > 20%
checkCashBucketNeed(client, holdings)  // Near-term liquidity
analyzePortfolio(clientId)             // Full analysis bundle
```

**`prompts/actionComposer.js`**
- `ACTION_COMPOSER_SYSTEM_PROMPT` - Base instructions
- `REBALANCE_USER_PROMPT(data)` - Rebalance-specific prompt
- `CONCENTRATION_USER_PROMPT(data)` - Concentration-specific prompt
- `CASH_BUCKET_USER_PROMPT(data)` - Cash bucket-specific prompt
- `DETERMINISTIC_TEMPLATES` - Fallback templates when no LLM

#### Target Allocations by Risk Profile:
```javascript
conservative: { Equity: 30, 'Fixed Income': 50, Cash: 15, Commodity: 5 }
moderate:     { Equity: 55, 'Fixed Income': 30, Cash: 10, Commodity: 5 }
aggressive:   { Equity: 80, 'Fixed Income': 10, Cash: 5,  Commodity: 5 }
```

#### Trigger Thresholds:
- **Drift > 10%** → REBALANCE triggered
- **Single position > 20%** → CONCENTRATION triggered
- **Goal < 18 months + Cash < 10%** → CASH_BUCKET triggered

---

### 4. Action Approval Flow (Right Sidebar)

**Purpose:** Allow advisors to approve proposed actions with full audit trail.

#### Frontend Flow:

1. Advisor expands an action card in `AgentPanel.tsx`
2. Clicks "👍 Approve" button
3. **Confirmation Modal** appears:
   - Shows action title
   - Warning: "This is a simulation. No real trades will be executed."
   - Cancel / "Approve & Simulate" buttons
4. On confirm: API call to approve
5. Card updates to show ✓ Approved status
6. Audit log refreshes automatically

#### Backend:

**`routes/agent.js`**
- `POST /api/agent/approve`
  - Finds proposal and action by IDs
  - Marks action as APPROVED
  - Generates simulation summary
  - Logs to audit trail
  - Returns confirmation

#### Simulation Summaries (by type):
```
REBALANCE: "Simulated rebalance: Drift reduced from 45% to 0%. Portfolio realigned to Margaret Chen's target allocation."
CONCENTRATION: "Simulated concentration reduction: VTI reduced from 56.8% to 15%. Proceeds diversified across core holdings."
CASH_BUCKET: "Simulated cash bucket creation: Cash allocation increased from 0% to 10% for 12-month goal horizon."
```

---

### 5. ⭐ NEW: Action Regeneration / Pivot Feature (Right Sidebar)

**Purpose:** Allow advisors to request a different approach when they don't like the AI's initial recommendation.

#### Frontend Flow:

1. Advisor expands an action card in `AgentPanel.tsx`
2. Clicks "👎 Try Different Approach" button
3. **Feedback Modal** appears:
   - Title: "Request Different Approach"
   - Optional textarea for feedback (e.g., "Too aggressive", "Need more conservative approach")
   - Cancel / "🔄 Regenerate" buttons
4. On submit: API call to regenerate
5. Card updates with new content
6. Shows "🔄 Regenerated X times" badge
7. Audit log records the regeneration

#### Frontend State:
```typescript
const [feedbackModal, setFeedbackModal] = useState<{ action: ActionProposal } | null>(null)
const [feedbackText, setFeedbackText] = useState('')
const [regenerating, setRegenerating] = useState<string | null>(null)
```

#### Backend:

**`routes/agent.js`**
- `POST /api/agent/regenerate`
  - Required: `clientId`, `actionId`
  - Optional: `feedback` (advisor's criticism)
  - Tracks `attemptNumber` (for cycling through alternatives)
  - Uses feedback-aware LLM prompt OR alternative deterministic templates
  - Updates action in place
  - Logs to audit trail

**`prompts/actionComposer.js`** (New Additions)

**Feedback-Aware System Prompt:**
```javascript
export const ACTION_COMPOSER_FEEDBACK_SYSTEM_PROMPT = `...
The advisor was not satisfied with the previous version and has provided feedback.
You MUST address their concerns and take a DIFFERENT approach this time.
...`
```

**Regeneration Prompt:**
```javascript
export const REGENERATE_USER_PROMPT = (data) => `
The advisor was NOT SATISFIED with the previous version. Please provide a DIFFERENT approach.

ACTION TYPE: ${data.actionType}
...
--- PREVIOUS VERSION (DO NOT REPEAT) ---
Why Now: ${data.previousWhyNow}
...
--- ADVISOR FEEDBACK ---
${data.feedback || 'The advisor wants a different perspective.'}
...
`
```

**Alternative Deterministic Templates:**
```javascript
export const ALTERNATIVE_DETERMINISTIC_TEMPLATES = {
  REBALANCE: [
    { /* Alternative 1: Focus on client meeting */ },
    { /* Alternative 2: Focus on disciplined approach */ }
  ],
  CONCENTRATION: [
    { /* Alternative 1: Risk scenarios focus */ },
    { /* Alternative 2: Phased reduction focus */ }
  ],
  CASH_BUCKET: [
    { /* Alternative 1: Peace of mind focus */ },
    { /* Alternative 2: Bucket strategy focus */ }
  ]
}
```

**Helper Function:**
```javascript
export function generateAlternativeDeterministicAction(actionType, data, attemptNumber = 1) {
  // Cycles through alternatives based on attemptNumber
}
```

#### Regeneration Response:
```json
{
  "success": true,
  "data": {
    "action": { /* Updated action object */ },
    "attemptNumber": 2,
    "usedLLM": true
  }
}
```

---

### 6. Audit Trail (Below Holdings)

**Purpose:** Compliance-ready logging of all system events and advisor actions.

#### Frontend Component:

**`AuditLogPanel.tsx`** (Below Holdings Table)
- Auto-refreshes when actions are approved
- Shows recent audit entries
- Displays: timestamp, action type, details, simulation summary

#### Backend:

**`utils/audit.js`**
- `logAudit({ action, details, metadata })` - Appends to JSONL file

**`routes/audit.js`**
- `GET /api/audit` - Read audit entries
- `POST /api/audit` - Create manual entry

#### Audit Log File:
**`server/src/logs/audit.jsonl`** (JSONL format - one JSON per line)

#### Events Logged:
- `PROPOSAL_GENERATED` - When proposals are created
- `ACTION_APPROVED` - When advisor approves an action
- `ACTION_REGENERATED` - When advisor requests different approach
- `HOLDINGS_RETRIEVED` - When holdings are fetched
- `CLIENT_VIEWED` - When client profile is viewed
- `MARKET_SUMMARY_GENERATED` - When market signals are created

---

### 7. OpenAI Integration (Optional Enhancement)

**Purpose:** Enhance text quality when API key is available, with deterministic fallback.

#### Configuration:

**`.env` file:**
```
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini
```

**`.env.example`** (committed to repo):
```
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini
```

#### Centralized Client:

**`utils/openai.js`**
```javascript
export function initOpenAI()      // Called at server startup
export function getOpenAI()       // Returns client or null
export function isOpenAIEnabled() // Returns boolean
export async function safeChatCompletion({ systemPrompt, userPrompt, temperature, maxTokens })
```

#### Startup Message:
```
✓ OpenAI enabled (model: gpt-4o-mini)
```
or
```
ℹ OpenAI not configured - using deterministic fallback
```

#### Usage Pattern:
```javascript
if (isOpenAIEnabled()) {
  // Try LLM
  const response = await safeChatCompletion({ ... })
  if (response) { /* use it */ }
}
// Always have deterministic fallback
return generateDeterministicAction(...)
```

#### Frontend Badges:
- **"AI-enhanced"** (purple) - LLM was used
- **"Deterministic"** (gray) - Fallback was used

---

## API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/clients` | GET | List all clients |
| `/api/clients/:id` | GET | Get single client |
| `/api/clients/:id/holdings` | GET | Get client holdings from CSV |
| `/api/market/headlines` | GET | Fetch RSS headlines |
| `/api/market/summary` | GET | Generate market signals |
| `/api/agent/propose` | POST | Generate 3 action proposals |
| `/api/agent/approve` | POST | Approve an action |
| `/api/agent/regenerate` | POST | **NEW** Regenerate with feedback |
| `/api/agent/proposals/:clientId` | GET | Get active proposals |
| `/api/audit` | GET | Read audit log |
| `/api/audit` | POST | Create audit entry |

---

## File Structure

```
clientworks-copilot/
├── frontend/
│   ├── src/
│   │   ├── App.tsx                    # Main layout
│   │   ├── components/
│   │   │   ├── ClientProfilePanel.tsx # Client list & details
│   │   │   ├── HoldingsTable.tsx      # Portfolio holdings
│   │   │   ├── AgentPanel.tsx         # Action proposals + approve/regenerate
│   │   │   ├── AuditLogPanel.tsx      # Audit trail display
│   │   │   └── CopilotPopup.tsx       # Floating market context
│   │   └── main.tsx
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── server.js                  # Express app entry
│   │   ├── routes/
│   │   │   ├── clients.js             # Client & holdings API
│   │   │   ├── market.js              # RSS & market summary API
│   │   │   ├── agent.js               # Proposals, approve, regenerate
│   │   │   └── audit.js               # Audit log API
│   │   ├── prompts/
│   │   │   ├── marketSummary.js       # Market LLM prompts
│   │   │   └── actionComposer.js      # Action LLM prompts + alternatives
│   │   ├── utils/
│   │   │   ├── openai.js              # Centralized OpenAI client
│   │   │   ├── portfolioAnalytics.js  # Deterministic calculations
│   │   │   └── audit.js               # Audit logging utility
│   │   └── logs/
│   │       └── audit.jsonl            # Audit trail file
│   ├── data/
│   │   ├── clients.json               # Mock client data
│   │   └── holdings.csv               # Mock holdings data
│   └── package.json
│
├── .env.example                       # Environment template
├── README.md                          # Quick start guide
├── QUICKSTART.md                      # Detailed setup
└── SUMMARY_FOR_REVIEW.md              # This file
```

---

## Running the Application

```bash
# Terminal 1: Backend
cd server && npm install && npm start
# → http://localhost:3000

# Terminal 2: Frontend
cd frontend && npm install && npm run dev
# → http://localhost:5173
```

---

## Key Design Decisions

1. **Human-in-the-Loop:** All actions require explicit advisor approval
2. **Deterministic First:** All numbers/triggers come from code, not LLM
3. **LLM for Phrasing Only:** OpenAI enhances language, never makes decisions
4. **Graceful Degradation:** Works fully without OpenAI API key
5. **Audit Everything:** Full compliance trail in JSONL format
6. **Simulation Only:** No real trades - all actions are simulated
7. **Feedback Loop:** Advisors can pivot/regenerate for better recommendations

---

## Recent Changes (This Session)

1. ✅ Fixed holdings not updating when client changes (was using mock data)
2. ✅ Connected HoldingsTable to `/api/clients/:id/holdings` API
3. ✅ Backend now reads holdings from CSV file per client
4. ✅ **Implemented regenerate/pivot feature** for action proposals
5. ✅ Added feedback modal UI for advisor criticism
6. ✅ Added alternative deterministic templates for regeneration
7. ✅ Added feedback-aware LLM prompts (higher temperature for variety)
8. ✅ Tracks regeneration attempts per action
9. ✅ Logs regeneration events to audit trail

---

## What's NOT Implemented (Future Work)

- Real authentication/authorization
- Real database (using JSON/CSV files)
- Real trade execution (simulation only)
- Real client data sync
- Real-time market data
- Multi-user support
- Session persistence
- Error retry/recovery
