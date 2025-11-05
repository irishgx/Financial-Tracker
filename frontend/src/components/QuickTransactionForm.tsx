import { useState, useEffect } from 'react'
import { Plus, Coffee, ShoppingCart, Car, Home, Utensils, Edit3, X } from 'lucide-react'
import { api } from '../services/api'
import toast from 'react-hot-toast'

interface QuickTransactionFormProps {
  onSuccess: () => void
}

const quickExpenses = [
  { icon: Coffee, label: 'Coffee', amount: 5, description: 'Coffee', category: 'Food & Dining' },
  { icon: Utensils, label: 'Lunch', amount: 15, description: 'Lunch', category: 'Food & Dining' },
  { icon: ShoppingCart, label: 'Groceries', amount: 50, description: 'Groceries', category: 'Shopping' },
  { icon: Car, label: 'Gas', amount: 40, description: 'Gas', category: 'Transportation' },
  { icon: Home, label: 'Utilities', amount: 100, description: 'Utilities', category: 'Bills' },
]

const quickAmounts = [10, 25, 50, 100, 200]

export function QuickTransactionForm({ onSuccess }: QuickTransactionFormProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [showCustomAmount, setShowCustomAmount] = useState(false)
  const [customAmount, setCustomAmount] = useState('')
  const [customDescription, setCustomDescription] = useState('')
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense')
  const [recentCategories, setRecentCategories] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    loadRecentCategories()
  }, [])

  const loadRecentCategories = async () => {
    try {
      const response = await api.get('/categories')
      const categories = response.data.categories || []
      // Get top 5 most used categories (or all if less than 5)
      setRecentCategories(categories.slice(0, 5))
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const handleQuickExpense = async (expense: typeof quickExpenses[0]) => {
    setLoading(expense.label)
    
    try {
      const accountsResponse = await api.get('/accounts')
      const accounts = accountsResponse.data.accounts || []
      
      if (accounts.length === 0) {
        toast.error('Please create an account first')
        return
      }

      // Find category if available
      const categoriesResponse = await api.get('/categories')
      const categories = categoriesResponse.data.categories || []
      const category = categories.find((c: any) => c.name === expense.category)

      await api.post('/transactions', {
        accountId: accounts[0].id,
        categoryId: category?.id,
        amount: -expense.amount, // Negative for expense
        description: expense.description,
        date: new Date().toISOString().split('T')[0],
        type: 'expense'
      })
      
      toast.success(`${expense.label} added successfully!`)
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add transaction')
      console.error('Error adding quick transaction:', error)
    } finally {
      setLoading(null)
    }
  }

  const handleQuickAmount = async (amount: number) => {
    setLoading(`$${amount}`)
    
    try {
      const accountsResponse = await api.get('/accounts')
      const accounts = accountsResponse.data.accounts || []
      
      if (accounts.length === 0) {
        toast.error('Please create an account first')
        return
      }

      const finalAmount = transactionType === 'expense' ? -amount : amount

      await api.post('/transactions', {
        accountId: accounts[0].id,
        amount: finalAmount,
        description: customDescription || `${transactionType === 'expense' ? 'Expense' : 'Income'}`,
        date: new Date().toISOString().split('T')[0],
        type: transactionType
      })
      
      toast.success(`$${amount} ${transactionType} added successfully!`)
      setCustomDescription('')
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add transaction')
      console.error('Error adding quick transaction:', error)
    } finally {
      setLoading(null)
    }
  }

  const handleCustomAmount = async () => {
    const amount = parseFloat(customAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setLoading('custom')
    
    try {
      const accountsResponse = await api.get('/accounts')
      const accounts = accountsResponse.data.accounts || []
      
      if (accounts.length === 0) {
        toast.error('Please create an account first')
        return
      }

      const finalAmount = transactionType === 'expense' ? -amount : amount

      await api.post('/transactions', {
        accountId: accounts[0].id,
        amount: finalAmount,
        description: customDescription || `${transactionType === 'expense' ? 'Expense' : 'Income'}`,
        date: new Date().toISOString().split('T')[0],
        type: transactionType
      })
      
      toast.success(`Transaction added successfully!`)
      setCustomAmount('')
      setCustomDescription('')
      setShowCustomAmount(false)
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add transaction')
      console.error('Error adding custom transaction:', error)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Quick Add Transaction</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTransactionType('expense')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              transactionType === 'expense'
                ? 'bg-red-100 text-red-700 font-medium'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Expense
          </button>
          <button
            onClick={() => setTransactionType('income')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              transactionType === 'income'
                ? 'bg-green-100 text-green-700 font-medium'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Income
          </button>
        </div>
      </div>

      {/* Quick Expense Categories */}
      {transactionType === 'expense' && (
        <>
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Common Expenses</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {quickExpenses.map((expense) => {
                const Icon = expense.icon
                const isLoading = loading === expense.label
                
                return (
                  <button
                    key={expense.label}
                    onClick={() => handleQuickExpense(expense)}
                    disabled={isLoading}
                    className="relative flex flex-col items-center p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Icon className="h-6 w-6 text-gray-600 mb-2" />
                    <span className="text-sm font-medium text-gray-900">{expense.label}</span>
                    <span className="text-xs text-gray-500">${expense.amount}</span>
                    {isLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-600 border-t-transparent"></div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quick Amounts */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Quick Amounts</p>
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map((amount) => {
                const isLoading = loading === `$${amount}`
                return (
                  <button
                    key={amount}
                    onClick={() => handleQuickAmount(amount)}
                    disabled={isLoading}
                    className="relative px-4 py-2 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-sm font-medium text-gray-900">${amount}</span>
                    {isLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary-600 border-t-transparent"></div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Quick Income Amounts */}
      {transactionType === 'income' && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Quick Income Amounts</p>
          <div className="flex flex-wrap gap-2">
            {quickAmounts.map((amount) => {
              const isLoading = loading === `$${amount}`
              return (
                <button
                  key={amount}
                  onClick={() => handleQuickAmount(amount)}
                  disabled={isLoading}
                  className="relative px-4 py-2 rounded-lg border border-green-200 hover:border-green-300 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-sm font-medium text-green-700">+${amount}</span>
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-green-600 border-t-transparent"></div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Custom Amount Input */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        {!showCustomAmount ? (
          <button
            onClick={() => setShowCustomAmount(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-dashed border-gray-300 hover:border-primary-300 hover:bg-primary-50 transition-colors text-sm font-medium text-gray-700"
          >
            <Edit3 className="h-4 w-4" />
            Add Custom Amount
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Custom Transaction</p>
              <button
                onClick={() => {
                  setShowCustomAmount(false)
                  setCustomAmount('')
                  setCustomDescription('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Amount"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <button
                onClick={handleCustomAmount}
                disabled={loading === 'custom' || !customAmount}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading === 'custom' ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
