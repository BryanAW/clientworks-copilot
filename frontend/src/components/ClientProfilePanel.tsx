import { useEffect, useState } from 'react'
import axios from 'axios'

interface Client {
  id: string
  name: string
  email: string
  aum: number
  riskProfile?: string
  accountType?: string
  lastContact?: string
}

interface Props {
  onSelectClient: (clientId: string) => void
  selectedClientId: string | null
}

export default function ClientProfilePanel({ onSelectClient, selectedClientId }: Props) {
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    // Mock clients with extended data
    const mockClients: Client[] = [
      { 
        id: '1', 
        name: 'Margaret Chen', 
        email: 'margaret.chen@email.com', 
        aum: 2500000,
        riskProfile: 'Moderate',
        accountType: 'IRA',
        lastContact: '2 days ago'
      },
      { 
        id: '2', 
        name: 'James Morrison', 
        email: 'j.morrison@email.com', 
        aum: 1800000,
        riskProfile: 'Aggressive',
        accountType: 'Individual',
        lastContact: '1 week ago'
      },
      { 
        id: '3', 
        name: 'Sarah Williams', 
        email: 's.williams@email.com', 
        aum: 3200000,
        riskProfile: 'Conservative',
        accountType: 'Joint',
        lastContact: 'Today'
      },
    ]
    setClients(mockClients)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (selectedClientId) {
      const client = clients.find((c) => c.id === selectedClientId)
      setSelectedClient(client || null)
    }
  }, [selectedClientId, clients])

  const handleSelectClient = (clientId: string) => {
    onSelectClient(clientId)
  }

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Conservative': return 'bg-blue-100 text-blue-700'
      case 'Moderate': return 'bg-amber-100 text-amber-700'
      case 'Aggressive': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return <div className="text-gray-500">Loading clients...</div>
  }

  return (
    <div className="space-y-4">
      {/* Client List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">My Clients</h2>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{clients.length} total</span>
          </div>
          {/* Search */}
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
          {filteredClients.map((client) => (
            <button
              key={client.id}
              onClick={() => handleSelectClient(client.id)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition ${
                selectedClientId === client.id ? 'bg-blue-50 border-l-4 border-[#003366]' : 'border-l-4 border-transparent'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm ${
                    selectedClientId === client.id ? 'bg-[#003366]' : 'bg-gray-400'
                  }`}>
                    {client.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{client.name}</p>
                    <p className="text-xs text-gray-500">{client.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">${(client.aum / 1000000).toFixed(2)}M</p>
                  <p className="text-xs text-gray-500">{client.accountType}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Client Details */}
      {selectedClient && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Client Details</h3>
            <button className="text-xs text-[#003366] hover:underline">Edit Profile</button>
          </div>
          <div className="p-4 space-y-4">
            {/* Avatar and Name */}
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-[#003366] rounded-full flex items-center justify-center text-white font-semibold text-lg">
                {selectedClient.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-lg">{selectedClient.name}</p>
                <p className="text-sm text-gray-500">{selectedClient.email}</p>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total AUM</p>
                <p className="font-bold text-gray-900 text-lg">${(selectedClient.aum / 1000000).toFixed(2)}M</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Account Type</p>
                <p className="font-bold text-gray-900 text-lg">{selectedClient.accountType}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Risk Profile</p>
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getRiskColor(selectedClient.riskProfile || '')}`}>
                  {selectedClient.riskProfile}
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Last Contact</p>
                <p className="font-medium text-gray-900">{selectedClient.lastContact}</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 pt-2">
              <button className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-lg transition">
                📧 Email
              </button>
              <button className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-lg transition">
                📞 Call
              </button>
              <button className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-lg transition">
                📅 Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
