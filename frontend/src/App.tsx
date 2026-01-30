import { useState, useEffect } from 'react'
import ClientProfilePanel from './components/ClientProfilePanel'
import HoldingsTable from './components/HoldingsTable'
import AgentPanel from './components/AgentPanel'
import AuditLogPanel from './components/AuditLogPanel'

function App() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">ClientWorks Advisor Copilot</h1>
          <p className="text-sm text-gray-600 mt-1">Financial advisor intelligence platform</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel */}
          <div className="lg:col-span-1">
            <ClientProfilePanel onSelectClient={setSelectedClientId} selectedClientId={selectedClientId} />
          </div>

          {/* Center Panel */}
          <div className="lg:col-span-1">
            {selectedClientId && (
              <>
                <HoldingsTable clientId={selectedClientId} />
              </>
            )}
            {!selectedClientId && (
              <div className="bg-white rounded-lg p-6 border border-gray-200 text-center text-gray-500">
                Select a client to view holdings
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-1 space-y-6">
            <AgentPanel clientId={selectedClientId} />
            <AuditLogPanel />
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
