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
// FEEDBACK-AWARE SYSTEM PROMPT (for regeneration)
// ============================================================================

export const ACTION_COMPOSER_FEEDBACK_SYSTEM_PROMPT = `You are a financial writing assistant for wealth advisors.
Your role is to phrase action proposals in clear, professional language suitable for advisor review.

The advisor was not satisfied with the previous version and has provided feedback.
You MUST address their concerns and take a DIFFERENT approach this time.

RULES:
- Use neutral, factual language
- Never recommend specific trades
- Present information for advisor consideration
- Acknowledge that decisions rest with the advisor
- Keep language compliance-friendly (no guarantees, no pressure)
- Be concise: 2-3 sentences maximum per field
- IMPORTANT: Avoid repeating the same phrasing as before
- IMPORTANT: Address the advisor's feedback directly

You will receive structured data about a proposed action, the previous version, and advisor feedback.
Return JSON with improved phrased text fields.`

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
// REGENERATION PROMPTS (with feedback)
// ============================================================================

export const REGENERATE_USER_PROMPT = (data) => `
The advisor was NOT SATISFIED with the previous version. Please provide a DIFFERENT approach.

ACTION TYPE: ${data.actionType}
Client: ${data.clientName}
Risk Profile: ${data.riskProfile}
${data.actionType === 'REBALANCE' ? `Max Drift: ${data.maxDrift}%` : ''}
${data.actionType === 'CONCENTRATION' ? `Concentrated Position: ${data.symbol} at ${data.concentrationPct}%` : ''}
${data.actionType === 'CASH_BUCKET' ? `Goal Timeline: ${data.goalMonths} months, Current Cash: ${data.currentCashPct}%` : ''}
Market Context: ${data.marketSignals?.join('; ') || 'N/A'}

--- PREVIOUS VERSION (DO NOT REPEAT) ---
Why Now: ${data.previousWhyNow}
Steps: ${data.previousSteps?.join('; ')}
Risk Notes: ${data.previousRiskNotes}

--- ADVISOR FEEDBACK ---
${data.feedback || 'The advisor wants a different perspective.'}

--- REGENERATION ATTEMPT ${data.attemptNumber || 1} ---

Provide a FRESH perspective addressing the feedback. Return JSON:
{
  "whyNow": "2-3 sentences with a DIFFERENT angle than before",
  "proposedSteps": ["new step 1", "new step 2", "new step 3"],
  "riskNotes": "1-2 sentences addressing any concerns from feedback"
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

// ============================================================================
// ALTERNATIVE DETERMINISTIC TEMPLATES (for regeneration without LLM)
// ============================================================================

export const ALTERNATIVE_DETERMINISTIC_TEMPLATES = {
  REBALANCE: [
    {
      whyNow: (data) => 
        `The portfolio allocation has drifted ${data.maxDrift}% from the target model. ` +
        `For ${data.clientName}'s ${data.riskProfile} profile, maintaining the intended asset mix is important. ` +
        `Now may be an appropriate time to discuss rebalancing options.`,
      proposedSteps: [
        'Schedule a portfolio review meeting with client',
        'Present current vs target allocation with visual comparison',
        'Discuss timing preferences: immediate vs gradual rebalancing'
      ],
      riskNotes: (data) => 
        `Consider market volatility when timing rebalancing transactions. ` +
        `Tax-loss harvesting opportunities may offset some rebalancing costs.`
    },
    {
      whyNow: (data) => 
        `${data.clientName}'s current allocation no longer matches their ${data.riskProfile} risk target (${data.maxDrift}% drift). ` +
        `Markets have created an opportunity to realign holdings. ` +
        `A disciplined rebalancing approach can help manage long-term risk.`,
      proposedSteps: [
        'Compare rebalancing approaches: full immediate vs quarterly staged',
        'Analyze which asset classes need adjustment',
        'Calculate estimated transaction costs for each approach'
      ],
      riskNotes: (data) => 
        `Short-term volatility may continue after rebalancing. ` +
        `Ensure client understands this is for long-term risk management, not market timing.`
    }
  ],
  
  CONCENTRATION: [
    {
      whyNow: (data) => 
        `A single position (${data.symbol}) now represents ${data.concentrationPct}% of the portfolio. ` +
        `This level of concentration exposes ${data.clientName} to company-specific risks. ` +
        `Discussing diversification strategies may be prudent.`,
      proposedSteps: [
        'Review client\'s attachment and restrictions on the position',
        'Present risk scenarios showing potential downside impact',
        'Explore alternatives: protective puts, covered calls, or direct reduction'
      ],
      riskNotes: (data) => 
        `Client may have emotional or legacy reasons for holding ${data.symbol}. ` +
        `Any reduction should account for tax implications and client preferences.`
    },
    {
      whyNow: (data) => 
        `${data.clientName}'s portfolio has become heavily weighted toward ${data.symbol} (${data.concentrationPct}%). ` +
        `While the position may have performed well, concentration risk has increased. ` +
        `A diversification conversation is warranted.`,
      proposedSteps: [
        'Calculate potential portfolio impact if position drops 20-40%',
        'Identify complementary positions for diversification',
        'Develop a phased reduction plan over 6-12 months if desired'
      ],
      riskNotes: (data) => 
        `Forced selling in a down market would be worse than planned diversification. ` +
        `Consider client's overall wealth picture beyond this account.`
    }
  ],
  
  CASH_BUCKET: [
    {
      whyNow: (data) => 
        `With a ${data.goalMonths}-month time horizon for upcoming needs, current cash of ${data.currentCashPct}% may be insufficient. ` +
        `Building a dedicated cash reserve can provide peace of mind for ${data.clientName}. ` +
        `This approach separates spending needs from long-term investments.`,
      proposedSteps: [
        'Quantify the exact dollar amount needed for the goal',
        'Identify lowest-cost-basis positions for liquidation',
        'Consider laddered CDs or Treasury bills for the cash bucket'
      ],
      riskNotes: (data) => 
        `Moving to cash now locks in current market values. ` +
        `If goals change or timeline extends, reassess the cash allocation.`
    },
    {
      whyNow: (data) => 
        `${data.clientName} has expressed goals requiring funds in ${data.goalMonths} months. ` +
        `A bucket strategy can segment the portfolio by time horizon. ` +
        `The near-term bucket should be insulated from market volatility.`,
      proposedSteps: [
        'Map out all expected withdrawals over the next 24 months',
        'Create a dedicated "spending bucket" separate from growth assets',
        'Establish a replenishment strategy when markets are favorable'
      ],
      riskNotes: (data) => 
        `Over-allocating to cash sacrifices long-term growth potential. ` +
        `Balance safety with ${data.clientName}'s overall financial plan.`
    }
  ]
}

/**
 * Generate alternative deterministic action for regeneration
 */
export function generateAlternativeDeterministicAction(actionType, data, attemptNumber = 1) {
  const alternatives = ALTERNATIVE_DETERMINISTIC_TEMPLATES[actionType]
  if (!alternatives || alternatives.length === 0) {
    // No alternatives, return regular deterministic
    return generateDeterministicAction(actionType, data)
  }
  
  // Pick alternative based on attempt number (cycle through)
  const index = (attemptNumber - 1) % alternatives.length
  const template = alternatives[index]
  
  return {
    success: true,
    usedLLM: false,
    regenerated: true,
    attemptNumber,
    whyNow: typeof template.whyNow === 'function' ? template.whyNow(data) : template.whyNow,
    proposedSteps: template.proposedSteps,
    riskNotes: typeof template.riskNotes === 'function' ? template.riskNotes(data) : template.riskNotes
  }
}
