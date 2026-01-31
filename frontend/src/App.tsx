import { useState } from 'react'
import ClientProfilePanel from './components/ClientProfilePanel'
import HoldingsTable from './components/HoldingsTable'
import CopilotPopup from './components/CopilotPopup'
import VisorLogo from './assets/VisorLogo.png'

function App() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top Navigation Bar */}
      <nav className="bg-[#003366] text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-12">
            {/* Logo & Brand */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                  <span className="text-[#003366] font-bold text-sm">CW</span>
                </div>
                <span className="font-semibold text-lg">ClientWorks</span>
              </div>
              {/* Main Nav Links */}
              <div className="hidden md:flex items-center gap-1 text-sm">
                <button className="px-3 py-1.5 bg-white/10 rounded text-white font-medium">Dashboard</button>
                <button className="px-3 py-1.5 hover:bg-white/10 rounded text-white/80">Accounts</button>
                <button className="px-3 py-1.5 hover:bg-white/10 rounded text-white/80">Planning</button>
                <button className="px-3 py-1.5 hover:bg-white/10 rounded text-white/80">Trading</button>
                <button className="px-3 py-1.5 hover:bg-white/10 rounded text-white/80">Reports</button>
              </div>
            </div>
            {/* Right Side */}
            <div className="flex items-center gap-4 text-sm">
              <span className="text-white/70 hidden sm:block">{currentDate}</span>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs rounded-full font-medium flex items-center gap-1">
                  <img src={VisorLogo} alt="Visor" className="w-4 h-4 object-contain" /> Visor
                </span>
              </div>
              <div className="flex items-center gap-2 pl-4 border-l border-white/20">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium">JD</span>
                </div>
                <span className="hidden sm:block text-white/90">John Doe</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Secondary Nav / Breadcrumb */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Home</span>
              <span className="text-gray-400">/</span>
              <span className="text-gray-500">Clients</span>
              <span className="text-gray-400">/</span>
              <span className="text-[#003366] font-medium">Client Management</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search
              </button>
              <button className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Help
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Client Management</h1>
              <p className="text-sm text-gray-600 mt-1">View and manage your client portfolios</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </button>
              <button className="px-4 py-2 bg-[#003366] rounded-lg text-sm font-medium text-white hover:bg-[#002244] flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Client
              </button>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Clients</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">3</p>
            <p className="text-xs text-green-600 mt-1">Active accounts</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total AUM</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">$7.5M</p>
            <p className="text-xs text-green-600 mt-1">+2.3% MTD</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pending Actions</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">2</p>
            <p className="text-xs text-gray-500 mt-1">Requires review</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">AI Insights</p>
            <p className="text-2xl font-bold text-[#003366] mt-1">5</p>
            <p className="text-xs text-blue-600 mt-1">New recommendations</p>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client List Panel */}
          <div className="lg:col-span-1">
            <ClientProfilePanel onSelectClient={setSelectedClientId} selectedClientId={selectedClientId} />
          </div>

          {/* Holdings Panel */}
          <div className="lg:col-span-2">
            {selectedClientId ? (
              <HoldingsTable clientId={selectedClientId} />
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Client</h3>
                <p className="text-gray-500 mb-4">Choose a client from the list to view their portfolio holdings and details</p>
                <p className="text-xs text-gray-400">
                  💡 Tip: Click the <span className="font-medium">Visor</span> button in the bottom-right corner for AI-powered insights
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Quick Actions:</span>
              <button className="text-sm text-[#003366] hover:underline">Run Compliance Check</button>
              <button className="text-sm text-[#003366] hover:underline">Generate Reports</button>
              <button className="text-sm text-[#003366] hover:underline">Schedule Review</button>
            </div>
            <div className="text-xs text-gray-500">
              Last sync: Today at {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span>© 2026 ClientWorks by LPL Financial</span>
              <span>•</span>
              <a href="#" className="hover:text-gray-700">Privacy Policy</a>
              <span>•</span>
              <a href="#" className="hover:text-gray-700">Terms of Service</a>
              <span>•</span>
              <a href="#" className="hover:text-gray-700">Disclosures</a>
            </div>
            <div className="flex items-center gap-2">
              <span>Member FINRA/SIPC</span>
              <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
              <span>v2.4.1</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Copilot Popup - THE MAIN PRODUCT */}
      <CopilotPopup selectedClientId={selectedClientId} />
    </div>
  )
}

export default App
