import { TrendingUp, TrendingDown, DollarSign, Calendar, Target, AlertCircle } from 'lucide-react'

interface MetricData {
  current: number
  previous: number
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  format: 'currency' | 'percentage' | 'number'
}

interface EnhancedMetricsProps {
  metrics: MetricData[]
  period: 'week' | 'month' | 'quarter'
}

export function EnhancedMetrics({ metrics, period }: EnhancedMetricsProps) {
  const formatValue = (value: number, format: MetricData['format']) => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value)
      case 'percentage':
        return `${value.toFixed(1)}%`
      case 'number':
        return value.toLocaleString()
      default:
        return value.toString()
    }
  }

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return { percentage: 0, isPositive: current >= 0 }
    const percentage = ((current - previous) / Math.abs(previous)) * 100
    return { percentage: Math.abs(percentage), isPositive: current >= previous }
  }

  const getPeriodLabel = () => {
    switch (period) {
      case 'week': return 'vs Last Week'
      case 'month': return 'vs Last Month'
      case 'quarter': return 'vs Last Quarter'
      default: return 'vs Previous Period'
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
      {metrics.map((metric, index) => {
        const change = calculateChange(metric.current, metric.previous)
        const Icon = metric.icon
        
        return (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className={`p-1.5 sm:p-2 rounded-lg ${metric.color}`}>
                <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <div className="flex items-center gap-1 justify-end">
                  {change.isPositive ? (
                    <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600" />
                  )}
                  <span className={`text-xs sm:text-sm font-medium ${
                    change.isPositive ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {change.percentage.toFixed(1)}%
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{getPeriodLabel()}</p>
              </div>
            </div>
            
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1 truncate">{metric.label}</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
                {formatValue(metric.current, metric.format)}
              </p>
              {metric.previous !== 0 && (
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Previous: {formatValue(metric.previous, metric.format)}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Helper function to generate metrics from transaction data
export function generateMetrics(
  currentPeriodData: {
    income: number
    expenses: number
    transactions: number
    categories: number
  },
  previousPeriodData: {
    income: number
    expenses: number
    transactions: number
    categories: number
  },
  period: 'week' | 'month' | 'quarter'
): MetricData[] {
  return [
    {
      current: currentPeriodData.income,
      previous: previousPeriodData.income,
      label: 'Total Income',
      icon: DollarSign,
      color: 'bg-green-500',
      format: 'currency'
    },
    {
      current: currentPeriodData.expenses,
      previous: previousPeriodData.expenses,
      label: 'Total Expenses',
      icon: AlertCircle,
      color: 'bg-red-500',
      format: 'currency'
    },
    {
      current: currentPeriodData.income - currentPeriodData.expenses,
      previous: previousPeriodData.income - previousPeriodData.expenses,
      label: 'Net Worth',
      icon: Target,
      color: 'bg-blue-500',
      format: 'currency'
    },
    {
      current: currentPeriodData.transactions,
      previous: previousPeriodData.transactions,
      label: 'Transactions',
      icon: Calendar,
      color: 'bg-purple-500',
      format: 'number'
    }
  ]
}
