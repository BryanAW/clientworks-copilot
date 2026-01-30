import { useState } from 'react'
import ClientProfilePanel from './components/ClientProfilePanel'
import HoldingsTable from './components/HoldingsTable'
import CopilotPopup from './components/CopilotPopup'

function App() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ClientWorks</h1>
              <p className="text-sm text-gray-600 mt-1">Client Portfolio Management</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                🤖 AI Copilot Active
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Simulating ClientView */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Client List Panel */}
          <div className="lg:col-span-1">
            <ClientProfilePanel onSelectClient={setSelectedClientId} selectedClientId={selectedClientId} />
          </div>

          {/* Holdings Panel */}
          <div className="lg:col-span-1">
            {selectedClientId ? (
              <HoldingsTable clientId={selectedClientId} />
            ) : (
              <div className="bg-white rounded-lg p-8 border border-gray-200 text-center">
                <p className="text-gray-500 mb-2">Select a client to view holdings</p>
                <p className="text-xs text-gray-400">Click the 🤖 button in the bottom-right for AI assistance</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Floating Copilot Popup - THE MAIN PRODUCT */}
      <CopilotPopup selectedClientId={selectedClientId} />
    </div>
  )
}

export default App
