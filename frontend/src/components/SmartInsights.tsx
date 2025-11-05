import { useState } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Lightbulb, 
  Target,
  DollarSign,
  Calendar
} from 'lucide-react'

interface Insight {
  id: string
  type: 'positive' | 'warning' | 'info' | 'achievement'
  title: string
  description: string
  value?: string
  icon: React.ComponentType<{ className?: string }>
  action?: {
    label: string
    onClick: () => void
  }
}

interface SmartInsightsProps {
  insights: Insight[]
  onActionClick?: (actionId: string) => void
}

export function SmartInsights({ insights, onActionClick }: SmartInsightsProps) {
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set())

  const handleDismiss = (insightId: string) => {
    setDismissedInsights(prev => new Set([...prev, insightId]))
  }

  const getInsightStyles = (type: Insight['type']) => {
    switch (type) {
      case 'positive':
        return {
          container: 'bg-green-50 border-green-200',
          icon: 'text-green-600',
          title: 'text-green-900',
          description: 'text-green-700'
        }
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-600',
          title: 'text-yellow-900',
          description: 'text-yellow-700'
        }
      case 'info':
        return {
          container: 'bg-blue-50 border-blue-200',
          icon: 'text-blue-600',
          title: 'text-blue-900',
          description: 'text-blue-700'
        }
      case 'achievement':
        return {
          container: 'bg-purple-50 border-purple-200',
          icon: 'text-purple-600',
          title: 'text-purple-900',
          description: 'text-purple-700'
        }
      default:
        return {
          container: 'bg-gray-50 border-gray-200',
          icon: 'text-gray-600',
          title: 'text-gray-900',
          description: 'text-gray-700'
        }
    }
  }

  const visibleInsights = insights.filter(insight => !dismissedInsights.has(insight.id))

  if (visibleInsights.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <div className="text-center">
          <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-green-500 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">All Good!</h3>
          <p className="text-sm sm:text-base text-gray-600 px-2">
            No insights or recommendations at this time. Keep up the great financial management!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
        <h3 className="text-base sm:text-lg font-medium text-gray-900">Smart Insights</h3>
      </div>
      
      {visibleInsights.map((insight) => {
        const styles = getInsightStyles(insight.type)
        const Icon = insight.icon
        
        return (
          <div 
            key={insight.id}
            className={`rounded-lg border p-3 sm:p-4 ${styles.container}`}
          >
            <div className="flex items-start gap-2 sm:gap-3">
              <Icon className={`h-4 w-4 sm:h-5 sm:w-5 mt-0.5 flex-shrink-0 ${styles.icon}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className={`text-sm sm:text-base font-medium ${styles.title} break-words`}>
                    {insight.title}
                  </h4>
                  <button
                    onClick={() => handleDismiss(insight.id)}
                    className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 text-lg sm:text-xl leading-none touch-manipulation min-w-[24px] min-h-[24px] flex items-center justify-center"
                    aria-label="Dismiss insight"
                  >
                    ×
                  </button>
                </div>
                <p className={`text-xs sm:text-sm mt-1 ${styles.description} break-words`}>
                  {insight.description}
                </p>
                {insight.value && (
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${styles.container}`}>
                      {insight.value}
                    </span>
                  </div>
                )}
                {insight.action && (
                  <button
                    onClick={() => {
                      insight.action?.onClick()
                      onActionClick?.(insight.id)
                    }}
                    className="mt-2 sm:mt-3 text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors touch-manipulation"
                  >
                    {insight.action.label} →
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Helper function to generate insights based on financial data
export function generateInsights(
  totalIncome: number,
  totalExpenses: number,
  monthlyBudget: number,
  categorySpending: Array<{ name: string; amount: number }>,
  recentTransactions: Array<{ amount: number; type: string }>
): Insight[] {
  const insights: Insight[] = []
  const netWorth = totalIncome - totalExpenses
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0

  // Budget insights
  if (monthlyBudget > 0) {
    const budgetUsage = (totalExpenses / monthlyBudget) * 100
    if (budgetUsage > 90) {
      insights.push({
        id: 'budget-warning',
        type: 'warning',
        title: 'Budget Alert',
        description: `You've used ${budgetUsage.toFixed(0)}% of your monthly budget. Consider reducing spending.`,
        value: `${budgetUsage.toFixed(0)}% used`,
        icon: AlertTriangle
      })
    } else if (budgetUsage < 50) {
      insights.push({
        id: 'budget-positive',
        type: 'positive',
        title: 'Great Budget Management',
        description: `You're only using ${budgetUsage.toFixed(0)}% of your monthly budget. Keep it up!`,
        value: `${budgetUsage.toFixed(0)}% used`,
        icon: CheckCircle
      })
    }
  }

  // Savings rate insights
  if (savingsRate > 20) {
    insights.push({
      id: 'savings-excellent',
      type: 'achievement',
      title: 'Excellent Savings Rate',
      description: `You're saving ${savingsRate.toFixed(1)}% of your income. This is above the recommended 20%!`,
      value: `${savingsRate.toFixed(1)}% savings rate`,
      icon: Target
    })
  } else if (savingsRate < 10 && totalIncome > 0) {
    insights.push({
      id: 'savings-low',
      type: 'warning',
      title: 'Low Savings Rate',
      description: `Your savings rate is ${savingsRate.toFixed(1)}%. Consider increasing your savings to reach financial goals.`,
      value: `${savingsRate.toFixed(1)}% savings rate`,
      icon: TrendingDown
    })
  }

  // Spending pattern insights
  const topCategory = categorySpending.reduce((max, category) => 
    category.amount > max.amount ? category : max, 
    { name: 'Unknown', amount: 0 }
  )
  
  if (topCategory.amount > totalExpenses * 0.4) {
    insights.push({
      id: 'category-spending',
      type: 'info',
      title: 'Top Spending Category',
      description: `${topCategory.name} accounts for ${((topCategory.amount / totalExpenses) * 100).toFixed(0)}% of your spending.`,
      value: `${((topCategory.amount / totalExpenses) * 100).toFixed(0)}%`,
      icon: DollarSign
    })
  }

  // Net worth insights
  if (netWorth > 0) {
    insights.push({
      id: 'positive-net-worth',
      type: 'positive',
      title: 'Positive Net Worth',
      description: `Your net worth is positive! You're building wealth effectively.`,
      value: `+$${netWorth.toFixed(0)}`,
      icon: TrendingUp
    })
  }

  return insights
}
