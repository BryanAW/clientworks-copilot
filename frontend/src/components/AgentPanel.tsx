import { useState, useEffect } from 'react'
import axios from 'axios'

// ============================================================================
// TYPES
// ============================================================================

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
  regeneratedAt?: string
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

interface Props {
  clientId: string | null
  onActionApproved?: () => void // callback to refresh audit log
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function AgentPanel({ clientId, onActionApproved }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set())
  const [confirmModal, setConfirmModal] = useState<{ action: ActionProposal } | null>(null)
  const [approving, setApproving] = useState(false)
  const [feedbackModal, setFeedbackModal] = useState<{ action: ActionProposal } | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [regenerating, setRegenerating] = useState<string | null>(null)

  // Reset when client changes
  useEffect(() => {
    setProposal(null)
    setError(null)
    setExpandedActions(new Set())
  }, [clientId])

  const handleGenerateProposal = async () => {
    if (!clientId) return

    setIsLoading(true)
    setError(null)
    setProposal(null)

    try {
      const response = await axios.post('http://localhost:3000/api/agent/propose', {
        clientId
      })
      
      if (response.data.success) {
        setProposal(response.data.data)
      } else {
        setError('Failed to generate proposals')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to connect to server')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (action: ActionProposal) => {
    if (!clientId) return

    setApproving(true)
    
    try {
      const response = await axios.post('http://localhost:3000/api/agent/approve', {
        clientId,
        actionId: action.id,
        approvedBy: 'Advisor Demo User'
      })
      
      if (response.data.success) {
        // Update action status in local state
        if (proposal) {
          const updatedActions = proposal.actions.map(a => 
            a.id === action.id 
              ? { ...a, status: 'APPROVED', approvedBy: 'Advisor Demo User', approvedAt: new Date().toISOString() }
              : a
          )
          setProposal({ ...proposal, actions: updatedActions })
        }
        
        // Notify parent to refresh audit log
        if (onActionApproved) {
          onActionApproved()
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to approve action')
    } finally {
      setApproving(false)
      setConfirmModal(null)
    }
  }

  const handleRegenerate = async (action: ActionProposal) => {
    if (!clientId) return

    setRegenerating(action.id)
    
    try {
      const response = await axios.post('http://localhost:3000/api/agent/regenerate', {
        clientId,
        actionId: action.id,
        feedback: feedbackText || undefined
      })
      
      if (response.data.success) {
        // Update action in local state
        if (proposal) {
          const updatedActions = proposal.actions.map(a => 
            a.id === action.id ? response.data.data.action : a
          )
          setProposal({ ...proposal, actions: updatedActions })
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to regenerate action')
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
      return <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">✓ Approved</span>
    }
    if (action.metrics.triggered) {
      return <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full">Action Recommended</span>
    }
    return <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">For Review</span>
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">AI Copilot</h2>
        <p className="text-xs text-gray-500 mt-0.5">Decision support for advisor review</p>
      </div>

      <div className="p-4 space-y-4">
        {!clientId ? (
          <div className="text-center text-gray-500 py-6">
            <p className="text-sm">Select a client to get action proposals</p>
          </div>
        ) : (
          <>
            {/* Generate Button */}
            {!proposal && (
              <button
                onClick={handleGenerateProposal}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2.5 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Analyzing Portfolio...
                  </>
                ) : (
                  <>✨ Generate Action Proposals</>
                )}
              </button>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Proposal Results */}
            {proposal && (
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{proposal.clientName}</p>
                    <p className="text-xs text-gray-500">
                      Portfolio: ${(proposal.portfolioSummary.totalValue / 1000).toFixed(0)}K • {proposal.portfolioSummary.holdingsCount} holdings
                    </p>
                  </div>
                  <button
                    onClick={() => { setProposal(null); setError(null); }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    New Analysis
                  </button>
                </div>

                {/* Action Cards */}
                {proposal.actions.map((action) => (
                  <div 
                    key={action.id}
                    className={`border rounded-lg overflow-hidden transition-all ${
                      action.status === 'APPROVED' 
                        ? 'border-green-200 bg-green-50' 
                        : action.metrics.triggered 
                          ? 'border-amber-200 bg-amber-50' 
                          : 'border-gray-200'
                    }`}
                  >
                    {/* Card Header */}
                    <div 
                      className="px-3 py-2.5 cursor-pointer hover:bg-gray-50 flex items-start gap-2"
                      onClick={() => toggleExpanded(action.id)}
                    >
                      <span className="text-lg">{getActionIcon(action.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-medium text-gray-900">{action.title}</h3>
                          {getStatusBadge(action)}
                          {action.usedLLM ? (
                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">AI-enhanced</span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">Deterministic</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{action.whyNow}</p>
                      </div>
                      <svg 
                        className={`w-4 h-4 text-gray-400 transition-transform ${expandedActions.has(action.id) ? 'rotate-180' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {/* Expanded Content */}
                    {expandedActions.has(action.id) && (
                      <div className="px-3 pb-3 border-t border-gray-100 bg-white">
                        {/* Metrics */}
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-700 mb-1">Metrics</p>
                          <div className="flex flex-wrap gap-2">
                            {action.metrics.driftPct !== undefined && (
                              <span className="px-2 py-1 bg-gray-100 text-xs rounded">
                                Drift: {action.metrics.driftPct}%
                              </span>
                            )}
                            {action.metrics.concentrationPct !== undefined && (
                              <span className="px-2 py-1 bg-gray-100 text-xs rounded">
                                {action.metrics.symbol}: {action.metrics.concentrationPct}%
                              </span>
                            )}
                            {action.metrics.cashPct !== undefined && (
                              <span className="px-2 py-1 bg-gray-100 text-xs rounded">
                                Cash: {action.metrics.cashPct}%
                              </span>
                            )}
                            {action.metrics.goalMonths !== undefined && (
                              <span className="px-2 py-1 bg-gray-100 text-xs rounded">
                                Goal: {action.metrics.goalMonths}mo
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Proposed Steps */}
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-700 mb-1">Proposed Steps</p>
                          <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                            {action.proposedSteps.map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ol>
                        </div>

                        {/* Constraints Checked */}
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-700 mb-1">Constraints Checked</p>
                          <div className="flex flex-wrap gap-1">
                            {action.constraintsChecked.map((c, i) => (
                              <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">
                                ✓ {c}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Risk Notes */}
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-700 mb-1">Risk Considerations</p>
                          <p className="text-xs text-gray-600">{action.riskNotes}</p>
                        </div>

                        {/* Market Context */}
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-700 mb-1">Market Context Used</p>
                          <ul className="text-xs text-gray-500 space-y-0.5">
                            {action.marketContextUsed.map((ctx, i) => (
                              <li key={i} className="truncate">• {ctx}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Regeneration info */}
                        {action.regenerationAttempts && action.regenerationAttempts > 0 && (
                          <div className="mt-3 p-2 bg-purple-50 border border-purple-100 rounded text-xs text-purple-700">
                            🔄 Regenerated {action.regenerationAttempts} time{action.regenerationAttempts > 1 ? 's' : ''}
                          </div>
                        )}

                        {/* Action Buttons */}
                        {action.status !== 'APPROVED' && (
                          <div className="mt-3 flex gap-2">
                            {/* Regenerate / Pivot Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setFeedbackModal({ action })
                              }}
                              disabled={regenerating === action.id}
                              className="flex-1 border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100 text-gray-700 text-sm font-medium py-2 px-4 rounded transition flex items-center justify-center gap-1"
                            >
                              {regenerating === action.id ? (
                                <>
                                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                  Regenerating...
                                </>
                              ) : (
                                <>👎 Try Different Approach</>
                              )}
                            </button>
                            
                            {/* Approve Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setConfirmModal({ action })
                              }}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded transition"
                            >
                              👍 Approve
                            </button>
                          </div>
                        )}

                        {/* Approved Info */}
                        {action.status === 'APPROVED' && (
                          <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-800">
                            ✓ Approved by {action.approvedBy} • Simulated execution complete
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}


                {/* Summary Note */}
                <p className="text-xs text-gray-400 text-center pt-2">
                  All actions require explicit advisor approval • Simulation only
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Action Approval</h3>
            <p className="text-sm text-gray-600 mb-4">
              You are about to approve: <strong>{confirmModal.action.title}</strong>
            </p>
            <p className="text-xs text-gray-500 mb-4 bg-amber-50 p-2 rounded border border-amber-200">
              ⚠️ This is a simulation. No real trades will be executed. The action will be logged to the audit trail.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApprove(confirmModal.action)}
                disabled={approving}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 transition"
              >
                {approving ? 'Processing...' : 'Approve & Simulate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback / Regenerate Modal */}
      {feedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Request Different Approach</h3>
            <p className="text-sm text-gray-600 mb-4">
              The AI will generate a new version of: <strong>{feedbackModal.action.title}</strong>
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What didn't work? (optional)
              </label>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="e.g., Too aggressive, doesn't consider tax implications, need more conservative approach..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
              <p className="text-xs text-gray-400 mt-1">
                Your feedback helps the AI provide a better alternative
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setFeedbackModal(null)
                  setFeedbackText('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRegenerate(feedbackModal.action)}
                disabled={regenerating === feedbackModal.action.id}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition"
              >
                {regenerating === feedbackModal.action.id ? 'Regenerating...' : '🔄 Regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
