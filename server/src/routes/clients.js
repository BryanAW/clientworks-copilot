import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { logAudit } from '../utils/audit.js'
import { loadClientHoldings } from '../utils/portfolioAnalytics.js'

const router = express.Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load mock data
const dataDir = path.join(__dirname, '../../data')
const clientsData = JSON.parse(fs.readFileSync(path.join(dataDir, 'clients.json'), 'utf-8'))

/**
 * GET /api/clients
 * Return list of all clients
 */
router.get('/', (req, res) => {
  // TODO: Add pagination, filtering, sorting
  logAudit({
    action: 'CLIENTS_LISTED',
    details: `Listed ${clientsData.length} clients`,
  })

  res.json({
    success: true,
    data: clientsData,
    count: clientsData.length,
  })
})

/**
 * GET /api/clients/:id
 * Return single client details
 */
router.get('/:id', (req, res) => {
  const { id } = req.params

  // TODO: Load from database, validate client access
  const client = clientsData.find((c) => c.id === id)

  if (!client) {
    logAudit({
      action: 'CLIENT_NOT_FOUND',
      details: `Client ${id} not found`,
    })
    return res.status(404).json({ error: 'Client not found' })
  }

  logAudit({
    action: 'CLIENT_VIEWED',
    details: `Viewed client ${client.name}`,
    metadata: { clientId: id },
  })

  res.json({
    success: true,
    data: client,
  })
})

/**
 * GET /api/clients/:id/holdings
 * Return client holdings from CSV
 */
router.get('/:id/holdings', (req, res) => {
  const { id } = req.params

  // Load holdings from CSV file
  const holdings = loadClientHoldings(id)
  
  // Transform to API response format
  const responseData = holdings.map((h, idx) => ({
    id: `${id}-${idx}`,
    clientId: id,
    symbol: h.symbol,
    name: h.name,
    shares: h.shares,
    price: h.pricePerShare,
    value: h.currentValue,
    allocation: h.allocationPct,
    assetClass: h.assetClass,
    sector: h.sector,
    lastUpdated: h.lastUpdated,
  }))

  logAudit({
    action: 'HOLDINGS_RETRIEVED',
    details: `Retrieved ${responseData.length} holdings for client ${id}`,
    metadata: { clientId: id },
  })

  res.json({
    success: true,
    data: responseData,
    count: responseData.length,
  })
})

export default router
