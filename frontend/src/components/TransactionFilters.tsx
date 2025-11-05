import { useState } from 'react'
import { Calendar, DollarSign, Tag, Building, Filter, X } from 'lucide-react'

interface FilterState {
  dateRange: {
    start: string
    end: string
  }
  amountRange: {
    min: string
    max: string
  }
  categories: string[]
  accounts: string[]
  types: string[]
  searchTerm: string
}

interface TransactionFiltersProps {
  onFiltersChange: (filters: FilterState) => void
  categories: Array<{ id: string; name: string; color?: string }>
  accounts: Array<{ id: string; name: string; type: string }>
  isOpen: boolean
  onClose: () => void
}

export function TransactionFilters({ 
  onFiltersChange, 
  categories, 
  accounts, 
  isOpen, 
  onClose 
}: TransactionFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    dateRange: { start: '', end: '' },
    amountRange: { min: '', max: '' },
    categories: [],
    accounts: [],
    types: [],
    searchTerm: ''
  })

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleCategoryToggle = (categoryId: string) => {
    const newCategories = filters.categories.includes(categoryId)
      ? filters.categories.filter(id => id !== categoryId)
      : [...filters.categories, categoryId]
    handleFilterChange('categories', newCategories)
  }

  const handleAccountToggle = (accountId: string) => {
    const newAccounts = filters.accounts.includes(accountId)
      ? filters.accounts.filter(id => id !== accountId)
      : [...filters.accounts, accountId]
    handleFilterChange('accounts', newAccounts)
  }

  const handleTypeToggle = (type: string) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...filters.types, type]
    handleFilterChange('types', newTypes)
  }

  const clearAllFilters = () => {
    const clearedFilters: FilterState = {
      dateRange: { start: '', end: '' },
      amountRange: { min: '', max: '' },
      categories: [],
      accounts: [],
      types: [],
      searchTerm: ''
    }
    setFilters(clearedFilters)
    onFiltersChange(clearedFilters)
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (filters.dateRange.start || filters.dateRange.end) count++
    if (filters.amountRange.min || filters.amountRange.max) count++
    if (filters.categories.length > 0) count++
    if (filters.accounts.length > 0) count++
    if (filters.types.length > 0) count++
    if (filters.searchTerm) count++
    return count
  }

  if (!isOpen) return null

  return (
    <div className="bg-white rounded-lg border-2 border-primary-200 shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="p-1.5 bg-primary-100 rounded-lg">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Advanced Filters</h3>
          {getActiveFilterCount() > 0 && (
            <span className="bg-primary-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
              {getActiveFilterCount()} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearAllFilters}
            className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors touch-manipulation px-3 py-1.5 hover:bg-gray-100 rounded-lg"
          >
            Clear all
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors touch-manipulation p-1.5 rounded-lg"
            aria-label="Close filters"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Date Range */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline mr-1" />
            Date Range
          </label>
          <div className="space-y-2">
            <input
              type="date"
              value={filters.dateRange.start}
              onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, start: e.target.value })}
              className="input text-sm sm:text-base"
              placeholder="Start date"
            />
            <input
              type="date"
              value={filters.dateRange.end}
              onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, end: e.target.value })}
              className="input text-sm sm:text-base"
              placeholder="End date"
            />
          </div>
        </div>

        {/* Amount Range */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline mr-1" />
            Amount Range
          </label>
          <div className="space-y-2">
            <input
              type="number"
              step="0.01"
              value={filters.amountRange.min}
              onChange={(e) => handleFilterChange('amountRange', { ...filters.amountRange, min: e.target.value })}
              className="input text-sm sm:text-base"
              placeholder="Min amount"
            />
            <input
              type="number"
              step="0.01"
              value={filters.amountRange.max}
              onChange={(e) => handleFilterChange('amountRange', { ...filters.amountRange, max: e.target.value })}
              className="input text-sm sm:text-base"
              placeholder="Max amount"
            />
          </div>
        </div>

        {/* Transaction Types */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            Transaction Types
          </label>
          <div className="space-y-2">
            {['income', 'expense', 'transfer'].map((type) => (
              <label key={type} className="flex items-center touch-manipulation py-1">
                <input
                  type="checkbox"
                  checked={filters.types.includes(type)}
                  onChange={() => handleTypeToggle(type)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                />
                <span className="ml-2 text-xs sm:text-sm text-gray-700 capitalize">{type}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline mr-1" />
            Categories
          </label>
          <div className="max-h-32 sm:max-h-40 overflow-y-auto space-y-2">
            {categories.map((category) => (
              <label key={category.id} className="flex items-center touch-manipulation py-1">
                <input
                  type="checkbox"
                  checked={filters.categories.includes(category.id)}
                  onChange={() => handleCategoryToggle(category.id)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                />
                <span className="ml-2 text-xs sm:text-sm text-gray-700 truncate">{category.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Accounts */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            <Building className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline mr-1" />
            Accounts
          </label>
          <div className="max-h-32 sm:max-h-40 overflow-y-auto space-y-2">
            {accounts.map((account) => (
              <label key={account.id} className="flex items-center touch-manipulation py-1">
                <input
                  type="checkbox"
                  checked={filters.accounts.includes(account.id)}
                  onChange={() => handleAccountToggle(account.id)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                />
                <span className="ml-2 text-xs sm:text-sm text-gray-700 truncate">{account.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Search */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            Search
          </label>
          <input
            type="text"
            value={filters.searchTerm}
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
            className="input text-sm sm:text-base"
            placeholder="Search transactions..."
          />
        </div>
      </div>
    </div>
  )
}
