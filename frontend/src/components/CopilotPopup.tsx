import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'

// ============================================================================
// TYPES
// ============================================================================

interface MarketSummary {
  headline: string
  indices: { name: string; value: string; change: string }[]
  keyNews: string[]
  timestamp: string
}

interface NewsItem {
  headline: string
  source: string
  timestamp: string
  symbols?: string[]
  sentiment?: 'positive' | 'negative' | 'neutral'
}

interface ActionMetrics {
  driftPct?: number
  concentrationPct?: number
  cashPct?: number
  goalMonths?: number
  symbol?: string
  threshold?: number
  triggered?: boolean
  requiredCashPct?: number
}

interface ActionProposal {
  id: string
  type: 'REBALANCE' | 'CONCENTRATION' | 'CASH_BUCKET'
  title: string
  whyNow: string
  metrics: ActionMetrics
  proposedSteps: string[]
  constraintsChecked: string[]
  marketContextUsed: string[]
  riskNotes: string
  approvalRequired: boolean
  usedLLM?: boolean
  status?: string
  approvedBy?: string
  approvedAt?: string
  regenerationAttempts?: number
}

interface Proposal {
  id: string
  clientId: string
  clientName: string
  timestamp: string
  portfolioSummary: {
    totalValue: number
    holdingsCount: number
    assetAllocation: Record<string, number>
  }
  actions: ActionProposal[]
  status: string
}

interface AuditEntry {
  timestamp: string
  action: string
  details: string
  metadata?: {
    clientId?: string
    actionId?: string
    actionType?: string
    approvedBy?: string
    status?: string
    simulationSummary?: string
  }
}

interface Holding {
  symbol: string
  name: string
  quantity: number
  price: number
  value: number
  allocation: number
}

interface Props {
  selectedClientId: string | null
  onActionApproved?: () => void
}

type Tab = 'market' | 'client' | 'actions' | 'audit'

// ============================================================================
// COMPONENT
// ============================================================================

export default function CopilotPopup({ selectedClientId, onActionApproved }: Props) {
  // Popup state
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('market')
  
  // Market tab state
  const [marketSummary, setMarketSummary] = useState<MarketSummary | null>(null)
  const [marketLoading, setMarketLoading] = useState(false)
  
  // Client insights tab state
  const [clientHoldings, setClientHoldings] = useState<Holding[]>([])
  const [clientNews, setClientNews] = useState<NewsItem[]>([])
  const [clientNewsLoading, setClientNewsLoading] = useState(false)
  const lastFetchedClientId = useRef<string | null>(null)
  
  // Actions tab state
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [actionsLoading, setActionsLoading] = useState(false)
  const [actionsError, setActionsError] = useState<string | null>(null)
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set())
  const [confirmModal, setConfirmModal] = useState<{ action: ActionProposal } | null>(null)
  const [approving, setApproving] = useState(false)
  const [feedbackModal, setFeedbackModal] = useState<{ action: ActionProposal } | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [regenerating, setRegenerating] = useState<string | null>(null)
  
  // Audit tab state
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([])
  const [auditLoading, setAuditLoading] = useState(false)

  // Auto-open popup when client is selected
  useEffect(() => {
    if (selectedClientId) {
      setIsOpen(true)
      setActiveTab('client')
      setProposal(null)
      setActionsError(null)
      setExpandedActions(new Set())
    }
  }, [selectedClientId])

  // Fetch market summary
  const fetchMarketSummary = useCallback(async () => {
    setMarketLoading(true)
    try {
      const response = await axios.get('http://localhost:3000/api/market/summary')
      if (response.data.success) {
        setMarketSummary(response.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch market summary:', err)
    } finally {
      setMarketLoading(false)
    }
  }, [])

  // Fetch client holdings and generate news
  const fetchClientInsights = useCallback(async () => {
    if (!selectedClientId) return
    
    setClientNewsLoading(true)
    try {
      // Get holdings
      const holdingsRes = await axios.get(`http://localhost:3000/api/clients/${selectedClientId}/holdings`)
      if (holdingsRes.data.success) {
        const holdings = holdingsRes.data.data
        setClientHoldings(holdings)
        
        // Generate personalized news based on holdings symbols
        const symbols = holdings.map((h: Holding) => h.symbol)
        const newsRes = await axios.post('http://localhost:3000/api/market/client-news', { symbols })
        if (newsRes.data.success) {
          setClientNews(newsRes.data.data)
        }
      }
    } catch (err) {
      console.error('Failed to fetch client insights:', err)
      // Fallback: generate mock news
      setClientNews([{
        headline: 'Unable to load personalized news at this time',
        source: 'System',
        timestamp: new Date().toISOString(),
        sentiment: 'neutral' as const
      }])
    } finally {
      setClientNewsLoading(false)
    }
  }, [selectedClientId])

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true)
    try {
      const response = await axios.get('http://localhost:3000/api/audit')
      if (response.data.success) {
        setAuditLogs(response.data.data.reverse().slice(0, 15))
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
    } finally {
      setAuditLoading(false)
    }
  }, [])

  // Load data based on active tab - only fetch when needed
  useEffect(() => {
    if (!isOpen) return
    
    if (activeTab === 'market' && !marketSummary && !marketLoading) {
      fetchMarketSummary()
    } else if (activeTab === 'audit' && !auditLoading) {
      fetchAuditLogs()
    }
  }, [isOpen, activeTab, marketSummary, marketLoading, auditLoading, fetchMarketSummary, fetchAuditLogs])

  // Fetch client insights when client changes (not on every tab switch)
  useEffect(() => {
    if (selectedClientId && isOpen && lastFetchedClientId.current !== selectedClientId) {
      lastFetchedClientId.current = selectedClientId
      fetchClientInsights()
    }
  }, [selectedClientId, fetchClientInsights, isOpen])

  // ============================================================================
  // ACTION HANDLERS
  // ============================================================================

  const handleGenerateProposal = async () => {
    if (!selectedClientId) return

    setActionsLoading(true)
    setActionsError(null)
    setProposal(null)

    try {
      const response = await axios.post('http://localhost:3000/api/agent/propose', {
        clientId: selectedClientId
      })
      
      if (response.data.success) {
        setProposal(response.data.data)
      } else {
        setActionsError('Failed to generate proposals')
      }
    } catch (err: any) {
      setActionsError(err.response?.data?.error || 'Failed to connect to server')
    } finally {
      setActionsLoading(false)
    }
  }

  const handleApprove = async (action: ActionProposal) => {
    if (!selectedClientId) return

    setApproving(true)
    
    try {
      const response = await axios.post('http://localhost:3000/api/agent/approve', {
        clientId: selectedClientId,
        actionId: action.id,
        approvedBy: 'Advisor Demo User'
      })
      
      if (response.data.success) {
        if (proposal) {
          const updatedActions = proposal.actions.map(a => 
            a.id === action.id 
              ? { ...a, status: 'APPROVED', approvedBy: 'Advisor Demo User', approvedAt: new Date().toISOString() }
              : a
          )
          setProposal({ ...proposal, actions: updatedActions })
        }
        
        // Refresh audit log and notify parent
        fetchAuditLogs()
        if (onActionApproved) {
          onActionApproved()
        }
      }
    } catch (err: any) {
      setActionsError(err.response?.data?.error || 'Failed to approve action')
    } finally {
      setApproving(false)
      setConfirmModal(null)
    }
  }

  const handleRegenerate = async (action: ActionProposal) => {
    if (!selectedClientId) return

    setRegenerating(action.id)
    
    try {
      const response = await axios.post('http://localhost:3000/api/agent/regenerate', {
        clientId: selectedClientId,
        actionId: action.id,
        feedback: feedbackText || undefined
      })
      
      if (response.data.success) {
        if (proposal) {
          const updatedActions = proposal.actions.map(a => 
            a.id === action.id ? response.data.data.action : a
          )
          setProposal({ ...proposal, actions: updatedActions })
        }
      }
    } catch (err: any) {
      setActionsError(err.response?.data?.error || 'Failed to regenerate action')
    } finally {
      setRegenerating(null)
      setFeedbackModal(null)
      setFeedbackText('')
    }
  }

  const toggleExpanded = (actionId: string) => {
    const newExpanded = new Set(expandedActions)
    if (newExpanded.has(actionId)) {
      newExpanded.delete(actionId)
    } else {
      newExpanded.add(actionId)
    }
    setExpandedActions(newExpanded)
  }

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'REBALANCE': return '⚖️'
      case 'CONCENTRATION': return '🎯'
      case 'CASH_BUCKET': return '💵'
      default: return '📋'
    }
  }

  const getStatusBadge = (action: ActionProposal) => {
    if (action.status === 'APPROVED') {
      return <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">✓ Approved</span>
    }
    if (action.metrics.triggered) {
      return <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full">Recommended</span>
    }
    return <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">For Review</span>
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const getAuditColor = (action: string) => {
    if (action.includes('APPROVED')) return 'text-green-700 bg-green-50'
    if (action.includes('PROPOSAL')) return 'text-blue-700 bg-blue-50'
    if (action.includes('ERROR')) return 'text-red-700 bg-red-50'
    return 'text-gray-700 bg-gray-50'
  }

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return 'border-l-green-400'
      case 'negative': return 'border-l-red-400'
      default: return 'border-l-gray-300'
    }
  }

  // ============================================================================
  // TAB CONTENT RENDERERS
  // ============================================================================

  const renderMarketTab = () => (
    <div className="p-3 space-y-3">
      {marketLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : marketSummary ? (
        <>
          {/* Headline */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-800">{marketSummary.headline}</p>
          </div>

          {/* Indices */}
          <div className="grid grid-cols-3 gap-2">
            {marketSummary.indices.map((idx, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">{idx.name}</p>
                <p className="text-sm font-semibold text-gray-900">{idx.value}</p>
                <p className={`text-xs font-medium ${idx.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {idx.change}
                </p>
              </div>
            ))}
          </div>

          {/* Key News */}
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Key Headlines</p>
            <div className="space-y-1.5">
              {marketSummary.keyNews.map((news, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{news}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-gray-500 text-sm">
          Failed to load market data
        </div>
      )}
    </div>
  )

  const renderClientTab = () => (
    <div className="p-3 space-y-3">
      {!selectedClientId ? (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">Select a client to see personalized insights</p>
        </div>
      ) : clientNewsLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Holdings Summary */}
          {clientHoldings.length > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-700 mb-2">Portfolio Holdings</p>
              <div className="flex flex-wrap gap-1.5">
                {clientHoldings.slice(0, 6).map((h, i) => (
                  <span key={i} className="px-2 py-1 bg-white border border-green-200 rounded text-xs font-medium text-gray-700">
                    {h.symbol}
                  </span>
                ))}
                {clientHoldings.length > 6 && (
                  <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-500">
                    +{clientHoldings.length - 6} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Client-Specific News */}
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">News Affecting Your Holdings</p>
            {clientNews.length > 0 ? (
              <div className="space-y-2">
                {clientNews.map((news, i) => (
                  <div key={i} className={`bg-white border-l-4 ${getSentimentColor(news.sentiment)} rounded-r-lg p-2`}>
                    <p className="text-xs text-gray-800">{news.headline}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {news.symbols?.map((sym, j) => (
                        <span key={j} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">
                          {sym}
                        </span>
                      ))}
                      <span className="text-xs text-gray-400">{news.source}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No specific news for your holdings</p>
            )}
          </div>
        </>
      )}
    </div>
  )

  const renderActionsTab = () => (
    <div className="p-3 space-y-3">
      {!selectedClientId ? (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">Select a client to generate action proposals</p>
        </div>
      ) : (
        <>
          {/* Generate Button */}
          {!proposal && (
            <button
              onClick={handleGenerateProposal}
              disabled={actionsLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 text-sm"
            >
              {actionsLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Analyzing Portfolio...
                </>
              ) : (
                <>✨ Generate Action Proposals</>
              )}
            </button>
          )}

          {/* Error */}
          {actionsError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2">
              <p className="text-xs text-red-700">{actionsError}</p>
            </div>
          )}

          {/* Proposal Results */}
          {proposal && (
            <div className="space-y-2">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{proposal.clientName}</p>
                  <p className="text-xs text-gray-500">
                    ${(proposal.portfolioSummary.totalValue / 1000).toFixed(0)}K • {proposal.portfolioSummary.holdingsCount} holdings
                  </p>
                </div>
                <button
                  onClick={() => { setProposal(null); setActionsError(null); }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  New Analysis
                </button>
              </div>

              {/* Action Cards */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {proposal.actions.map((action) => (
                  <div 
                    key={action.id}
                    className={`border rounded-lg overflow-hidden ${
                      action.status === 'APPROVED' 
                        ? 'border-green-200 bg-green-50' 
                        : action.metrics.triggered 
                          ? 'border-amber-200 bg-amber-50' 
                          : 'border-gray-200 bg-white'
                    }`}
                  >
                    {/* Card Header */}
                    <div 
                      className="px-2.5 py-2 cursor-pointer hover:bg-gray-50/50 flex items-start gap-2"
                      onClick={() => toggleExpanded(action.id)}
                    >
                      <span className="text-base">{getActionIcon(action.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-xs font-medium text-gray-900">{action.title}</h3>
                          {getStatusBadge(action)}
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{action.whyNow}</p>
                      </div>
                      <svg 
                        className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedActions.has(action.id) ? 'rotate-180' : ''}`} 
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {/* Expanded Content */}
                    {expandedActions.has(action.id) && (
                      <div className="px-2.5 pb-2.5 border-t border-gray-100 bg-white/80">
                        {/* Steps */}
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-700 mb-1">Proposed Steps</p>
                          <ol className="text-xs text-gray-600 space-y-0.5 list-decimal list-inside">
                            {action.proposedSteps.slice(0, 3).map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ol>
                        </div>

                        {/* Risk Note */}
                        <p className="text-xs text-gray-500 mt-2 italic">⚠️ {action.riskNotes}</p>

                        {/* Action Buttons */}
                        {action.status !== 'APPROVED' && (
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setFeedbackModal({ action }); }}
                              disabled={regenerating === action.id}
                              className="flex-1 border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100 text-gray-700 text-xs font-medium py-1.5 px-2 rounded transition"
                            >
                              {regenerating === action.id ? '...' : '👎 Different'}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmModal({ action }); }}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-1.5 px-2 rounded transition"
                            >
                              👍 Approve
                            </button>
                          </div>
                        )}

                        {action.status === 'APPROVED' && (
                          <div className="mt-2 p-1.5 bg-green-100 rounded text-xs text-green-800">
                            ✓ Approved by {action.approvedBy}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-400 text-center">Simulation only • No real trades</p>
            </div>
          )}
        </>
      )}
    </div>
  )

  const renderAuditTab = () => (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-gray-700">Recent Activity</p>
        <button 
          onClick={fetchAuditLogs}
          disabled={auditLoading}
          className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
        >
          {auditLoading ? '...' : 'Refresh'}
        </button>
      </div>
      
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {auditLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            {auditLoading ? 'Loading...' : 'No events yet'}
          </div>
        ) : (
          auditLogs.map((log, idx) => (
            <div key={`${log.timestamp}-${idx}`} className="bg-white border border-gray-100 rounded-lg p-2">
              <div className="flex items-start gap-2">
                <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${getAuditColor(log.action)}`}>
                  {log.action}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">{log.details}</p>
              {log.metadata?.simulationSummary && (
                <p className="text-xs text-green-600 mt-1 italic">→ {log.metadata.simulationSummary}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">{formatTime(log.timestamp)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 right-4 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all z-50 ${
          isOpen ? 'bg-gray-700 hover:bg-gray-800' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <span className="text-2xl">🤖</span>
        )}
      </button>

      {/* Popup Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-40">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🤖</span>
                <div>
                  <h2 className="text-white font-semibold text-sm">ClientWorks Copilot</h2>
                  <p className="text-blue-100 text-xs">AI-powered advisor assistant</p>
                </div>
              </div>
              {selectedClientId && (
                <span className="px-2 py-0.5 bg-white/20 text-white text-xs rounded-full">
                  Client Active
                </span>
              )}
            </div>
          </div>

          {/* Tab Bar */}
          <div className="flex border-b border-gray-200">
            {[
              { id: 'market' as Tab, label: 'Market', icon: '📈' },
              { id: 'client' as Tab, label: 'Insights', icon: '👤' },
              { id: 'actions' as Tab, label: 'Actions', icon: '⚡' },
              { id: 'audit' as Tab, label: 'Audit', icon: '📋' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="max-h-96 overflow-y-auto">
            {activeTab === 'market' && renderMarketTab()}
            {activeTab === 'client' && renderClientTab()}
            {activeTab === 'actions' && renderActionsTab()}
            {activeTab === 'audit' && renderAuditTab()}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Confirm Approval</h3>
            <p className="text-sm text-gray-600 mb-3">
              Approve: <strong>{confirmModal.action.title}</strong>
            </p>
            <p className="text-xs text-gray-500 mb-4 bg-amber-50 p-2 rounded border border-amber-200">
              ⚠️ Simulation only. No real trades will be executed.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApprove(confirmModal.action)}
                disabled={approving}
                className="flex-1 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:bg-gray-400"
              >
                {approving ? 'Processing...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Request Different Approach</h3>
            <p className="text-sm text-gray-600 mb-3">
              Regenerate: <strong>{feedbackModal.action.title}</strong>
            </p>
            
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                What didn't work? (optional)
              </label>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="e.g., Too aggressive, need more conservative approach..."
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setFeedbackModal(null); setFeedbackText(''); }}
                className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRegenerate(feedbackModal.action)}
                disabled={regenerating === feedbackModal.action.id}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400"
              >
                {regenerating === feedbackModal.action.id ? 'Regenerating...' : '🔄 Regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
