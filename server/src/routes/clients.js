import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { logAudit } from '../utils/audit.js'

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
 * Return client holdings
 */
router.get('/:id/holdings', (req, res) => {
  const { id } = req.params

  // TODO: Load holdings from database or CSV file
  const mockHoldings = [
    {
      id: '1',
      clientId: id,
      symbol: 'AAPL',
      name: 'Apple Inc',
      shares: 500,
      price: 195.5,
      value: 97750,
      allocation: 35,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: '2',
      clientId: id,
      symbol: 'MSFT',
      name: 'Microsoft Corp',
      shares: 300,
      price: 420.25,
      value: 126075,
      allocation: 25,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: '3',
      clientId: id,
      symbol: 'VTI',
      name: 'Vanguard Total Stock Market',
      shares: 1200,
      price: 245.0,
      value: 294000,
      allocation: 40,
      lastUpdated: new Date().toISOString(),
    },
  ]

  logAudit({
    action: 'HOLDINGS_RETRIEVED',
    details: `Retrieved ${mockHoldings.length} holdings for client ${id}`,
    metadata: { clientId: id },
  })

  res.json({
    success: true,
    data: mockHoldings,
    count: mockHoldings.length,
  })
})

export default router
