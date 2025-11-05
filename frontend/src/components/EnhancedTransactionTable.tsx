import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { 
  ChevronUp, 
  ChevronDown, 
  Edit, 
  Trash2, 
  Copy, 
  Eye, 
  Check, 
  X,
  Calendar,
  DollarSign,
  Tag,
  Building
} from 'lucide-react'
import toast from 'react-hot-toast'

// Tooltip component with delayed hover
interface TooltipProps {
  text: string
  children: React.ReactNode
}

function Tooltip({ text, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    timeoutRef.current = setTimeout(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setPosition({
          top: rect.bottom + window.scrollY + 8,
          left: rect.left + window.scrollX + rect.width / 2
        })
        setIsVisible(true)
      }
    }, 1000) // 1 second delay
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsVisible(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (isVisible && tooltipRef.current && containerRef.current) {
      const tooltip = tooltipRef.current
      const tooltipRect = tooltip.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const containerRect = containerRef.current.getBoundingClientRect()
      
      // Calculate center position
      let left = containerRect.left + containerRect.width / 2
      
      // Adjust if tooltip would go off screen
      const tooltipHalfWidth = tooltipRect.width / 2
      if (left - tooltipHalfWidth < 8) {
        left = tooltipHalfWidth + 8
      } else if (left + tooltipHalfWidth > viewportWidth - 8) {
        left = viewportWidth - tooltipHalfWidth - 8
      }
      
      setPosition(prev => ({ 
        ...prev, 
        left: left + window.scrollX 
      }))
    }
  }, [isVisible])

  return (
    <div 
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className="px-3 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg shadow-lg pointer-events-none whitespace-nowrap"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: 'translateX(-50%)',
            position: 'absolute',
            zIndex: 9999,
          }}
        >
          {text}
          <div 
            className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"
            style={{ top: '-4px' }}
          />
        </div>
      )}
    </div>
  )
}

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

interface EnhancedTransactionTableProps {
  transactions: Transaction[]
  selectedTransactions: Set<string>
  onSelectionChange: (selected: Set<string>) => void
  onEdit: (transaction: Transaction) => void
  onDelete: (transactionId: string) => void
  onDuplicate: (transaction: Transaction) => void
  categories: Array<{ id: string; name: string; color?: string }>
  accounts: Array<{ id: string; name: string; type: string }>
}

type SortField = 'date' | 'amount' | 'description' | 'type'
type SortDirection = 'asc' | 'desc'

export function EnhancedTransactionTable({
  transactions,
  selectedTransactions,
  onSelectionChange,
  onEdit,
  onDelete,
  onDuplicate,
  categories,
  accounts
}: EnhancedTransactionTableProps) {
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<Partial<Transaction>>({})

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleSelectAll = () => {
    if (selectedTransactions.size === transactions.length) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(transactions.map(t => t.id)))
    }
  }

  const handleSelectTransaction = (transactionId: string) => {
    const newSelected = new Set(selectedTransactions)
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId)
    } else {
      newSelected.add(transactionId)
    }
    onSelectionChange(newSelected)
  }

  const handleEdit = (transaction: Transaction) => {
    setEditingId(transaction.id)
    setEditingData({
      description: transaction.description,
      merchant: transaction.merchant,
      amount: transaction.amount,
      date: transaction.date,
      type: transaction.type,
      categoryId: transaction.categoryId,
      accountId: transaction.accountId
    })
  }

  const handleSaveEdit = async () => {
    if (!editingId) return

    try {
      // In a real app, you'd make an API call here
      toast.success('Transaction updated successfully')
      setEditingId(null)
      setEditingData({})
    } catch (error) {
      toast.error('Failed to update transaction')
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingData({})
  }

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }, [])

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }, [])

  const getTypeColor = useCallback((type: string) => {
    switch (type) {
      case 'income':
        return 'text-green-600 bg-green-100'
      case 'expense':
        return 'text-red-600 bg-red-100'
      case 'transfer':
        return 'text-blue-600 bg-blue-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }, [])

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
    let aValue: any, bValue: any

    switch (sortField) {
      case 'date':
        aValue = new Date(a.date).getTime()
        bValue = new Date(b.date).getTime()
        break
      case 'amount':
        aValue = a.amount
        bValue = b.amount
        break
      case 'description':
        aValue = a.description.toLowerCase()
        bValue = b.description.toLowerCase()
        break
      case 'type':
        aValue = a.type
        bValue = b.type
        break
      default:
        return 0
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })
  }, [transactions, sortField, sortDirection])

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1.5 text-left font-semibold text-gray-700 hover:text-gray-900 transition-colors touch-manipulation group w-full"
    >
      {children}
      {sortField === field && (
        <span className="flex items-center ml-auto">
          {sortDirection === 'asc' ? (
            <ChevronUp className="h-4 w-4 text-primary-600" />
          ) : (
            <ChevronDown className="h-4 w-4 text-primary-600" />
          )}
        </span>
      )}
      {sortField !== field && (
        <span className="opacity-0 group-hover:opacity-30 transition-opacity ml-auto">
          <ChevronUp className="h-3 w-3" />
        </span>
      )}
    </button>
  )

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Mobile Card View */}
      <div className="block md:hidden">
        <div className="p-3 sm:p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedTransactions.size === transactions.length && transactions.length > 0}
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4 cursor-pointer"
              />
              <span className="text-sm font-semibold text-gray-700">Select All</span>
            </label>
            <span className="px-2.5 py-1 bg-white text-xs font-medium text-gray-600 rounded-full border border-gray-200">
              {sortedTransactions.length} {sortedTransactions.length === 1 ? 'transaction' : 'transactions'}
            </span>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {sortedTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className={`p-4 sm:p-5 transition-colors ${
                selectedTransactions.has(transaction.id) 
                  ? 'bg-primary-50 border-l-4 border-primary-500' 
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.has(transaction.id)}
                    onChange={() => handleSelectTransaction(transaction.id)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4 mt-0.5 flex-shrink-0 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className="text-sm font-semibold text-gray-900 truncate">{transaction.description}</p>
                    </div>
                    {transaction.merchant && (
                      <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {transaction.merchant}
                      </p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-600 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(transaction.date)}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-600">{transaction.accountName}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className={`text-base sm:text-lg font-bold mb-1.5 ${
                    transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(transaction.amount)}
                  </p>
                  <span className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded-full ${getTypeColor(transaction.type)}`}>
                    {transaction.type}
                  </span>
                </div>
              </div>
              {transaction.categoryName && (
                <div className="mt-2 mb-3">
                  <span 
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ 
                      backgroundColor: transaction.categoryColor + '20',
                      color: transaction.categoryColor 
                    }}
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {transaction.categoryName}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleEdit(transaction)}
                  className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 active:bg-blue-100 py-2 px-2 rounded-lg transition-all touch-manipulation"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => onDuplicate(transaction)}
                  className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-50 active:bg-gray-100 py-2 px-2 rounded-lg transition-all touch-manipulation"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate
                </button>
                <button
                  onClick={() => onDelete(transaction.id)}
                  className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 active:bg-red-100 py-2 px-2 rounded-lg transition-all touch-manipulation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto -mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: '900px' }}>
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-3 py-3 text-left w-12">
                  <label className="cursor-pointer flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={selectedTransactions.size === transactions.length && transactions.length > 0}
                  onChange={handleSelectAll}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer w-4 h-4"
                />
                  </label>
              </th>
                <th className="px-4 py-3 text-left whitespace-nowrap w-[120px]">
                <SortButton field="date">
                    <Calendar className="h-4 w-4 inline mr-1.5 text-gray-500" />
                    <span className="font-semibold text-gray-700 text-sm">Date</span>
                  </SortButton>
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap w-[140px]">
                  <SortButton field="amount">
                    <DollarSign className="h-4 w-4 inline mr-1.5 text-gray-500" />
                    <span className="font-semibold text-gray-700 text-sm">Amount</span>
                </SortButton>
              </th>
                <th className="px-4 py-3 text-left w-[280px]">
                  <SortButton field="description">
                    <span className="font-semibold text-gray-700 text-sm">Description</span>
                  </SortButton>
              </th>
                <th className="px-4 py-3 text-left w-[160px]">
                  <span className="font-semibold text-gray-700 text-sm">Category</span>
              </th>
                <th className="px-4 py-3 text-left whitespace-nowrap w-[120px]">
                  <SortButton field="type">
                    <span className="font-semibold text-gray-700 text-sm">Type</span>
                </SortButton>
              </th>
                <th className="px-4 py-3 text-left hidden lg:table-cell w-[180px]">
                  <span className="font-semibold text-gray-700 text-sm">Account</span>
                </th>
                <th className="px-4 py-3 text-center whitespace-nowrap w-[140px] sticky right-0 bg-gradient-to-r from-gray-50 to-gray-100 z-20 shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                  <span className="font-semibold text-gray-700 text-sm">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedTransactions.map((transaction) => (
              <tr 
                key={transaction.id} 
                className={`transition-colors ${
                  selectedTransactions.has(transaction.id) 
                    ? 'bg-primary-50 border-l-4 border-primary-500' 
                    : 'hover:bg-gray-50'
                } ${editingId === transaction.id ? 'relative' : ''}`}
                style={editingId === transaction.id ? { zIndex: 30, position: 'relative' } : {}}
              >
                <td className="px-3 py-3 whitespace-nowrap align-middle">
                  <label className="cursor-pointer flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.has(transaction.id)}
                    onChange={() => handleSelectTransaction(transaction.id)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer w-4 h-4"
                  />
                  </label>
                </td>
                
                <td className="px-4 py-3 whitespace-nowrap align-middle">
                  {editingId === transaction.id ? (
                    <div style={{ position: 'relative', zIndex: 35, paddingRight: '8px' }}>
                    <input
                      type="date"
                      value={editingData.date || ''}
                      onChange={(e) => setEditingData({ ...editingData, date: e.target.value })}
                        className="input text-sm w-full"
                    />
                    </div>
                  ) : (
                    <span className="text-gray-700 text-sm">{formatDate(transaction.date)}</span>
                  )}
                </td>
                
                <td className="px-4 py-3 whitespace-nowrap text-right align-middle">
                  {editingId === transaction.id ? (
                    <div style={{ position: 'relative', zIndex: 35, paddingRight: '8px' }}>
                    <input
                        type="number"
                        step="0.01"
                        value={editingData.amount || ''}
                        onChange={(e) => setEditingData({ ...editingData, amount: parseFloat(e.target.value) })}
                        className="input text-sm w-full text-right font-semibold"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-end">
                      <span 
                        className={`font-semibold text-base ${
                          transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(transaction.amount)}
                      </span>
                    </div>
                  )}
                </td>
                
                <td className="px-4 py-3 align-middle" style={{ maxWidth: '280px', overflow: 'hidden' }}>
                  {editingId === transaction.id ? (
                    <div style={{ 
                      position: 'relative', 
                      zIndex: 35, 
                      paddingRight: '8px',
                      maxWidth: '100%',
                      overflow: 'hidden'
                    }}>
                      <input
                        type="text"
                        value={editingData.description || ''}
                        onChange={(e) => setEditingData({ ...editingData, description: e.target.value })}
                        className="input text-sm"
                        style={{ 
                          width: '100%',
                          maxWidth: '100%',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="font-medium text-gray-900 text-sm truncate pr-2">
                      {transaction.description}
                    </div>
                  )}
                </td>
                
                <td className="px-4 py-3 align-middle">
                  {editingId === transaction.id ? (
                    <div style={{ position: 'relative', zIndex: 35, paddingRight: '8px' }}>
                    <select
                      value={editingData.categoryId || ''}
                      onChange={(e) => setEditingData({ ...editingData, categoryId: e.target.value })}
                        className="input text-sm w-full"
                        style={{ 
                          width: '100%', 
                          boxSizing: 'border-box',
                          whiteSpace: 'nowrap'
                        }}
                    >
                      <option value="">Select category</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    </div>
                  ) : (
                    transaction.categoryName ? (
                      <span 
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{ 
                          backgroundColor: transaction.categoryColor + '20',
                          color: transaction.categoryColor 
                        }}
                      >
                        {transaction.categoryName}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs italic">Uncategorized</span>
                    )
                  )}
                </td>
                
                <td className="px-4 py-3 whitespace-nowrap align-middle">
                  {editingId === transaction.id ? (
                    <div style={{ position: 'relative', zIndex: 35, paddingRight: '8px' }}>
                    <select
                      value={editingData.type || ''}
                      onChange={(e) => setEditingData({ ...editingData, type: e.target.value as any })}
                        className="input text-sm w-full"
                        style={{ 
                          width: '100%', 
                          boxSizing: 'border-box', 
                          whiteSpace: 'nowrap'
                        }}
                    >
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                      <option value="transfer">Transfer</option>
                    </select>
                    </div>
                  ) : (
                    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${getTypeColor(transaction.type)}`}>
                      {transaction.type}
                    </span>
                  )}
                </td>
                
                <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell align-middle">
                  {editingId === transaction.id ? (
                    <div style={{ position: 'relative', zIndex: 35, paddingRight: '8px' }}>
                      <select
                        value={editingData.accountId || ''}
                        onChange={(e) => setEditingData({ ...editingData, accountId: e.target.value })}
                        className="input text-sm w-full"
                        style={{ 
                          width: '100%', 
                          boxSizing: 'border-box', 
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {accounts.map(account => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <span className="text-gray-700 truncate block">{transaction.accountName}</span>
                  )}
                </td>
                
                <td className={`px-4 py-3 whitespace-nowrap text-center sticky right-0 align-middle ${
                  selectedTransactions.has(transaction.id) ? 'bg-primary-50' : 'bg-white'
                } ${editingId === transaction.id ? 'z-25' : 'z-20'}`} style={{
                  boxShadow: editingId === transaction.id 
                    ? '2px 0 4px rgba(0,0,0,0.1)' 
                    : '2px 0 4px rgba(0,0,0,0.05)',
                  backgroundColor: editingId === transaction.id 
                    ? (selectedTransactions.has(transaction.id) ? 'rgb(239, 246, 255)' : 'white')
                    : (selectedTransactions.has(transaction.id) ? 'rgb(239, 246, 255)' : 'white')
                }}>
                  {selectedTransactions.has(transaction.id) && (
                    <div className="absolute inset-y-0 left-0 w-1 bg-primary-500"></div>
                  )}
                  {editingId === transaction.id ? (
                    <div className="flex items-center gap-2 justify-center">
                      <Tooltip text="Save changes">
                      <button
                        onClick={handleSaveEdit}
                          className="text-green-600 hover:text-green-800 hover:bg-green-50 transition-all touch-manipulation p-2 rounded-md"
                          aria-label="Save changes"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      </Tooltip>
                      <Tooltip text="Cancel editing">
                      <button
                        onClick={handleCancelEdit}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 transition-all touch-manipulation p-2 rounded-md"
                          aria-label="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      </Tooltip>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 justify-center">
                      <Tooltip text="Edit transaction">
                      <button
                        onClick={() => handleEdit(transaction)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-all touch-manipulation p-2 rounded-md"
                          aria-label="Edit transaction"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      </Tooltip>
                      <Tooltip text="Duplicate transaction">
                      <button
                        onClick={() => onDuplicate(transaction)}
                          className="text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-all touch-manipulation p-2 rounded-md"
                          aria-label="Duplicate transaction"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      </Tooltip>
                      <Tooltip text="Delete transaction">
                      <button
                        onClick={() => onDelete(transaction.id)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 transition-all touch-manipulation p-2 rounded-md"
                          aria-label="Delete transaction"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      </Tooltip>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
