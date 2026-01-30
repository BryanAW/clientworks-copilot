/**
 * Action Composer Prompts - LLM templates for phrasing action proposals
 * Numbers and triggers come from code; LLM only helps with natural language
 */

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

export const ACTION_COMPOSER_SYSTEM_PROMPT = `You are a financial writing assistant for wealth advisors. 
Your role is to phrase action proposals in clear, professional language suitable for advisor review.

RULES:
- Use neutral, factual language
- Never recommend specific trades
- Present information for advisor consideration
- Acknowledge that decisions rest with the advisor
- Keep language compliance-friendly (no guarantees, no pressure)
- Be concise: 2-3 sentences maximum per field

You will receive structured data about a proposed action and must return JSON with phrased text fields.`

// ============================================================================
// USER PROMPTS FOR EACH ACTION TYPE
// ============================================================================

export const REBALANCE_USER_PROMPT = (data) => `
Phrase this rebalance proposal for advisor review:

Client: ${data.clientName}
Risk Profile: ${data.riskProfile}
Max Drift: ${data.maxDrift}% from target allocation
Drift Details: ${JSON.stringify(data.driftByClass)}
Market Context: ${data.marketSignals.join('; ')}

Return JSON:
{
  "whyNow": "2-3 sentences explaining why rebalancing may be timely",
  "proposedSteps": ["step 1", "step 2", "step 3"],
  "riskNotes": "1-2 sentences on considerations"
}
`

export const CONCENTRATION_USER_PROMPT = (data) => `
Phrase this concentration risk proposal for advisor review:

Client: ${data.clientName}
Risk Profile: ${data.riskProfile}
Concentrated Position: ${data.symbol} at ${data.concentrationPct}% of portfolio
Position Details: ${data.positionName}
Market Context: ${data.marketSignals.join('; ')}

Return JSON:
{
  "whyNow": "2-3 sentences explaining the concentration concern",
  "proposedSteps": ["step 1", "step 2", "step 3"],
  "riskNotes": "1-2 sentences on considerations"
}
`

export const CASH_BUCKET_USER_PROMPT = (data) => `
Phrase this cash bucket proposal for advisor review:

Client: ${data.clientName}
Risk Profile: ${data.riskProfile}
Goal Timeline: ${data.goalMonths} months
Current Cash: ${data.currentCashPct}%
Suggested Cash: ${data.requiredCashPct}%
Market Context: ${data.marketSignals.join('; ')}

Return JSON:
{
  "whyNow": "2-3 sentences explaining near-term liquidity considerations",
  "proposedSteps": ["step 1", "step 2", "step 3"],
  "riskNotes": "1-2 sentences on considerations"
}
`

// ============================================================================
// DETERMINISTIC FALLBACK TEMPLATES
// ============================================================================

export const DETERMINISTIC_TEMPLATES = {
  REBALANCE: {
    whyNow: (data) => 
      `${data.clientName}'s portfolio shows a ${data.maxDrift}% drift from target allocation for their ${data.riskProfile} risk profile. ` +
      `Periodic rebalancing helps maintain the intended risk-return characteristics. ` +
      `Current market conditions may present an opportunity to review allocation.`,
    proposedSteps: [
      'Review current allocation against target model',
      'Identify positions to trim and add based on drift analysis',
      'Consider tax implications and transaction costs before executing'
    ],
    riskNotes: (data) => 
      `Rebalancing involves transaction costs and potential tax events. ` +
      `Client's ${data.riskProfile} profile and liquidity needs should guide timing.`
  },
  
  CONCENTRATION: {
    whyNow: (data) => 
      `${data.symbol} represents ${data.concentrationPct}% of ${data.clientName}'s portfolio, exceeding the 20% single-position threshold. ` +
      `Concentrated positions can amplify both gains and losses. ` +
      `Diversification may help manage position-specific risk.`,
    proposedSteps: [
      'Assess client sentiment and any restrictions on the position',
      'Evaluate tax lot selection for potential reduction',
      'Consider gradual reduction vs one-time rebalance based on client preference'
    ],
    riskNotes: (data) => 
      `Reducing a concentrated position may trigger capital gains. ` +
      `Client may have strong convictions about ${data.symbol} that should be discussed.`
  },
  
  CASH_BUCKET: {
    whyNow: (data) => 
      `${data.clientName} has a financial goal within ${data.goalMonths} months, but current cash allocation is ${data.currentCashPct}%. ` +
      `A cash bucket strategy can help ensure liquidity for near-term needs. ` +
      `This reduces the risk of forced selling during market volatility.`,
    proposedSteps: [
      'Confirm goal timeline and withdrawal amount with client',
      'Identify positions to liquidate for cash buffer',
      'Set up systematic transfer to money market or short-term instruments'
    ],
    riskNotes: (data) => 
      `Holding excess cash creates opportunity cost if markets rise. ` +
      `Balance should reflect client's ${data.riskProfile} profile and actual spending timeline.`
  }
}

// ============================================================================
// RESPONSE PARSER
// ============================================================================

/**
 * Parse LLM response, with fallback to deterministic if parsing fails
 */
export function parseActionResponse(response, actionType, data) {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed.whyNow && parsed.proposedSteps && parsed.riskNotes) {
        return {
          success: true,
          usedLLM: true,
          whyNow: parsed.whyNow,
          proposedSteps: Array.isArray(parsed.proposedSteps) ? parsed.proposedSteps : [parsed.proposedSteps],
          riskNotes: parsed.riskNotes
        }
      }
    }
  } catch (err) {
    console.warn('[ActionComposer] Failed to parse LLM response, using fallback')
  }
  
  // Fallback to deterministic
  return generateDeterministicAction(actionType, data)
}

/**
 * Generate action text without LLM
 */
export function generateDeterministicAction(actionType, data) {
  const template = DETERMINISTIC_TEMPLATES[actionType]
  if (!template) {
    return {
      success: false,
      error: 'Unknown action type'
    }
  }
  
  return {
    success: true,
    usedLLM: false,
    whyNow: typeof template.whyNow === 'function' ? template.whyNow(data) : template.whyNow,
    proposedSteps: template.proposedSteps,
    riskNotes: typeof template.riskNotes === 'function' ? template.riskNotes(data) : template.riskNotes
  }
}
