import { useEffect, useState } from 'react'
import axios from 'axios'

interface Holding {
  id: string
  symbol: string
  name: string
  shares: number
  price: number
  value: number
  allocation: number
  assetClass?: string
  sector?: string
}

interface Props {
  clientId: string
}

export default function HoldingsTable({ clientId }: Props) {
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchHoldings = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const response = await axios.get(`http://localhost:3000/api/clients/${clientId}/holdings`)
        if (response.data.success) {
          setHoldings(response.data.data)
        } else {
          setError('Failed to load holdings')
        }
      } catch (err: any) {
        console.error('Error fetching holdings:', err)
        setError(err.response?.data?.error || 'Failed to connect to server')
      } finally {
        setLoading(false)
      }
    }

    fetchHoldings()
  }, [clientId])

  if (loading) {
    return <div className="text-gray-500">Loading holdings...</div>
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>
  }

  if (holdings.length === 0) {
    return <div className="text-gray-500 p-4">No holdings found for this client</div>
  }

  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0)

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Holdings</h2>
        <p className="text-sm text-gray-600 mt-1">Total Value: ${(totalValue / 1000000).toFixed(2)}M</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Symbol</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Shares</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Price</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Value</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {holdings.map((holding) => (
              <tr key={holding.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{holding.symbol}</p>
                    <p className="text-xs text-gray-600">{holding.name}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-gray-900">{holding.shares.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-gray-900">${holding.price.toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">
                  ${(holding.value / 1000).toFixed(0)}K
                </td>
                <td className="px-4 py-3 text-right text-gray-900">{holding.allocation}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
