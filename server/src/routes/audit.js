import express from 'express'
import { readAuditLogs, logAudit } from '../utils/audit.js'

const router = express.Router()

/**
 * GET /api/audit
 * Retrieve audit logs (most recent first)
 */
router.get('/', (req, res) => {
  const limit = parseInt(req.query.limit) || 50
  const logs = readAuditLogs(limit)
  
  res.json({
    success: true,
    data: logs,
    count: logs.length
  })
})

/**
 * POST /api/audit
 * Create a manual audit entry
 */
router.post('/', (req, res) => {
  const { action, details, metadata } = req.body
  
  if (!action || !details) {
    return res.status(400).json({ error: 'action and details are required' })
  }
  
  logAudit({ action, details, metadata })
  
  res.json({
    success: true,
    message: 'Audit entry created'
  })
})

export default router
