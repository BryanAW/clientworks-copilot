/**
 * Prompt templates for market summarization
 * Used when OPENAI_API_KEY is available
 */

export const MARKET_SUMMARY_SYSTEM_PROMPT = `You are a neutral market context analyzer for financial advisors. 
Your role is to synthesize recent financial headlines into brief, factual market signals.

CRITICAL RULES:
- Be neutral and factual - describe what is happening, not what to do
- NEVER give investment advice or recommendations
- NEVER use words like "buy", "sell", "outperform", "underperform", "recommend"
- NEVER make predictions or guarantees
- Always cite which headlines support each signal
- Keep each signal to 1-2 sentences maximum
- Group related headlines into coherent themes

You are providing context, not advice. Advisors will use this context to inform their own judgment.`

export const MARKET_SUMMARY_USER_PROMPT = (headlines) => `Analyze these recent financial headlines and produce 5-7 neutral market signals.

Headlines:
${headlines.map((h, i) => `[${i + 1}] "${h.title}" - ${h.source} (${h.publishedAt})`).join('\n')}

For each signal:
1. Write 1-2 neutral sentences describing the market context
2. List which headline numbers (e.g., [1], [3]) support this signal

Format your response as JSON:
{
  "signals": [
    {
      "text": "The Federal Reserve maintained current interest rate levels, citing ongoing inflation monitoring.",
      "citationIndices": [1, 4]
    }
  ]
}

Remember: Describe context only. No advice, no predictions, no recommendations.`

/**
 * Parse LLM response into MarketSignal format
 */
export function parseLLMResponse(llmResponse, headlines) {
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = llmResponse
    const jsonMatch = llmResponse.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1]
    }
    
    const parsed = JSON.parse(jsonStr.trim())
    
    if (!parsed.signals || !Array.isArray(parsed.signals)) {
      throw new Error('Invalid response structure')
    }
    
    return parsed.signals.map(signal => ({
      text: signal.text,
      citations: (signal.citationIndices || [])
        .filter(idx => idx >= 1 && idx <= headlines.length)
        .map(idx => {
          const h = headlines[idx - 1]
          return {
            source: h.source,
            title: h.title,
            publishedAt: h.publishedAt,
            link: h.link
          }
        })
    }))
  } catch (err) {
    console.error('Failed to parse LLM response:', err.message)
    return null
  }
}
