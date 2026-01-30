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
  change?: number
}

interface Props {
  clientId: string
}

export default function HoldingsTable({ clientId }: Props) {
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'value' | 'allocation' | 'symbol'>('value')

  useEffect(() => {
    const fetchHoldings = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const response = await axios.get(`http://localhost:3000/api/clients/${clientId}/holdings`)
        if (response.data.success) {
          // Add mock change data for visual interest
          const holdingsWithChange = response.data.data.map((h: Holding, i: number) => ({
            ...h,
            change: [1.2, -0.8, 2.3, -1.5, 0.5, 1.8, -0.3, 0.9][i % 8]
          }))
          setHoldings(holdingsWithChange)
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

  const sortedHoldings = [...holdings].sort((a, b) => {
    if (sortBy === 'value') return b.value - a.value
    if (sortBy === 'allocation') return b.allocation - a.allocation
    return a.symbol.localeCompare(b.symbol)
  })

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-[#003366] rounded-full mx-auto mb-3"></div>
        <p className="text-gray-500">Loading portfolio...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6 text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-red-600 font-medium">{error}</p>
      </div>
    )
  }

  if (holdings.length === 0) {
    return <div className="text-gray-500 p-4">No holdings found for this client</div>
  }

  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0)
  const todayChange = holdings.reduce((sum, h) => sum + (h.change || 0) * h.value / 100, 0)
  const todayChangePct = (todayChange / totalValue) * 100

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Portfolio Holdings</h2>
            <p className="text-sm text-gray-500">{holdings.length} positions</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">${(totalValue / 1000000).toFixed(2)}M</p>
            <p className={`text-sm font-medium ${todayChangePct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {todayChangePct >= 0 ? '↑' : '↓'} {Math.abs(todayChangePct).toFixed(2)}% today
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-lg p-2 text-center">
            <p className="text-xs text-gray-500">Equities</p>
            <p className="font-semibold text-gray-900">{holdings.filter(h => !h.symbol.includes('BND') && !h.symbol.includes('CASH')).length}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-2 text-center">
            <p className="text-xs text-gray-500">Fixed Income</p>
            <p className="font-semibold text-gray-900">{holdings.filter(h => h.symbol.includes('BND')).length}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-2 text-center">
            <p className="text-xs text-gray-500">Cash</p>
            <p className="font-semibold text-gray-900">{holdings.filter(h => h.symbol.includes('CASH')).length || 1}</p>
          </div>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <span className="text-xs text-gray-500">Sort by:</span>
        <div className="flex gap-1">
          {(['value', 'allocation', 'symbol'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-2 py-1 text-xs rounded ${sortBy === s ? 'bg-[#003366] text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Holdings Table */}
      <div className="overflow-x-auto max-h-96">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Symbol</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Shares</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Price</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Change</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Value</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Weight</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedHoldings.map((holding) => (
              <tr key={holding.id} className="hover:bg-blue-50/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-xs font-bold text-gray-600">
                      {holding.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{holding.symbol}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[150px]">{holding.name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-gray-700 font-medium">{holding.shares.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-gray-700">${holding.price.toFixed(2)}</td>
                <td className={`px-4 py-3 text-right font-medium ${(holding.change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(holding.change || 0) >= 0 ? '+' : ''}{(holding.change || 0).toFixed(2)}%
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">
                  ${(holding.value / 1000).toFixed(0)}K
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#003366] rounded-full" 
                        style={{ width: `${Math.min(holding.allocation, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-gray-700 w-12 text-right">{holding.allocation}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
        <span>Data as of {new Date().toLocaleTimeString()}</span>
        <button className="text-[#003366] hover:underline font-medium">View Full Report →</button>
      </div>
    </div>
  )
}
