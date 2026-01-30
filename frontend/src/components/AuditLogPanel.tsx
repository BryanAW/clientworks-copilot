import { useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import axios from 'axios'

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

export interface AuditLogPanelRef {
  refresh: () => void
}

const AuditLogPanel = forwardRef<AuditLogPanelRef>((_, ref) => {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(false)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const response = await axios.get('http://localhost:3000/api/audit')
      if (response.data.success) {
        // Reverse to show newest first
        setLogs(response.data.data.reverse().slice(0, 20))
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
    // Poll every 10 seconds for updates
    const interval = setInterval(fetchLogs, 10000)
    return () => clearInterval(interval)
  }, [fetchLogs])

  // Expose refresh method to parent
  useImperativeHandle(ref, () => ({
    refresh: fetchLogs
  }))

  const getActionColor = (action: string) => {
    if (action.includes('APPROVED')) return 'text-green-700 bg-green-50'
    if (action.includes('PROPOSAL')) return 'text-blue-700 bg-blue-50'
    if (action.includes('ERROR')) return 'text-red-700 bg-red-50'
    return 'text-gray-700 bg-gray-50'
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Audit Log</h2>
        <button 
          onClick={fetchLogs}
          disabled={loading}
          className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="divide-y divide-gray-200 max-h-80 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-500">
            {loading ? 'Loading audit logs...' : 'No events yet'}
          </div>
        ) : (
          logs.map((log, idx) => (
            <div key={`${log.timestamp}-${idx}`} className="px-4 py-3 text-sm hover:bg-gray-50">
              <div className="flex items-start gap-2">
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${getActionColor(log.action)}`}>
                  {log.action}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">{log.details}</p>
              {log.metadata?.simulationSummary && (
                <p className="text-xs text-green-600 mt-1 italic">
                  → {log.metadata.simulationSummary}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">{formatTime(log.timestamp)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
})

AuditLogPanel.displayName = 'AuditLogPanel'

export default AuditLogPanel
