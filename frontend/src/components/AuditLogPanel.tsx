import { useEffect, useState } from 'react'

interface AuditEntry {
  id: string
  timestamp: string
  action: string
  details: string
}

export default function AuditLogPanel() {
  const [logs, setLogs] = useState<AuditEntry[]>([])

  useEffect(() => {
    // TODO: Fetch logs from /api/audit/logs or subscribe to live updates
    const mockLogs: AuditEntry[] = [
      { id: '1', timestamp: '2025-01-30 14:32:15', action: 'CLIENT_VIEWED', details: 'Viewed Margaret Chen profile' },
      { id: '2', timestamp: '2025-01-30 14:31:42', action: 'PROPOSAL_GENERATED', details: 'Generated rebalance proposal' },
      { id: '3', timestamp: '2025-01-30 14:30:10', action: 'HOLDINGS_LOADED', details: 'Loaded 3 holdings' },
    ]
    setLogs(mockLogs)
  }, [])

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Audit Log</h2>
      </div>

      <div className="divide-y divide-gray-200 max-h-80 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-500">No events yet</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="px-4 py-3 text-sm hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900">{log.action}</p>
                  <p className="text-xs text-gray-600 mt-1">{log.details}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">{log.timestamp}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
