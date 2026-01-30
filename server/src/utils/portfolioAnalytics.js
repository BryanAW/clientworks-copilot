/**
 * Portfolio Analytics - Deterministic calculations for action triggers
 * NO LLM logic here - pure numeric analysis
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '../../data')

// ============================================================================
// TARGET ALLOCATIONS BY RISK PROFILE
// ============================================================================

const TARGET_ALLOCATIONS = {
  conservative: {
    Equity: 30,
    'Fixed Income': 50,
    Cash: 15,
    Commodity: 5
  },
  moderate: {
    Equity: 55,
    'Fixed Income': 30,
    Cash: 10,
    Commodity: 5
  },
  aggressive: {
    Equity: 80,
    'Fixed Income': 10,
    Cash: 5,
    Commodity: 5
  }
}

// Thresholds for triggering actions
const DRIFT_THRESHOLD_PCT = 10          // Trigger rebalance if drift > 10%
const CONCENTRATION_THRESHOLD_PCT = 20  // Trigger if single position > 20%
const CASH_BUCKET_MONTHS_THRESHOLD = 18 // Goal within 18 months
const MIN_CASH_PCT_FOR_GOAL = 10        // Minimum cash needed for near-term goal

// ============================================================================
// DATA LOADING
// ============================================================================

/**
 * Load holdings from CSV for a specific client
 */
export function loadClientHoldings(clientId) {
  const csvPath = path.join(dataDir, 'holdings.csv')
  const content = fs.readFileSync(csvPath, 'utf-8')
  const lines = content.trim().split('\n')
  const headers = lines[0].split(',')
  
  const holdings = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',')
    const row = {}
    headers.forEach((h, idx) => {
      row[h.trim()] = values[idx]?.trim()
    })
    
    // Filter by client_id
    if (row.client_id === clientId) {
      holdings.push({
        symbol: row.symbol,
        name: row.name,
        shares: parseFloat(row.shares) || 0,
        pricePerShare: parseFloat(row.price_per_share) || 0,
        currentValue: parseFloat(row.current_value) || 0,
        allocationPct: parseFloat(row.allocation_percentage) || 0,
        assetClass: row.asset_class || 'Equity',
        sector: row.sector || 'Unknown',
        lastUpdated: row.last_updated
      })
    }
  }
  
  return holdings
}

/**
 * Load client profile from JSON
 */
export function loadClientProfile(clientId) {
  const clientsPath = path.join(dataDir, 'clients.json')
  const clients = JSON.parse(fs.readFileSync(clientsPath, 'utf-8'))
  return clients.find(c => c.id === clientId) || null
}

// ============================================================================
// PORTFOLIO CALCULATIONS
// ============================================================================

/**
 * Calculate total portfolio value
 */
export function calculateTotalValue(holdings) {
  return holdings.reduce((sum, h) => sum + h.currentValue, 0)
}

/**
 * Calculate asset allocation by class
 * Returns: { Equity: 65, 'Fixed Income': 25, Cash: 5, Commodity: 5 }
 */
export function calculateAssetAllocation(holdings) {
  const totalValue = calculateTotalValue(holdings)
  if (totalValue === 0) return {}
  
  const allocation = {}
  
  for (const holding of holdings) {
    const assetClass = holding.assetClass || 'Equity'
    if (!allocation[assetClass]) allocation[assetClass] = 0
    allocation[assetClass] += (holding.currentValue / totalValue) * 100
  }
  
  // Round to 1 decimal
  for (const key of Object.keys(allocation)) {
    allocation[key] = Math.round(allocation[key] * 10) / 10
  }
  
  return allocation
}

/**
 * Calculate allocation drift vs target
 * Returns: { maxDrift: 15.2, driftByClass: { Equity: 15.2, ... }, exceedsThreshold: true }
 */
export function calculateAllocationDrift(holdings, riskProfile) {
  const currentAllocation = calculateAssetAllocation(holdings)
  const targetAllocation = TARGET_ALLOCATIONS[riskProfile] || TARGET_ALLOCATIONS.moderate
  
  const driftByClass = {}
  let maxDrift = 0
  
  // Calculate drift for each asset class
  const allClasses = new Set([
    ...Object.keys(currentAllocation),
    ...Object.keys(targetAllocation)
  ])
  
  for (const assetClass of allClasses) {
    const current = currentAllocation[assetClass] || 0
    const target = targetAllocation[assetClass] || 0
    const drift = Math.abs(current - target)
    driftByClass[assetClass] = {
      current: Math.round(current * 10) / 10,
      target,
      drift: Math.round(drift * 10) / 10
    }
    if (drift > maxDrift) maxDrift = drift
  }
  
  return {
    maxDrift: Math.round(maxDrift * 10) / 10,
    driftByClass,
    exceedsThreshold: maxDrift > DRIFT_THRESHOLD_PCT,
    threshold: DRIFT_THRESHOLD_PCT
  }
}

/**
 * Detect concentration risk (single position > threshold)
 * Returns: { hasConcentration: true, topPosition: { symbol, pct }, positions: [...] }
 */
export function detectConcentrationRisk(holdings) {
  const totalValue = calculateTotalValue(holdings)
  if (totalValue === 0) return { hasConcentration: false, topPosition: null, positions: [] }
  
  const positions = holdings.map(h => ({
    symbol: h.symbol,
    name: h.name,
    value: h.currentValue,
    pct: Math.round((h.currentValue / totalValue) * 1000) / 10
  })).sort((a, b) => b.pct - a.pct)
  
  const concentratedPositions = positions.filter(p => p.pct > CONCENTRATION_THRESHOLD_PCT)
  const topPosition = positions[0] || null
  
  return {
    hasConcentration: concentratedPositions.length > 0,
    topPosition,
    concentratedPositions,
    threshold: CONCENTRATION_THRESHOLD_PCT
  }
}

/**
 * Calculate cash allocation percentage
 */
export function calculateCashAllocation(holdings) {
  const allocation = calculateAssetAllocation(holdings)
  return allocation['Cash'] || 0
}

/**
 * Check if client has near-term goal requiring cash bucket
 * Returns: { needsCashBucket: true, goalMonths: 12, currentCashPct: 5, requiredCashPct: 10 }
 */
export function checkCashBucketNeed(client, holdings) {
  // Parse goal from notes or use created_at + 2 years as mock goal
  // In real system, this would come from client's financial plan
  
  // Mock: Check if client has been around for > 1 year (goal approaching)
  const clientCreated = new Date(client.created_at || '2024-01-01')
  const now = new Date()
  const monthsSinceCreation = Math.floor((now - clientCreated) / (30 * 24 * 60 * 60 * 1000))
  
  // Simulate: Conservative clients have retirement goal in ~12 months
  // Moderate clients have goal in ~24 months
  // Aggressive clients have goal in ~36 months
  let goalMonths
  switch (client.risk_profile) {
    case 'conservative':
      goalMonths = 12
      break
    case 'moderate':
      goalMonths = 18
      break
    case 'aggressive':
      goalMonths = 30
      break
    default:
      goalMonths = 24
  }
  
  const currentCashPct = calculateCashAllocation(holdings)
  const isNearTerm = goalMonths <= CASH_BUCKET_MONTHS_THRESHOLD
  const needsMoreCash = currentCashPct < MIN_CASH_PCT_FOR_GOAL
  
  return {
    needsCashBucket: isNearTerm && needsMoreCash,
    goalMonths,
    currentCashPct: Math.round(currentCashPct * 10) / 10,
    requiredCashPct: MIN_CASH_PCT_FOR_GOAL,
    threshold: CASH_BUCKET_MONTHS_THRESHOLD
  }
}

// ============================================================================
// FULL PORTFOLIO ANALYSIS
// ============================================================================

/**
 * Run complete portfolio analysis for a client
 */
export function analyzePortfolio(clientId) {
  const client = loadClientProfile(clientId)
  if (!client) {
    return { error: 'Client not found' }
  }
  
  const holdings = loadClientHoldings(clientId)
  if (holdings.length === 0) {
    return { error: 'No holdings found for client' }
  }
  
  const totalValue = calculateTotalValue(holdings)
  const assetAllocation = calculateAssetAllocation(holdings)
  const driftAnalysis = calculateAllocationDrift(holdings, client.risk_profile)
  const concentrationAnalysis = detectConcentrationRisk(holdings)
  const cashBucketAnalysis = checkCashBucketNeed(client, holdings)
  
  return {
    client: {
      id: client.id,
      name: client.name,
      riskProfile: client.risk_profile,
      aum: client.aum
    },
    portfolio: {
      totalValue,
      holdingsCount: holdings.length,
      assetAllocation
    },
    triggers: {
      rebalance: driftAnalysis,
      concentration: concentrationAnalysis,
      cashBucket: cashBucketAnalysis
    },
    holdings
  }
}

export { TARGET_ALLOCATIONS, DRIFT_THRESHOLD_PCT, CONCENTRATION_THRESHOLD_PCT }
