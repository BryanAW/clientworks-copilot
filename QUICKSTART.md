# Quick Start

## Setup (1 min)

```bash
node --version  # Verify Node.js 18+
npm install
```

## Run (2 terminals)

**Terminal 1:**
```bash
npm run backend  # http://localhost:3000
```

**Terminal 2:**
```bash
npm run frontend # http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## Demo (3 minutes)

1. **Select** Margaret Chen from client list
2. **View** her holdings (60% tech concentration)
3. **Click** "Generate Proposal" → See AI recommendation
4. **Click** "Approve" → See mock trades execute
5. **Scroll** audit log → All actions logged

---

## Key Files

- `README.md` — Full documentation
- `frontend/src/App.tsx` — Main 3-column layout
- `server/src/server.js` — Express backend
- `server/data/` — Mock data (clients, holdings)
- Look for `// TODO:` comments for what to implement next

---

## Debugging

- Check `server/logs/audit.jsonl` for action history
- Browser DevTools (F12) for React component tree
- Terminal output for API errors
- Restart servers to reset mock data

🚀 Ready to build!
