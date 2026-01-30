import express from 'express'
import crypto from 'crypto'
import { logAudit } from '../utils/audit.js'
import { isOpenAIEnabled, safeChatCompletion } from '../utils/openai.js'
import { analyzePortfolio, TARGET_ALLOCATIONS } from '../utils/portfolioAnalytics.js'
import {
  ACTION_COMPOSER_SYSTEM_PROMPT,
  REBALANCE_USER_PROMPT,
  CONCENTRATION_USER_PROMPT,
  CASH_BUCKET_USER_PROMPT,
  parseActionResponse,
  generateDeterministicAction
} from '../prompts/actionComposer.js'

const router = express.Router()

// ============================================================================
// IN-MEMORY STORAGE FOR PROPOSALS (Demo purposes)
// ============================================================================

const proposalStore = new Map() // proposalId -> proposal data

// ============================================================================
// HELPER: Fetch market signals from our own endpoint
// ============================================================================

async function fetchMarketSignals() {
  try {
    const response = await fetch('http://localhost:3000/api/market/summary')
    const data = await response.json()
    if (data.signals && Array.isArray(data.signals)) {
      return data.signals.map(s => s.text).slice(0, 3)
    }
  } catch (err) {
    console.warn('[Agent] Could not fetch market signals:', err.message)
  }
  return ['Market conditions are being monitored.']
}

// ============================================================================
// HELPER: Generate unique action ID
// ============================================================================

function generateActionId(clientId, actionType) {
  const hash = crypto.createHash('sha256')
  hash.update(`${clientId}-${actionType}-${Date.now()}`)
  return hash.digest('hex').substring(0, 12)
}

// ============================================================================
// HELPER: Compose action with optional LLM
// ============================================================================

async function composeAction(actionType, data, marketSignals) {
  // Check if OpenAI is enabled via centralized client
  if (isOpenAIEnabled()) {
    try {
      let userPrompt
      switch (actionType) {
        case 'REBALANCE':
          userPrompt = REBALANCE_USER_PROMPT({ ...data, marketSignals })
          break
        case 'CONCENTRATION':
          userPrompt = CONCENTRATION_USER_PROMPT({ ...data, marketSignals })
          break
        case 'CASH_BUCKET':
          userPrompt = CASH_BUCKET_USER_PROMPT({ ...data, marketSignals })
          break
        default:
          throw new Error('Unknown action type')
      }
      
      const response = await safeChatCompletion({
        systemPrompt: ACTION_COMPOSER_SYSTEM_PROMPT,
        userPrompt,
        temperature: 0.3,
        maxTokens: 500
      })
      
      if (response) {
        const parsed = parseActionResponse(response, actionType, data)
        if (parsed.success) {
          return parsed
        }
      }
      
      // If we get here, LLM response was invalid
      console.warn(`[Agent] LLM response invalid for ${actionType}, using fallback`)
      
    } catch (err) {
      console.warn(`[Agent] LLM phrasing failed for ${actionType}: ${err.message}`)
    }
  }
  
  // Fallback to deterministic templates
  return generateDeterministicAction(actionType, data)
}

// ============================================================================
// POST /api/agent/propose
// Generate exactly 3 action proposals for a client
// ============================================================================

router.post('/propose', async (req, res) => {
  const { clientId } = req.body

  if (!clientId) {
    return res.status(400).json({ error: 'clientId is required' })
  }

  try {
    // 1. Analyze portfolio
    const analysis = analyzePortfolio(clientId)
    
    if (analysis.error) {
      return res.status(404).json({ error: analysis.error })
    }
    
    const { client, portfolio, triggers, holdings } = analysis
    
    // 2. Fetch market signals
    const marketSignals = await fetchMarketSignals()
    
    // 3. Build exactly 3 action proposals
    const actions = []
    
    // ACTION 1: Portfolio Rebalance
    const rebalanceData = {
      clientName: client.name,
      riskProfile: client.riskProfile,
      maxDrift: triggers.rebalance.maxDrift,
      driftByClass: triggers.rebalance.driftByClass
    }
    const rebalanceText = await composeAction('REBALANCE', rebalanceData, marketSignals)
    
    actions.push({
      id: generateActionId(clientId, 'REBALANCE'),
      type: 'REBALANCE',
      title: 'Portfolio Rebalance to Target Allocation',
      whyNow: rebalanceText.whyNow,
      metrics: {
        driftPct: triggers.rebalance.maxDrift,
        threshold: triggers.rebalance.threshold,
        triggered: triggers.rebalance.exceedsThreshold
      },
      proposedSteps: rebalanceText.proposedSteps,
      constraintsChecked: [
        `Risk tolerance: ${client.riskProfile}`,
        `Target allocation: ${JSON.stringify(TARGET_ALLOCATIONS[client.riskProfile] || TARGET_ALLOCATIONS.moderate)}`,
        'Liquidity needs reviewed'
      ],
      marketContextUsed: marketSignals,
      riskNotes: rebalanceText.riskNotes,
      approvalRequired: true,
      usedLLM: rebalanceText.usedLLM || false
    })
    
    // ACTION 2: Reduce Concentration Risk
    const topPosition = triggers.concentration.topPosition || { symbol: 'N/A', pct: 0, name: 'None' }
    const concentrationData = {
      clientName: client.name,
      riskProfile: client.riskProfile,
      symbol: topPosition.symbol,
      concentrationPct: topPosition.pct,
      positionName: topPosition.name || topPosition.symbol
    }
    const concentrationText = await composeAction('CONCENTRATION', concentrationData, marketSignals)
    
    actions.push({
      id: generateActionId(clientId, 'CONCENTRATION'),
      type: 'CONCENTRATION',
      title: 'Reduce Single-Position Concentration Risk',
      whyNow: concentrationText.whyNow,
      metrics: {
        concentrationPct: topPosition.pct,
        symbol: topPosition.symbol,
        threshold: triggers.concentration.threshold,
        triggered: triggers.concentration.hasConcentration
      },
      proposedSteps: concentrationText.proposedSteps,
      constraintsChecked: [
        `Risk tolerance: ${client.riskProfile}`,
        `Position: ${topPosition.symbol} at ${topPosition.pct}%`,
        'Tax lot analysis recommended'
      ],
      marketContextUsed: marketSignals,
      riskNotes: concentrationText.riskNotes,
      approvalRequired: true,
      usedLLM: concentrationText.usedLLM || false
    })
    
    // ACTION 3: Cash Bucket
    const cashData = {
      clientName: client.name,
      riskProfile: client.riskProfile,
      goalMonths: triggers.cashBucket.goalMonths,
      currentCashPct: triggers.cashBucket.currentCashPct,
      requiredCashPct: triggers.cashBucket.requiredCashPct
    }
    const cashText = await composeAction('CASH_BUCKET', cashData, marketSignals)
    
    actions.push({
      id: generateActionId(clientId, 'CASH_BUCKET'),
      type: 'CASH_BUCKET',
      title: 'Create Near-Term Cash Bucket',
      whyNow: cashText.whyNow,
      metrics: {
        cashPct: triggers.cashBucket.currentCashPct,
        goalMonths: triggers.cashBucket.goalMonths,
        requiredCashPct: triggers.cashBucket.requiredCashPct,
        triggered: triggers.cashBucket.needsCashBucket
      },
      proposedSteps: cashText.proposedSteps,
      constraintsChecked: [
        `Risk tolerance: ${client.riskProfile}`,
        `Goal timeline: ${triggers.cashBucket.goalMonths} months`,
        'Emergency fund status reviewed'
      ],
      marketContextUsed: marketSignals,
      riskNotes: cashText.riskNotes,
      approvalRequired: true,
      usedLLM: cashText.usedLLM || false
    })
    
    // 4. Create proposal bundle
    const proposalId = `prop-${Date.now()}`
    const proposal = {
      id: proposalId,
      clientId,
      clientName: client.name,
      timestamp: new Date().toISOString(),
      portfolioSummary: {
        totalValue: portfolio.totalValue,
        holdingsCount: portfolio.holdingsCount,
        assetAllocation: portfolio.assetAllocation
      },
      actions,
      status: 'PENDING'
    }
    
    // Store for later approval
    proposalStore.set(proposalId, proposal)
    
    // 5. Log audit
    logAudit({
      action: 'PROPOSAL_GENERATED',
      details: `Generated 3 action proposals for ${client.name}`,
      metadata: { 
        clientId, 
        proposalId,
        actionTypes: actions.map(a => a.type),
        triggersActive: {
          rebalance: triggers.rebalance.exceedsThreshold,
          concentration: triggers.concentration.hasConcentration,
          cashBucket: triggers.cashBucket.needsCashBucket
        }
      }
    })

    res.json({
      success: true,
      data: proposal
    })
    
  } catch (err) {
    console.error('[Agent] Proposal generation failed:', err)
    res.status(500).json({ error: 'Failed to generate proposals' })
  }
})

// ============================================================================
// POST /api/agent/approve
// Approve a specific action and simulate execution
// ============================================================================

router.post('/approve', (req, res) => {
  const { clientId, actionId, approvedBy = 'Advisor Demo User' } = req.body

  if (!clientId || !actionId) {
    return res.status(400).json({ error: 'clientId and actionId are required' })
  }

  // Find the proposal containing this action
  let foundProposal = null
  let foundAction = null
  
  for (const [propId, proposal] of proposalStore.entries()) {
    if (proposal.clientId === clientId) {
      const action = proposal.actions.find(a => a.id === actionId)
      if (action) {
        foundProposal = proposal
        foundAction = action
        break
      }
    }
  }
  
  if (!foundAction) {
    return res.status(404).json({ error: 'Action not found' })
  }
  
  // Generate simulation summary based on action type
  let simulationSummary
  switch (foundAction.type) {
    case 'REBALANCE':
      simulationSummary = `Simulated rebalance: Drift reduced from ${foundAction.metrics.driftPct}% to 0%. ` +
        `Portfolio realigned to ${foundProposal.clientName}'s target allocation.`
      break
    case 'CONCENTRATION':
      simulationSummary = `Simulated concentration reduction: ${foundAction.metrics.symbol} reduced from ` +
        `${foundAction.metrics.concentrationPct}% to 15%. Proceeds diversified across core holdings.`
      break
    case 'CASH_BUCKET':
      simulationSummary = `Simulated cash bucket creation: Cash allocation increased from ` +
        `${foundAction.metrics.cashPct}% to ${foundAction.metrics.requiredCashPct}% ` +
        `for ${foundAction.metrics.goalMonths}-month goal horizon.`
      break
    default:
      simulationSummary = 'Action simulated successfully.'
  }
  
  // Update action status
  foundAction.status = 'APPROVED'
  foundAction.approvedBy = approvedBy
  foundAction.approvedAt = new Date().toISOString()
  
  // Log to audit trail (JSONL format as specified)
  const auditEntry = {
    timestamp: new Date().toISOString(),
    clientId,
    actionId,
    actionType: foundAction.type,
    approvedBy,
    status: 'APPROVED',
    simulationSummary
  }
  
  logAudit({
    action: 'ACTION_APPROVED',
    details: `${approvedBy} approved ${foundAction.type} for client ${clientId}`,
    metadata: auditEntry
  })

  res.json({
    success: true,
    data: {
      actionId,
      clientId,
      actionType: foundAction.type,
      status: 'APPROVED',
      approvedBy,
      approvedAt: foundAction.approvedAt,
      simulationSummary,
      // Note: No real trades executed - this is simulation only
      simulationMode: true
    }
  })
})

// ============================================================================
// GET /api/agent/proposals/:clientId
// Get active proposals for a client (optional helper endpoint)
// ============================================================================

router.get('/proposals/:clientId', (req, res) => {
  const { clientId } = req.params
  
  const clientProposals = []
  for (const [propId, proposal] of proposalStore.entries()) {
    if (proposal.clientId === clientId) {
      clientProposals.push(proposal)
    }
  }
  
  res.json({
    success: true,
    data: clientProposals.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  })
})

export default router
