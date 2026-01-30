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
}

interface Props {
  clientId: string
}

export default function HoldingsTable({ clientId }: Props) {
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Fetch holdings from /api/clients/:id/holdings
    const mockHoldings: Holding[] = [
      { id: '1', symbol: 'AAPL', name: 'Apple Inc', shares: 500, price: 195.5, value: 97750, allocation: 35 },
      { id: '2', symbol: 'MSFT', name: 'Microsoft Corp', shares: 300, price: 420.25, value: 126075, allocation: 25 },
      { id: '3', symbol: 'VTI', name: 'Vanguard Total Stock Market', shares: 1200, price: 245.0, value: 294000, allocation: 40 },
    ]
    setHoldings(mockHoldings)
    setLoading(false)
  }, [clientId])

  if (loading) {
    return <div className="text-gray-500">Loading holdings...</div>
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
