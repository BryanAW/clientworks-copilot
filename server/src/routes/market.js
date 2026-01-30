import express from 'express'
import { logAudit } from '../utils/audit.js'

const router = express.Router()

/**
 * GET /api/market/headlines
 * Return market headlines and news (placeholder)
 */
router.get('/headlines', (req, res) => {
  // TODO: Integrate with real market data API (Alpha Vantage, IEX Cloud, etc)
  const mockHeadlines = [
    {
      id: '1',
      title: 'Fed Holds Rates Steady Amid Inflation Concerns',
      source: 'Financial Times',
      timestamp: new Date().toISOString(),
      impact: 'medium',
    },
    {
      id: '2',
      title: 'Tech Sector Rally Continues on AI Optimism',
      source: 'Bloomberg',
      timestamp: new Date().toISOString(),
      impact: 'high',
    },
    {
      id: '3',
      title: 'Treasury Yields Decline on Economic Data',
      source: 'Reuters',
      timestamp: new Date().toISOString(),
      impact: 'low',
    },
  ]

  logAudit({
    action: 'HEADLINES_FETCHED',
    details: `Fetched ${mockHeadlines.length} market headlines`,
  })

  res.json({
    success: true,
    data: mockHeadlines,
  })
})

export default router
