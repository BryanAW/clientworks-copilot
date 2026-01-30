import { useState } from 'react'

interface Props {
  clientId: string | null
}

export default function AgentPanel({ clientId }: Props) {
  const [isLoading, setIsLoading] = useState(false)

  const handleGenerateProposal = async () => {
    if (!clientId) return

    setIsLoading(true)
    // TODO: Call POST /api/agent/propose with clientId
    // Expected response: { proposal: string, reasoning: string }
    setTimeout(() => {
      setIsLoading(false)
    }, 1000)
  }

  const handleApproveProposal = async () => {
    if (!clientId) return

    setIsLoading(true)
    // TODO: Call POST /api/agent/approve with clientId and proposal
    // Expected response: { success: boolean, message: string }
    setTimeout(() => {
      setIsLoading(false)
    }, 1000)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">AI Agent</h2>
      </div>

      <div className="p-4 space-y-4">
        {!clientId ? (
          <div className="text-center text-gray-500 py-6">
            <p className="text-sm">Select a client to get recommendations</p>
          </div>
        ) : (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-sm text-blue-900">
                <strong>Demo Mode:</strong> Agent will generate a placeholder proposal for this client.
              </p>
            </div>

            <button
              onClick={handleGenerateProposal}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded transition"
            >
              {isLoading ? 'Generating...' : 'Generate Proposal'}
            </button>

            <button
              onClick={handleApproveProposal}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded transition"
            >
              {isLoading ? 'Processing...' : 'Approve Proposal'}
            </button>

            <div className="bg-gray-50 rounded p-3 min-h-20 text-sm text-gray-600">
              <p className="text-gray-500">Proposal output will appear here</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
