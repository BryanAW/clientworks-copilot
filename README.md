# Visor

**AI-Powered Assistant for Financial Advisors**

🏆 *Winner — LPL Financial Hackathon 2026*

---

## Overview

Visor helps financial advisors work smarter. It's a lightweight popup that sits inside existing advisor platforms, surfacing personalized insights and AI-driven recommendations without disrupting workflow.

We built Visor to solve a real problem: advisors juggle hundreds of clients, mountains of market news, and strict compliance requirements. Visor filters the noise, highlights what matters for each client, and suggests actions—while keeping the advisor in control.

### What It Does

- **Client-specific news** — Only shows headlines relevant to that client's holdings
- **Market snapshot** — Quick view of indices and key market movers
- **Smart recommendations** — AI analyzes the portfolio and suggests rebalancing, risk adjustments, etc.
- **Advisor approval required** — Nothing happens without human sign-off
- **Audit logging** — Every recommendation and action is documented for compliance

---

## Demo

The repo includes a simulated advisor dashboard to show how Visor integrates into real workflows. The popup is the product—the dashboard is just context.

---

## Tech Stack

**Frontend:** React 18 + TypeScript + Vite + Tailwind CSS  
**Backend:** Node.js + Express  
**AI:** OpenAI GPT-4o-mini (with deterministic fallback)  
**News:** Live RSS feeds from Bloomberg, Reuters, CNBC, MarketWatch

We used Claude as a development assistant during the hackathon for brainstorming architecture decisions and accelerating implementation.

---

## Quick Start

### Prerequisites

- Node.js 18+
- OpenAI API key (optional—works without it)

### Setup

```bash
git clone https://github.com/BryanAW/clientworks-copilot.git
cd clientworks-copilot
npm install
```

Add your API key (optional):
```bash
# server/.env
OPENAI_API_KEY=sk-...
```

### Run

```bash
# Terminal 1
cd server && npm start

# Terminal 2
cd frontend && npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

---

## How It Works

```
Advisor selects client
        ↓
Visor fetches holdings + relevant news
        ↓
Advisor clicks "Generate Proposals"
        ↓
Backend builds prompt → sends to OpenAI
        ↓
AI returns structured recommendations
        ↓
Advisor reviews, approves (or regenerates)
        ↓
Action logged to audit trail
```

---

## Project Layout

```
├── frontend/
│   └── src/
│       ├── components/
│       │   └── CopilotPopup.tsx   ← The main Visor popup
│       └── App.tsx                ← Simulated advisor dashboard
│
├── server/
│   └── src/
│       ├── routes/                ← API endpoints
│       ├── prompts/               ← OpenAI prompt templates
│       └── data/                  ← Mock client data
│
└── README.md
```

---

## API Overview

| Endpoint | What it does |
|----------|--------------|
| `GET /api/clients/:id/holdings` | Fetch client portfolio |
| `GET /api/market/summary` | Market indices + headlines |
| `POST /api/market/client-news` | News filtered by holdings |
| `POST /api/actions/generate` | Generate AI recommendations |
| `POST /api/actions/approve` | Log approved action |
| `GET /api/audit` | Compliance audit trail |

---

## Why We Built This

Financial advisors spend too much time on manual research and not enough time with clients. Visor automates the tedious parts—scanning news, checking portfolio drift, drafting recommendations—so advisors can focus on relationships.

The key insight: advisors don't want AI making decisions for them. They want AI doing the legwork so *they* can make better decisions faster. That's why everything in Visor requires explicit approval.

---

## License

Built for LPL Financial Hackathon 2026.

---

## Team

Made with ☕ and late nights.
