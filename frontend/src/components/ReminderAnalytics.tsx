import { useState } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Target
} from 'lucide-react'

interface ReminderAnalyticsProps {
  reminders: Array<{
    id: string
    title: string
    amount?: number
    dueDate: string
    category: string
    priority: 'high' | 'medium' | 'low'
    isRecurring: boolean
    status: 'upcoming' | 'overdue' | 'paid'
  }>
}

export function ReminderAnalytics({ reminders }: ReminderAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month')

  const calculateAnalytics = () => {
    const now = new Date()
    const upcoming = reminders.filter(r => new Date(r.dueDate) > now && r.status === 'upcoming')
    const overdue = reminders.filter(r => new Date(r.dueDate) < now && r.status === 'upcoming')
    const paid = reminders.filter(r => r.status === 'paid')

    const totalAmount = reminders.reduce((sum, r) => sum + (r.amount || 0), 0)
    const upcomingAmount = upcoming.reduce((sum, r) => sum + (r.amount || 0), 0)
    const overdueAmount = overdue.reduce((sum, r) => sum + (r.amount || 0), 0)

    const categoryBreakdown = reminders.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const priorityBreakdown = reminders.reduce((acc, r) => {
      acc[r.priority] = (acc[r.priority] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      upcoming,
      overdue,
      paid,
      totalAmount,
      upcomingAmount,
      overdueAmount,
      categoryBreakdown,
      priorityBreakdown
    }
  }

  const analytics = calculateAnalytics()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100'
      case 'medium':
        return 'text-yellow-600 bg-yellow-100'
      case 'low':
        return 'text-green-600 bg-green-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'bills':
        return '🏠'
      case 'subscriptions':
        return '📱'
      case 'savings':
        return '💰'
      case 'investments':
        return '📈'
      case 'insurance':
        return '🛡️'
      case 'utilities':
        return '⚡'
      default:
        return '📝'
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Time Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <h3 className="text-base sm:text-lg font-medium text-gray-900">Reminder Analytics</h3>
        <div className="flex items-center gap-2">
          {(['week', 'month', 'quarter'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-full transition-colors touch-manipulation ${
                timeRange === range
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-500 hover:text-gray-700 bg-gray-100 sm:bg-transparent'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2 sm:mb-0">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500">Upcoming</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5 sm:mt-1">{analytics.upcoming.length}</p>
            </div>
            <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0 ml-2" />
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            {formatCurrency(analytics.upcomingAmount)}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2 sm:mb-0">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500">Overdue</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600 mt-0.5 sm:mt-1">{analytics.overdue.length}</p>
            </div>
            <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-600 flex-shrink-0 ml-2" />
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            {formatCurrency(analytics.overdueAmount)}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2 sm:mb-0">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500">Paid</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600 mt-0.5 sm:mt-1">{analytics.paid.length}</p>
            </div>
            <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0 ml-2" />
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            {formatCurrency(analytics.paid.reduce((sum, r) => sum + (r.amount || 0), 0))}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2 sm:mb-0">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500">Total Value</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-0.5 sm:mt-1 break-words">{formatCurrency(analytics.totalAmount)}</p>
            </div>
            <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-gray-600 flex-shrink-0 ml-2" />
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            All reminders
          </p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Category Breakdown</h4>
        <div className="space-y-2 sm:space-y-3">
          {Object.entries(analytics.categoryBreakdown).map(([category, count]) => (
            <div key={category} className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink-0">
                <span className="text-xl sm:text-2xl">{getCategoryIcon(category)}</span>
                <span className="font-medium text-gray-900 capitalize text-sm sm:text-base truncate">{category}</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                <div className="w-20 sm:w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full" 
                    style={{ width: `${(count / reminders.length) * 100}%` }}
                  ></div>
                </div>
                <span className="text-xs sm:text-sm font-medium text-gray-900 w-6 sm:w-8 text-right">
                  {count}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Priority Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Priority Breakdown</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {Object.entries(analytics.priorityBreakdown).map(([priority, count]) => (
            <div key={priority} className="text-center">
              <div className={`inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getPriorityColor(priority)}`}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">{count}</p>
              <p className="text-xs sm:text-sm text-gray-500">reminders</p>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4 sm:p-6">
        <div className="flex items-start gap-2 sm:gap-3">
          <Target className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 mt-0.5 sm:mt-1 flex-shrink-0" />
          <div className="min-w-0">
            <h4 className="text-base sm:text-lg font-medium text-blue-900">Smart Insights</h4>
            <div className="mt-2 space-y-2 text-xs sm:text-sm text-blue-800">
              {analytics.overdue.length > 0 && (
                <p className="break-words">⚠️ You have {analytics.overdue.length} overdue reminders. Consider setting up auto-pay for recurring bills.</p>
              )}
              {analytics.upcoming.length > 5 && (
                <p className="break-words">📅 You have {analytics.upcoming.length} upcoming reminders this month. Consider scheduling payments in advance.</p>
              )}
              {analytics.priorityBreakdown.high > 3 && (
                <p className="break-words">🔥 You have {analytics.priorityBreakdown.high} high-priority reminders. Focus on these first.</p>
              )}
              {analytics.paid.length > 0 && (
                <p className="break-words">✅ Great job! You've paid {analytics.paid.length} reminders on time.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
