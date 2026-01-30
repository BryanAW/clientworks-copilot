import express from 'express'
import Parser from 'rss-parser'
import crypto from 'crypto'
import { logAudit } from '../utils/audit.js'
import { isOpenAIEnabled, safeChatCompletion } from '../utils/openai.js'
import {
  MARKET_SUMMARY_SYSTEM_PROMPT,
  MARKET_SUMMARY_USER_PROMPT,
  parseLLMResponse
} from '../prompts/marketSummary.js'

const router = express.Router()
const rssParser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'ClientWorks-Copilot/1.0 (Financial News Aggregator)'
  }
})

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Curated list of reputable financial RSS feeds
 * These are public feeds from major financial news outlets
 */
const RSS_FEEDS = [
  { url: 'https://feeds.bloomberg.com/markets/news.rss', source: 'Bloomberg' },
  { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', source: 'CNBC' },
  { url: 'https://feeds.reuters.com/reuters/businessNews', source: 'Reuters' },
  { url: 'https://feeds.marketwatch.com/marketwatch/topstories/', source: 'MarketWatch' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml', source: 'NY Times' },
]

// Cache configuration
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes
let headlinesCache = { data: null, fetchedAt: null }
let summaryCache = { data: null, fetchedAt: null }

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate deterministic ID from headline properties
 */
function generateHeadlineId(source, title, publishedAt) {
  const hash = crypto.createHash('sha256')
  hash.update(`${source}|${title}|${publishedAt}`)
  return hash.digest('hex').substring(0, 16)
}

/**
 * Fetch and parse a single RSS feed
 * Returns empty array on failure (graceful skip)
 */
async function fetchFeed(feedConfig) {
  try {
    const feed = await rssParser.parseURL(feedConfig.url)
    return (feed.items || []).map(item => ({
      id: generateHeadlineId(feedConfig.source, item.title, item.pubDate || item.isoDate),
      title: item.title?.trim() || 'Untitled',
      link: item.link || '',
      source: feedConfig.source,
      publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
      summary: item.contentSnippet?.substring(0, 200) || item.content?.substring(0, 200) || undefined
    }))
  } catch (err) {
    console.warn(`[RSS] Failed to fetch ${feedConfig.source}: ${err.message}`)
    return []
  }
}

/**
 * Fetch all feeds concurrently and merge results
 */
async function fetchAllHeadlines() {
  const feedPromises = RSS_FEEDS.map(feed => fetchFeed(feed))
  const results = await Promise.all(feedPromises)
  
  // Flatten and dedupe by ID
  const allHeadlines = results.flat()
  const seen = new Set()
  const dedupedHeadlines = allHeadlines.filter(h => {
    if (seen.has(h.id)) return false
    seen.add(h.id)
    return true
  })
  
  // Sort by date (most recent first)
  dedupedHeadlines.sort((a, b) => 
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )
  
  // Return top 30
  return dedupedHeadlines.slice(0, 30)
}

/**
 * Check if cache is valid
 */
function isCacheValid(cache) {
  if (!cache.data || !cache.fetchedAt) return false
  return (Date.now() - cache.fetchedAt) < CACHE_TTL_MS
}

// ============================================================================
// DETERMINISTIC SUMMARIZATION (Fallback when no LLM key)
// ============================================================================

/**
 * Keyword categories for grouping headlines
 */
const KEYWORD_CATEGORIES = {
  rates: ['fed', 'federal reserve', 'interest rate', 'rate', 'fomc', 'powell', 'monetary policy', 'basis point'],
  inflation: ['inflation', 'cpi', 'consumer price', 'pce', 'prices', 'cost of living'],
  equities: ['stock', 'equity', 'shares', 's&p', 'dow', 'nasdaq', 'market', 'rally', 'decline', 'bull', 'bear'],
  tech: ['tech', 'technology', 'ai', 'artificial intelligence', 'software', 'apple', 'google', 'microsoft', 'nvidia', 'meta', 'amazon'],
  energy: ['oil', 'gas', 'energy', 'opec', 'crude', 'petroleum', 'renewable', 'solar', 'wind'],
  geopolitics: ['china', 'russia', 'ukraine', 'tariff', 'trade war', 'sanctions', 'geopolitical', 'tension', 'conflict'],
  earnings: ['earnings', 'revenue', 'profit', 'quarterly', 'beat', 'miss', 'guidance', 'forecast']
}

/**
 * Neutral signal templates for each category
 */
const SIGNAL_TEMPLATES = {
  rates: 'Recent headlines indicate ongoing attention to Federal Reserve policy and interest rate dynamics.',
  inflation: 'Inflation-related developments continue to be a focus in financial markets.',
  equities: 'Equity market activity reflects current investor sentiment and trading patterns.',
  tech: 'The technology sector remains a topic of significant market attention.',
  energy: 'Energy markets are experiencing developments that may affect broader economic conditions.',
  geopolitics: 'Geopolitical factors are contributing to current market uncertainty.',
  earnings: 'Corporate earnings reports are providing insights into business performance across sectors.'
}

/**
 * Match headline to categories based on keywords
 */
function categorizeHeadline(headline) {
  const text = (headline.title + ' ' + (headline.summary || '')).toLowerCase()
  const matches = []
  
  for (const [category, keywords] of Object.entries(KEYWORD_CATEGORIES)) {
    if (keywords.some(kw => text.includes(kw))) {
      matches.push(category)
    }
  }
  
  return matches.length > 0 ? matches : ['equities'] // default to equities
}

/**
 * Generate signals without LLM using keyword grouping
 */
function generateDeterministicSignals(headlines) {
  // Group headlines by category
  const categoryGroups = {}
  
  for (const headline of headlines) {
    const categories = categorizeHeadline(headline)
    for (const cat of categories) {
      if (!categoryGroups[cat]) categoryGroups[cat] = []
      categoryGroups[cat].push(headline)
    }
  }
  
  // Generate signals for categories with headlines
  const signals = []
  
  for (const [category, categoryHeadlines] of Object.entries(categoryGroups)) {
    if (categoryHeadlines.length === 0) continue
    
    // Take top 2 most recent headlines as citations
    const citations = categoryHeadlines.slice(0, 2).map(h => ({
      source: h.source,
      title: h.title,
      publishedAt: h.publishedAt,
      link: h.link
    }))
    
    signals.push({
      text: SIGNAL_TEMPLATES[category],
      citations
    })
    
    // Limit to 7 signals
    if (signals.length >= 7) break
  }
  
  // Ensure at least 5 signals
  while (signals.length < 5 && headlines.length > 0) {
    const remainingHeadline = headlines[signals.length]
    if (!remainingHeadline) break
    
    signals.push({
      text: `Market attention is focused on developments reported by ${remainingHeadline.source}.`,
      citations: [{
        source: remainingHeadline.source,
        title: remainingHeadline.title,
        publishedAt: remainingHeadline.publishedAt,
        link: remainingHeadline.link
      }]
    })
  }
  
  return signals.slice(0, 7)
}

// ============================================================================
// LLM SUMMARIZATION (When OpenAI is available)
// ============================================================================

/**
 * Generate signals using OpenAI GPT
 * Returns null on failure (caller should fall back to deterministic)
 */
async function generateLLMSignals(headlines) {
  // Check if OpenAI is enabled via centralized client
  if (!isOpenAIEnabled()) {
    return null // Not configured, use fallback
  }
  
  try {
    const content = await safeChatCompletion({
      systemPrompt: MARKET_SUMMARY_SYSTEM_PROMPT,
      userPrompt: MARKET_SUMMARY_USER_PROMPT(headlines),
      temperature: 0.3,
      maxTokens: 1500
    })
    
    if (!content) {
      return null // Request failed, use fallback
    }
    
    const signals = parseLLMResponse(content, headlines)
    if (!signals || signals.length === 0) {
      console.warn('[Market] Failed to parse LLM response, using fallback')
      return null
    }
    
    console.log(`[Market] Generated ${signals.length} AI-enhanced market signals`)
    return signals
    
  } catch (err) {
    console.warn(`[Market] LLM summarization failed: ${err.message}`)
    return null // Fall back to deterministic
  }
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * GET /api/market/headlines
 * Fetch and return normalized headlines from RSS feeds
 */
router.get('/headlines', async (req, res) => {
  try {
    // Check cache
    if (isCacheValid(headlinesCache)) {
      logAudit({
        action: 'HEADLINES_FETCHED',
        details: `Returned ${headlinesCache.data.length} cached headlines`,
      })
      
      return res.json({
        cached: true,
        fetchedAt: new Date(headlinesCache.fetchedAt).toISOString(),
        headlines: headlinesCache.data
      })
    }
    
    // Fetch fresh headlines
    console.log('[RSS] Fetching headlines from feeds...')
    const headlines = await fetchAllHeadlines()
    
    // Update cache
    headlinesCache = {
      data: headlines,
      fetchedAt: Date.now()
    }
    
    logAudit({
      action: 'HEADLINES_FETCHED',
      details: `Fetched ${headlines.length} fresh headlines from RSS feeds`,
    })
    
    res.json({
      cached: false,
      fetchedAt: new Date(headlinesCache.fetchedAt).toISOString(),
      headlines
    })
    
  } catch (err) {
    console.error('[RSS] Error fetching headlines:', err)
    res.status(500).json({ error: 'Failed to fetch market headlines' })
  }
})

/**
 * GET /api/market/summary
 * Generate market signals from headlines
 */
router.get('/summary', async (req, res) => {
  try {
    // Check summary cache
    if (isCacheValid(summaryCache)) {
      logAudit({
        action: 'MARKET_SUMMARY_FETCHED',
        details: `Returned ${summaryCache.data.signals.length} cached market signals`,
      })
      
      return res.json({
        success: true,
        cached: true,
        fetchedAt: new Date(summaryCache.fetchedAt).toISOString(),
        usedLLM: summaryCache.data.usedLLM,
        data: {
          headline: summaryCache.data.headline || 'Market Update',
          indices: summaryCache.data.indices || [
            { name: 'S&P 500', value: '5,234', change: '+0.5%' },
            { name: 'DJIA', value: '39,012', change: '+0.3%' },
            { name: 'NASDAQ', value: '16,421', change: '+0.8%' }
          ],
          keyNews: summaryCache.data.signals.slice(0, 5).map(s => s.text),
          timestamp: new Date(summaryCache.fetchedAt).toISOString()
        }
      })
    }
    
    // Get headlines (from cache or fresh)
    let headlines
    if (isCacheValid(headlinesCache)) {
      headlines = headlinesCache.data
    } else {
      console.log('[Summary] Fetching fresh headlines for summarization...')
      headlines = await fetchAllHeadlines()
      headlinesCache = { data: headlines, fetchedAt: Date.now() }
    }
    
    if (headlines.length === 0) {
      return res.json({
        success: true,
        cached: false,
        fetchedAt: new Date().toISOString(),
        usedLLM: false,
        data: {
          headline: 'Markets Closed or Data Unavailable',
          indices: [
            { name: 'S&P 500', value: '--', change: '--' },
            { name: 'DJIA', value: '--', change: '--' },
            { name: 'NASDAQ', value: '--', change: '--' }
          ],
          keyNews: ['No recent market headlines available. Check back later for market context.'],
          timestamp: new Date().toISOString()
        }
      })
    }
    
    // Try LLM first, fall back to deterministic
    let signals = await generateLLMSignals(headlines)
    const usedLLM = signals !== null
    
    if (!signals) {
      console.log('[Summary] Using deterministic summarization...')
      signals = generateDeterministicSignals(headlines)
    }

    // Generate a headline from top news
    const topHeadline = headlines[0]?.title || 'Market Update'
    
    // Update cache
    summaryCache = {
      data: { 
        signals, 
        usedLLM,
        headline: topHeadline,
        indices: [
          { name: 'S&P 500', value: '5,234', change: '+0.5%' },
          { name: 'DJIA', value: '39,012', change: '+0.3%' },
          { name: 'NASDAQ', value: '16,421', change: '+0.8%' }
        ]
      },
      fetchedAt: Date.now()
    }
    
    logAudit({
      action: 'MARKET_SUMMARY_GENERATED',
      details: `Generated ${signals.length} market signals (LLM: ${usedLLM})`,
    })
    
    res.json({
      success: true,
      cached: false,
      fetchedAt: new Date(summaryCache.fetchedAt).toISOString(),
      usedLLM,
      data: {
        headline: topHeadline,
        indices: summaryCache.data.indices,
        keyNews: signals.slice(0, 5).map(s => s.text),
        timestamp: new Date(summaryCache.fetchedAt).toISOString()
      }
    })
    
  } catch (err) {
    console.error('[Summary] Error generating summary:', err)
    res.status(500).json({ success: false, error: 'Failed to generate market summary' })
  }
})

/**
 * POST /api/market/client-news
 * Generate personalized news based on client's holdings symbols
 */
router.post('/client-news', async (req, res) => {
  try {
    const { symbols } = req.body
    
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ success: false, error: 'symbols array required' })
    }
    
    // Get headlines (from cache or fresh)
    let headlines
    if (isCacheValid(headlinesCache)) {
      headlines = headlinesCache.data
    } else {
      headlines = await fetchAllHeadlines()
      headlinesCache = { data: headlines, fetchedAt: Date.now() }
    }
    
    // Filter headlines that mention any of the client's symbols
    // Also include sector-related news based on common holdings
    const symbolSet = new Set(symbols.map(s => s.toUpperCase()))
    
    // Map common stock tickers to search terms
    const symbolKeywords = {
      'AAPL': ['apple', 'iphone', 'ios', 'mac'],
      'MSFT': ['microsoft', 'azure', 'windows', 'office'],
      'GOOGL': ['google', 'alphabet', 'android', 'chrome', 'youtube'],
      'GOOG': ['google', 'alphabet', 'android', 'chrome', 'youtube'],
      'AMZN': ['amazon', 'aws', 'prime', 'bezos'],
      'META': ['meta', 'facebook', 'instagram', 'whatsapp', 'zuckerberg'],
      'NVDA': ['nvidia', 'gpu', 'chip', 'ai chip', 'graphics'],
      'TSLA': ['tesla', 'musk', 'ev', 'electric vehicle'],
      'JPM': ['jpmorgan', 'jp morgan', 'dimon', 'banking'],
      'V': ['visa', 'payment', 'credit card'],
      'JNJ': ['johnson', 'pharma', 'healthcare'],
      'UNH': ['unitedhealth', 'health insurance'],
      'BRK': ['berkshire', 'buffett'],
      'XOM': ['exxon', 'oil', 'energy'],
      'CVX': ['chevron', 'oil', 'energy'],
      'PG': ['procter', 'consumer goods'],
      'HD': ['home depot', 'housing', 'retail'],
      'DIS': ['disney', 'streaming', 'entertainment'],
      'NFLX': ['netflix', 'streaming'],
      'BA': ['boeing', 'aerospace', 'aviation'],
      // Bond & fund related
      'BND': ['bond', 'fixed income', 'treasury'],
      'AGG': ['bond', 'aggregate', 'fixed income'],
      'TLT': ['treasury', 'bond', 'long-term'],
      'VTI': ['total market', 'index fund', 'vanguard'],
      'SPY': ['s&p', 'index', 'etf', 'spy'],
      'QQQ': ['nasdaq', 'tech', 'qqq'],
    }
    
    // Build search terms from client's symbols
    const searchTerms = []
    for (const symbol of symbolSet) {
      searchTerms.push(symbol.toLowerCase())
      if (symbolKeywords[symbol]) {
        searchTerms.push(...symbolKeywords[symbol])
      }
    }
    
    // Filter headlines mentioning any relevant terms
    const relevantHeadlines = headlines.filter(h => {
      const text = (h.title + ' ' + (h.summary || '')).toLowerCase()
      return searchTerms.some(term => text.includes(term))
    })
    
    // Format as client news
    const clientNews = relevantHeadlines.slice(0, 8).map(h => {
      // Determine which symbols this headline relates to
      const text = (h.title + ' ' + (h.summary || '')).toLowerCase()
      const relatedSymbols = Array.from(symbolSet).filter(symbol => {
        const keywords = symbolKeywords[symbol] || [symbol.toLowerCase()]
        return keywords.some(kw => text.includes(kw.toLowerCase()))
      })
      
      // Determine sentiment based on keywords
      let sentiment = 'neutral'
      const positiveWords = ['surge', 'jump', 'gain', 'rally', 'rise', 'beat', 'record', 'soar', 'boost', 'positive']
      const negativeWords = ['fall', 'drop', 'decline', 'slump', 'crash', 'miss', 'concern', 'fear', 'risk', 'down', 'loss']
      
      if (positiveWords.some(w => text.includes(w))) sentiment = 'positive'
      else if (negativeWords.some(w => text.includes(w))) sentiment = 'negative'
      
      return {
        headline: h.title,
        source: h.source,
        timestamp: h.publishedAt,
        symbols: relatedSymbols.length > 0 ? relatedSymbols : undefined,
        sentiment
      }
    })
    
    logAudit({
      action: 'CLIENT_NEWS_GENERATED',
      details: `Generated ${clientNews.length} personalized news items for ${symbols.length} holdings`,
    })
    
    res.json({
      success: true,
      data: clientNews
    })
    
  } catch (err) {
    console.error('[ClientNews] Error:', err)
    res.status(500).json({ success: false, error: 'Failed to generate client news' })
  }
})

export default router
