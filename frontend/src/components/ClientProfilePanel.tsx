import { useEffect, useState } from 'react'
import axios from 'axios'

interface Client {
  id: string
  name: string
  email: string
  aum: number
}

interface Props {
  onSelectClient: (clientId: string) => void
  selectedClientId: string | null
}

export default function ClientProfilePanel({ onSelectClient, selectedClientId }: Props) {
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Fetch clients from /api/clients
    const mockClients: Client[] = [
      { id: '1', name: 'Margaret Chen', email: 'margaret@example.com', aum: 2500000 },
      { id: '2', name: 'James Morrison', email: 'james@example.com', aum: 1800000 },
      { id: '3', name: 'Sarah Williams', email: 'sarah@example.com', aum: 3200000 },
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

  if (loading) {
    return <div className="text-gray-500">Loading clients...</div>
  }

  return (
    <div className="space-y-4">
      {/* Client List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Clients</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {clients.map((client) => (
            <button
              key={client.id}
              onClick={() => handleSelectClient(client.id)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition ${
                selectedClientId === client.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
              }`}
            >
              <p className="font-medium text-gray-900">{client.name}</p>
              <p className="text-sm text-gray-600">${(client.aum / 1000000).toFixed(1)}M AUM</p>
            </button>
          ))}
        </div>
      </div>

      {/* Client Details */}
      {selectedClient && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Profile</h3>
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-gray-600">Name</p>
              <p className="font-medium text-gray-900">{selectedClient.name}</p>
            </div>
            <div>
              <p className="text-gray-600">Email</p>
              <p className="font-medium text-gray-900">{selectedClient.email}</p>
            </div>
            <div>
              <p className="text-gray-600">AUM</p>
              <p className="font-medium text-gray-900">${(selectedClient.aum / 1000000).toFixed(2)}M</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
