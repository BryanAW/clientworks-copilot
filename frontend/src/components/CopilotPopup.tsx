import { useState, useEffect } from 'react'

/**
 * Market Signal type from backend
 */
interface Citation {
  source: string
  title: string
  publishedAt: string
  link: string
}

interface MarketSignal {
  text: string
  citations: Citation[]
}

interface MarketSummaryResponse {
  cached: boolean
  fetchedAt: string
  usedLLM: boolean
  signals: MarketSignal[]
}

/**
 * CopilotPopup - Floating bottom-right panel for Advisor Copilot
 * 
 * This component displays market context information that will later
 * be used by the AI agent when proposing actions.
 * 
 * For now, it's read-only and shows market signals with citations.
 */
export default function CopilotPopup() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<MarketSummaryResponse | null>(null)

  // Fetch market summary when popup opens
  useEffect(() => {
    if (isOpen && !summary && !isLoading) {
      fetchMarketSummary()
    }
  }, [isOpen])

  const fetchMarketSummary = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/market/summary')
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`)
      }
      
      const data: MarketSummaryResponse = await response.json()
      setSummary(data)
    } catch (err) {
      console.error('Failed to fetch market summary:', err)
      setError('Unable to load market context. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    setSummary(null)
    fetchMarketSummary()
  }

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      })
    } catch {
      return ''
    }
  }

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all z-50 ${
          isOpen 
            ? 'bg-gray-600 hover:bg-gray-700' 
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
        aria-label={isOpen ? 'Close Copilot' : 'Open Copilot'}
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )}
      </button>

      {/* Popup Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 max-h-[70vh] bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col z-40 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Advisor Copilot</h2>
              <p className="text-xs text-gray-500">Market Context (Informational)</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              aria-label="Refresh"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-3 text-sm text-gray-500">Loading market context...</p>
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-sm text-red-700">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Summary Content */}
            {summary && !isLoading && !error && (
              <div className="space-y-4">
                {/* Meta info */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {summary.cached ? 'Cached' : 'Fresh'} • {formatTime(summary.fetchedAt)}
                  </span>
                  {summary.usedLLM && (
                    <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                      AI Enhanced
                    </span>
                  )}
                </div>

                {/* Disclaimer */}
                <div className="bg-amber-50 border border-amber-200 rounded p-2">
                  <p className="text-xs text-amber-800">
                    <strong>Note:</strong> This is market context only, not investment advice. 
                    All recommendations require advisor review and approval.
                  </p>
                </div>

                {/* Signals */}
                <div className="space-y-3">
                  {summary.signals.map((signal, idx) => (
                    <div key={idx} className="border-l-2 border-blue-400 pl-3 py-1">
                      <p className="text-sm text-gray-800">{signal.text}</p>
                      
                      {/* Citations */}
                      {signal.citations.length > 0 && (
                        <div className="mt-1.5 space-y-1">
                          {signal.citations.map((citation, cidx) => (
                            <a
                              key={cidx}
                              href={citation.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-xs text-gray-500 hover:text-blue-600 truncate"
                              title={citation.title}
                            >
                              <span className="text-gray-400">[{citation.source}]</span>{' '}
                              {citation.title}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Future integration note */}
                <div className="border-t border-gray-200 pt-3 mt-4">
                  <p className="text-xs text-gray-400 text-center">
                    {/* TODO: Add client-specific action proposals here */}
                    Select a client to enable action proposals
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
