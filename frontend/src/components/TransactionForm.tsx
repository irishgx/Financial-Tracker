import { useState, useEffect } from 'react'
import { X, Calendar, DollarSign, Tag, Building, FileText } from 'lucide-react'
import { api } from '../services/api'
import { listAccounts, appendTransactions } from '../services/accountsStore'
import toast from 'react-hot-toast'

interface Account {
  id: string
  name: string
  type: string
}

interface Category {
  id: string
  name: string
  color?: string
}

interface TransactionFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialData?: {
    amount?: number
    description?: string
    type?: 'income' | 'expense' | 'transfer'
    date?: string
  }
}

export function TransactionForm({ isOpen, onClose, onSuccess, initialData }: TransactionFormProps) {
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [formData, setFormData] = useState({
    accountId: '',
    categoryId: '',
    amount: '',
    description: '',
    merchant: '',
    date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    type: 'expense' as 'income' | 'expense' | 'transfer'
  })

  useEffect(() => {
    if (isOpen) {
      loadAccountsAndCategories()
      if (initialData) {
        setFormData(prev => ({
          ...prev,
          amount: initialData.amount?.toString() || '',
          description: initialData.description || '',
          type: initialData.type || 'expense',
          date: initialData.date || new Date().toISOString().split('T')[0]
        }))
      }
    }
  }, [isOpen, initialData])

  // Reload categories when transaction type changes
  useEffect(() => {
    if (isOpen) {
      const loadCategoriesForType = async () => {
        try {
          const { listCategories } = await import('../services/accountsStore')
          const storeCategories = listCategories()
          const filteredCategories = storeCategories.filter(cat => {
            if (formData.type === 'income') return cat.type === 'income'
            if (formData.type === 'expense') return cat.type === 'expense'
            return cat.type === 'transfer'
          })
          setCategories(filteredCategories.map(cat => ({
            id: cat.id,
            name: cat.name,
            color: cat.color
          })))
          // Clear category selection if it doesn't match the new type
          if (formData.categoryId) {
            const currentCategory = storeCategories.find(c => c.id === formData.categoryId)
            if (currentCategory && currentCategory.type !== formData.type) {
              setFormData(prev => ({ ...prev, categoryId: '' }))
            }
          }
        } catch (error) {
          console.error('Error loading categories:', error)
        }
      }
      loadCategoriesForType()
    }
  }, [formData.type, isOpen])

  const loadAccountsAndCategories = async () => {
    try {
      // Load accounts from localStorage store
      const { listAccounts, listCategories, ensureDefaultCategories } = await import('../services/accountsStore')
      ensureDefaultCategories() // Ensure defaults exist
      
      const storeAccounts = listAccounts()
      setAccounts(storeAccounts.map(a => ({
        id: a.id,
        name: a.name,
        type: a.account_type
      })))
      
      // Load categories from localStorage store
      const storeCategories = listCategories()
      // Filter categories by transaction type
      const filteredCategories = storeCategories.filter(cat => {
        if (formData.type === 'income') return cat.type === 'income'
        if (formData.type === 'expense') return cat.type === 'expense'
        return cat.type === 'transfer'
      })
      
      setCategories(filteredCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        color: cat.color
      })))
      
      // Set default account if available
      if (storeAccounts.length > 0 && !formData.accountId) {
        setFormData(prev => ({ ...prev, accountId: storeAccounts[0].id }))
      }
    } catch (error) {
      console.error('Error loading accounts and categories:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.accountId) {
      toast.error('Please select an account')
      return
    }
    
    if (!formData.amount || parseFloat(formData.amount) === 0) {
      toast.error('Please enter a valid amount')
      return
    }
    
    if (!formData.description.trim()) {
      toast.error('Please enter a description')
      return
    }

    setLoading(true)
    
    try {
      const amount = parseFloat(formData.amount)
      const finalAmount = formData.type === 'expense' ? -Math.abs(amount) : Math.abs(amount)
      
      // Save to localStorage store
      const result = appendTransactions([{
        account_id: formData.accountId,
        date: formData.date,
        description: formData.description.trim(),
        withdrawal: formData.type === 'expense' ? Math.abs(amount) : undefined,
        deposit: formData.type === 'income' ? amount : undefined,
        amount: finalAmount,
        type: formData.type,
        merchant: formData.merchant.trim() || undefined,
        category_id: formData.categoryId || undefined,
        import_source: 'manual'
      }])
      
      if (result.errors.length > 0) {
        console.warn('Transaction import warnings:', result.errors)
      }
      
      toast.success('Transaction added successfully!')
      onSuccess()
      onClose()
      
      // Reset form
      setFormData({
        accountId: '',
        categoryId: '',
        amount: '',
        description: '',
        merchant: '',
        date: new Date().toISOString().split('T')[0],
        type: 'expense'
      })
    } catch (error: any) {
      toast.error('Failed to add transaction')
      console.error('Error adding transaction:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const quickAmounts = [10, 25, 50, 100, 200, 500]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Add Transaction</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['expense', 'income', 'transfer'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleInputChange('type', type)}
                  className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                    formData.type === type
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                placeholder="0.00"
                className="input pl-10"
                required
              />
            </div>
            
            {/* Quick amount buttons */}
            <div className="mt-2 flex flex-wrap gap-2">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => handleInputChange('amount', amount.toString())}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  ${amount}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="What was this transaction for?"
                className="input pl-10"
                required
              />
            </div>
          </div>

          {/* Merchant */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Merchant/Store
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={formData.merchant}
                onChange={(e) => handleInputChange('merchant', e.target.value)}
                placeholder="e.g., Starbucks, Amazon, etc."
                className="input pl-10"
              />
            </div>
          </div>

          {/* Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.accountId}
              onChange={(e) => handleInputChange('accountId', e.target.value)}
              className="input"
              required
            >
              <option value="">Select an account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.type})
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={formData.categoryId}
                onChange={(e) => handleInputChange('categoryId', e.target.value)}
                className="input pl-10"
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Showing {formData.type} categories. Create more on the Categories page.
            </p>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="input pl-10"
                required
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
