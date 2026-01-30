/**
 * OpenAI Client Utility
 * 
 * Centralized OpenAI client initialization with:
 * - Single startup message
 * - Environment variable validation
 * - Graceful fallback when not configured
 */

let openaiClient = null
let openaiEnabled = false
let startupLogged = false

/**
 * Get the configured model name from environment
 */
export function getModelName() {
  return process.env.OPENAI_MODEL || 'gpt-4o-mini'
}

/**
 * Check if OpenAI is available
 */
export function isOpenAIEnabled() {
  return openaiEnabled
}

/**
 * Initialize OpenAI client (called once at startup)
 */
export async function initOpenAI() {
  if (startupLogged) return openaiEnabled
  
  const apiKey = process.env.OPENAI_API_KEY
  
  // Check if API key exists (no format validation)
  if (!apiKey || apiKey.trim() === '') {
    console.log('✓ OpenAI not configured — using deterministic mode')
    startupLogged = true
    return false
  }
  
  try {
    // Dynamic import to avoid issues when not using OpenAI
    const { default: OpenAI } = await import('openai')
    openaiClient = new OpenAI({ apiKey })
    openaiEnabled = true
    console.log(`✓ OpenAI enabled (model: ${getModelName()})`)
    startupLogged = true
    return true
  } catch (err) {
    console.warn('✓ OpenAI initialization failed — using deterministic mode')
    startupLogged = true
    return false
  }
}

/**
 * Get the OpenAI client instance
 * Returns null if not configured
 */
export function getOpenAIClient() {
  return openaiClient
}

/**
 * Make a chat completion request with safety wrapper
 * 
 * @param {Object} options
 * @param {string} options.systemPrompt - System message
 * @param {string} options.userPrompt - User message
 * @param {number} options.temperature - Temperature (default 0.3)
 * @param {number} options.maxTokens - Max tokens (default 1000)
 * @returns {Promise<string|null>} Response content or null on failure
 */
export async function safeChatCompletion({ systemPrompt, userPrompt, temperature = 0.3, maxTokens = 1000 }) {
  if (!openaiEnabled || !openaiClient) {
    return null
  }
  
  try {
    const completion = await openaiClient.chat.completions.create({
      model: getModelName(),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature,
      max_tokens: maxTokens
    })
    
    const content = completion.choices[0]?.message?.content
    if (!content) {
      console.warn('[OpenAI] Empty response received')
      return null
    }
    
    return content
  } catch (err) {
    // Log error without exposing sensitive details
    console.warn(`[OpenAI] Request failed: ${err.message}`)
    return null
  }
}
