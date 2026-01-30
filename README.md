# ClientWorks Advisor Copilot

A lightweight, demo-ready financial advisor AI platform for hackathons.

## 🚀 Quick Start (1 min)

```bash
cd clientworks-copilot
npm install
npm run backend    # Terminal 1
npm run frontend   # Terminal 2
# Open http://localhost:5173
```

## Overview

**ClientWorks Advisor Copilot** is a proof-of-concept system showing how AI assists financial advisors with portfolio recommendations. The demo ingests client profiles, holdings, and market data, then uses an AI agent to propose rebalancing strategies.

### Problem Statement
Financial advisors face:
- **Time pressure**: Manually analyzing portfolios is tedious
- **Cognitive overload**: Tracking many clients across market conditions
- **Inconsistency**: Recommendations vary based on fatigue

### Demo Flow (3 minutes)
1. **Select client** (Margaret Chen, $2.5M AUM)
2. **View holdings** (60% tech concentration)
3. **Generate proposal** (AI-powered rebalancing)
4. **Approve & execute** (Mock trades logged)
5. **Check audit trail** (Compliance tracking)

---

## Tech Stack

**Frontend**: React 18 + TypeScript + Vite + Tailwind CSS  
**Backend**: Node.js + Express + CORS  
**Data**: JSON + CSV (no database)  
**Audit**: JSONL logging  

---

## Architecture

```
React UI (5173)
  ├── ClientProfilePanel (select client)
  ├── HoldingsTable (view portfolio)
  ├── AgentPanel (generate/approve)
  └── AuditLogPanel (track actions)
        ↓ HTTP/JSON
Express API (3000)
  ├── GET  /api/clients
  ├── GET  /api/clients/:id
  ├── GET  /api/clients/:id/holdings
  ├── POST /api/agent/propose
  ├── POST /api/agent/approve
  └── GET  /api/market/headlines
        ↓ Read
Mock Data
  ├── clients.json (3 clients)
  ├── holdings.csv (10 positions)
  ├── notes.json (advisor notes)
  └── audit.jsonl (activity log)
```

---

## Project Structure

```
clientworks-copilot/
├── frontend/                  # React + Vite
│   └── src/
│       ├── components/        # 4 UI panels
│       ├── App.tsx            # Main layout
│       └── main.tsx           # Entry point
├── server/                    # Express backend
│   ├── src/
│   │   ├── routes/            # API endpoints
│   │   ├── utils/audit.js     # Audit logging
│   │   └── server.js          # Express app
│   └── data/                  # Mock data (JSON + CSV)
├── README.md & QUICKSTART.md  # Documentation
└── package.json               # Root workspace
```

---

## Setup & Run

**Prerequisites**: Node.js 18+

```bash
npm install

# Terminal 1
npm run backend   # http://localhost:3000

# Terminal 2
npm run frontend  # http://localhost:5173
```

---

## API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/clients` | GET | List all clients |
| `/api/clients/:id` | GET | Client details |
| `/api/clients/:id/holdings` | GET | Portfolio breakdown |
| `/api/market/headlines` | GET | Market headlines |
| `/api/agent/propose` | POST | Generate proposal |
| `/api/agent/approve` | POST | Execute proposal |

---

## 3-Minute Demo

1. Select **Margaret Chen** from client list
2. View her holdings (60% tech concentration)
3. Click **"Generate Proposal"** to see AI recommendation
4. Click **"Approve"** to execute mock trades
5. Check **audit log** for compliance trail

---

## Development

- **Hot reload**: Changes auto-reload (Vite + Node --watch)
- **Debugging**: Check `server/logs/audit.jsonl` for audit trail
- **Reset**: Restart servers to reset mock data

---

## TODO Comments

Every file has `// TODO:` markers showing what needs implementation:
- Real database (replace JSON)
- Market data APIs
- AI agent logic
- Authentication
- Broker integration

---

## Disclaimer

⚠️ **Simulation only** — No real trades executed. Not financial advice. Mock data throughout.

For questions, check inline TODO comments in the code explaining next steps.

Happy hacking! 🚀
