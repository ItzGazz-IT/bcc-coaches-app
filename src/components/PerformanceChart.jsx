import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function PerformanceChart({ data, title, dataKey, color = "#1E5EFF" }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400 dark:text-gray-600">No data available</p>
        </div>
      </div>
    )
  }

  // Calculate trend
  const firstValue = data[0]?.[dataKey]
  const lastValue = data[data.length - 1]?.[dataKey]
  const change = lastValue - firstValue
  const percentChange = firstValue !== 0 ? ((change / firstValue) * 100).toFixed(1) : 0

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{title}</h3>
        <div className="flex items-center gap-2">
          {change > 0 && (
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full">
              <TrendingUp size={16} />
              <span className="text-sm font-bold">+{percentChange}%</span>
            </div>
          )}
          {change < 0 && (
            <div className="flex items-center gap-1 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-full">
              <TrendingDown size={16} />
              <span className="text-sm font-bold">{percentChange}%</span>
            </div>
          )}
          {change === 0 && (
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-full">
              <Minus size={16} />
              <span className="text-sm font-bold">0%</span>
            </div>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-800" />
          <XAxis 
            dataKey="date" 
            stroke="#9ca3af" 
            className="dark:stroke-gray-600"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#9ca3af" 
            className="dark:stroke-gray-600"
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px'
            }}
            className="dark:bg-gray-800 dark:border-gray-700"
          />
          <Line 
            type="monotone" 
            dataKey={dataKey} 
            stroke={color} 
            strokeWidth={3}
            dot={{ fill: color, r: 5 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
