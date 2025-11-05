import { useState, useEffect, useRef } from 'react'
import { Plus, Search, Filter, Download, Cog, Eye, ChevronDown, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { TransactionForm } from '../components/TransactionForm'
import { TransactionFilters } from '../components/TransactionFilters'
import { BulkOperations } from '../components/BulkOperations'
import { EnhancedTransactionTable } from '../components/EnhancedTransactionTable'
import { ExportTransactions } from '../components/ExportTransactions'
import { UploadModal } from '../components/UploadModal'
import { api } from '../services/api'
import { listTransactions as getStoreTransactions, appendTransactions, loadStore, saveStore, listAccounts } from '../services/accountsStore'
import toast from 'react-hot-toast'

interface Transaction {
  id: string
  accountId: string
  accountName: string
  categoryId?: string
  categoryName?: string
  categoryColor?: string
  amount: number
  description: string
  merchant?: string
  date: string
  type: 'income' | 'expense' | 'transfer'
  status: string
  createdAt: string
  updatedAt: string
}

export function TransactionsPage() {
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string; color?: string }>>([])
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string; type: string }>>([])
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadTransactions()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      
      // Load from localStorage store
      const { listTransactions, listAccounts } = await import('../services/accountsStore')
      const storeTransactions = listTransactions()
      const storeAccounts = listAccounts()
      
      // Load categories from localStorage (primary source)
      const { listCategories: listStoreCategories } = await import('../services/accountsStore')
      let categoriesData: any[] = listStoreCategories()
      
      // Also try to load from API and merge (for backward compatibility)
      try {
        const categoriesResponse = await api.get('/categories')
        const apiCategories = categoriesResponse.data.categories || []
        
        // Merge: localStorage categories take precedence, then add API categories not in localStorage
        const localCategoryIds = new Set(categoriesData.map(c => c.id))
        const additionalApiCategories = apiCategories.filter((c: any) => !localCategoryIds.has(c.id))
        categoriesData = [...categoriesData, ...additionalApiCategories]
      } catch (error) {
        console.warn('Could not load categories from API, using localStorage only')
      }
      
      // Map store transactions to page format
      const transactionsData = storeTransactions.map(tx => {
        const account = storeAccounts.find(a => a.id === tx.account_id)
        return {
          id: tx.id,
          accountId: tx.account_id,
          accountName: account?.name || 'Unknown Account',
          categoryId: tx.category_id,
          categoryName: undefined, // Will be populated if category exists
          categoryColor: undefined,
          amount: tx.amount,
          description: tx.description,
          merchant: tx.merchant,
          date: tx.date,
          type: tx.type,
          status: 'confirmed',
          createdAt: tx.created_at,
          updatedAt: tx.created_at
        }
      })
      
      // Enrich with category names and colors
      transactionsData.forEach(tx => {
        if (tx.categoryId) {
          const category = categoriesData.find(c => c.id === tx.categoryId)
          if (category) {
            tx.categoryName = category.name
            tx.categoryColor = category.color || '#6B7280' // Default gray if no color
          }
        }
      })
      
      // Ensure categories have all required fields for the table
      const enrichedCategories = categoriesData.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        color: cat.color || '#6B7280',
        type: cat.type || 'expense', // Default to expense if missing
        ...cat
      }))
      
      setTransactions(transactionsData)
      setFilteredTransactions(transactionsData)
      setCategories(enrichedCategories)
      setAccounts(storeAccounts.map(a => ({
        id: a.id,
        name: a.name,
        type: a.account_type
      })))
    } catch (error) {
      console.error('Error loading transactions:', error)
      toast.error('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }

  const handleTransactionAdded = () => {
    loadTransactions()
    setShowTransactionForm(false)
  }

  const handleDeleteTransaction = (transactionId: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return
    }

    try {
      // Delete from localStorage store
      const store = loadStore()
      store.transactions = store.transactions.filter(t => t.id !== transactionId)
      saveStore(store)
      
      toast.success('Transaction deleted successfully')
      loadTransactions()
    } catch (error) {
      toast.error('Failed to delete transaction')
      console.error('Error deleting transaction:', error)
    }
  }

  const handleBulkDelete = () => {
    if (selectedTransactions.size === 0) return

    if (!confirm(`Are you sure you want to delete ${selectedTransactions.size} transaction(s)?`)) {
      return
    }

    try {
      // Delete from localStorage store
      const store = loadStore()
      const idsToDelete = Array.from(selectedTransactions)
      store.transactions = store.transactions.filter(t => !idsToDelete.includes(t.id))
      saveStore(store)
      
      toast.success(`${selectedTransactions.size} transaction(s) deleted successfully`)
      setSelectedTransactions(new Set())
      loadTransactions()
    } catch (error) {
      toast.error('Failed to delete some transactions')
      console.error('Error deleting transactions:', error)
    }
  }

  const handleBulkEdit = () => {
    // In a real app, you'd open a bulk edit modal
    toast.info('Bulk edit feature coming soon!')
  }

  const handleBulkExport = () => {
    setShowExport(true)
  }

  const handleBulkCategorize = () => {
    // In a real app, you'd open a category selection modal
    toast.info('Bulk categorize feature coming soon!')
  }

  const handleBulkChangeAccount = () => {
    // In a real app, you'd open an account selection modal
    toast.info('Bulk account change feature coming soon!')
  }

  const handleDuplicateTransaction = (transaction: Transaction) => {
    try {
      // Find the original transaction in store to get account_id
      const allTransactions = getStoreTransactions()
      const originalTx = allTransactions.find(t => t.id === transaction.id)
      
      if (!originalTx) {
        toast.error('Transaction not found')
        return
      }
      
      const result = appendTransactions([{
        account_id: originalTx.account_id,
        date: new Date().toISOString().split('T')[0],
        description: `${transaction.description} (Copy)`,
        withdrawal: transaction.type === 'expense' ? Math.abs(transaction.amount) : undefined,
        deposit: transaction.type === 'income' ? transaction.amount : undefined,
        amount: transaction.amount,
        type: transaction.type,
        merchant: transaction.merchant,
        category_id: transaction.categoryId,
        import_source: 'manual'
      }])
      
      if (result.errors.length > 0) {
        console.warn('Duplicate warnings:', result.errors)
      }
      
      toast.success('Transaction duplicated successfully')
      loadTransactions()
    } catch (error) {
      toast.error('Failed to duplicate transaction')
      console.error('Error duplicating transaction:', error)
    }
  }

  const handleFiltersChange = (filters: any) => {
    let filtered = [...transactions]

    // Apply search term
    if (filters.searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        (t.merchant && t.merchant.toLowerCase().includes(filters.searchTerm.toLowerCase()))
      )
    }

    // Apply date range
    if (filters.dateRange.start || filters.dateRange.end) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.date)
        const startDate = filters.dateRange.start ? new Date(filters.dateRange.start) : null
        const endDate = filters.dateRange.end ? new Date(filters.dateRange.end) : null

        if (startDate && transactionDate < startDate) return false
        if (endDate && transactionDate > endDate) return false
        return true
      })
    }

    // Apply amount range
    if (filters.amountRange.min || filters.amountRange.max) {
      filtered = filtered.filter(t => {
        const amount = Math.abs(t.amount)
        if (filters.amountRange.min && amount < parseFloat(filters.amountRange.min)) return false
        if (filters.amountRange.max && amount > parseFloat(filters.amountRange.max)) return false
        return true
      })
    }

    // Apply category filter
    if (filters.categories.length > 0) {
      filtered = filtered.filter(t => 
        t.categoryId && filters.categories.includes(t.categoryId)
      )
    }

    // Apply account filter
    if (filters.accounts.length > 0) {
      filtered = filtered.filter(t => filters.accounts.includes(t.accountId))
    }

    // Apply type filter
    if (filters.types.length > 0) {
      filtered = filtered.filter(t => filters.types.includes(t.type))
    }

    setFilteredTransactions(filtered)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="px-1 sm:px-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Transactions</h1>
            {filteredTransactions.length > 0 && (
              <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs sm:text-sm font-medium rounded-full">
                {filteredTransactions.length}
              </span>
            )}
          </div>
          <p className="mt-1.5 sm:mt-2 text-sm sm:text-base text-gray-600">
            Manage and track your financial transactions
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowExport(true)}
            className="btn btn-secondary flex items-center justify-center text-sm sm:text-base px-3 sm:px-4 py-2 touch-manipulation hover:shadow-sm transition-all duration-200"
          >
            <Download className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
            <span className="hidden sm:inline">Export</span>
          </button>
          
          {/* Split Dropdown Button */}
          <div className="relative inline-flex" ref={dropdownRef}>
            <button
              onClick={() => setShowTransactionForm(true)}
              className="btn btn-primary flex items-center justify-center text-sm sm:text-base px-3 sm:px-4 py-2 touch-manipulation hover:shadow-md transition-all duration-200 rounded-r-none"
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
              <span>Add Transaction</span>
            </button>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="btn btn-primary flex items-center justify-center px-2 sm:px-3 py-2 touch-manipulation hover:shadow-md transition-all duration-200 rounded-l-none border-l border-primary-700"
              aria-label="More options"
            >
              <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                <button
                  onClick={() => {
                    setShowUploadModal(true)
                    setDropdownOpen(false)
                  }}
                  className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import Statement
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 lg:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 text-sm sm:text-base focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input text-sm sm:text-base focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          >
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
          </select>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'} flex items-center justify-center text-sm sm:text-base px-3 sm:px-4 py-2 touch-manipulation whitespace-nowrap hover:shadow-sm transition-all duration-200`}
          >
            <Filter className="h-4 w-4 mr-1.5 sm:mr-2" />
            <span className="hidden sm:inline">Advanced Filters</span>
            <span className="sm:hidden">Filters</span>
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <TransactionFilters
          onFiltersChange={handleFiltersChange}
          categories={categories}
          accounts={accounts}
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Bulk Operations */}
      <BulkOperations
        selectedCount={selectedTransactions.size}
        onBulkDelete={handleBulkDelete}
        onBulkEdit={handleBulkEdit}
        onBulkExport={handleBulkExport}
        onBulkCategorize={handleBulkCategorize}
        onBulkChangeAccount={handleBulkChangeAccount}
        onClearSelection={() => setSelectedTransactions(new Set())}
      />

      {/* Enhanced Transaction Table */}
      <EnhancedTransactionTable
        transactions={filteredTransactions}
        selectedTransactions={selectedTransactions}
        onSelectionChange={setSelectedTransactions}
        onEdit={(transaction) => {
          // In a real app, you'd open an edit modal
          toast.info('Edit feature coming soon!')
        }}
        onDelete={handleDeleteTransaction}
        onDuplicate={handleDuplicateTransaction}
        categories={categories}
        accounts={accounts}
      />

      {/* Empty State */}
      {filteredTransactions.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 sm:p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-100 mb-4">
            <svg className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No transactions found</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-6 px-2 max-w-md mx-auto">
            {transactions.length === 0 
              ? "Get started by adding your first transaction or uploading a bank statement to track your finances."
              : "Try adjusting your filters or search terms to find what you're looking for."
            }
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={() => setShowTransactionForm(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors touch-manipulation shadow-sm hover:shadow-md"
            >
              <Plus className="h-4 w-4" />
              <span>Add Transaction</span>
            </button>
            {transactions.length === 0 && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors touch-manipulation"
              >
                <Upload className="h-4 w-4" />
                Upload Statement
              </button>
            )}
          </div>
        </div>
      )}

      {/* Transaction Form Modal */}
      <TransactionForm 
        isOpen={showTransactionForm}
        onClose={() => setShowTransactionForm(false)}
        onSuccess={handleTransactionAdded}
      />

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
      />

      {/* Export Modal */}
      {showExport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <ExportTransactions
              transactions={filteredTransactions}
              selectedTransactions={selectedTransactions.size > 0 ? selectedTransactions : undefined}
              onClose={() => setShowExport(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}