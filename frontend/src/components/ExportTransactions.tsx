import { useState } from 'react'
import { Download, FileText, FileSpreadsheet, File } from 'lucide-react'
import toast from 'react-hot-toast'

interface Transaction {
  id: string
  accountId: string
  accountName: string
  categoryId?: string
  categoryName?: string
  amount: number
  description: string
  merchant?: string
  date: string
  type: 'income' | 'expense' | 'transfer'
  status: string
  createdAt: string
  updatedAt: string
}

interface ExportTransactionsProps {
  transactions: Transaction[]
  selectedTransactions?: Set<string>
  onClose: () => void
}

export function ExportTransactions({ transactions, selectedTransactions, onClose }: ExportTransactionsProps) {
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'xlsx'>('csv')
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  })
  const [includeHeaders, setIncludeHeaders] = useState(true)

  const getTransactionsToExport = () => {
    let transactionsToExport = transactions

    // Filter by selected transactions if provided
    if (selectedTransactions && selectedTransactions.size > 0) {
      transactionsToExport = transactions.filter(t => selectedTransactions.has(t.id))
    }

    // Filter by date range if specified
    if (dateRange.start || dateRange.end) {
      transactionsToExport = transactionsToExport.filter(t => {
        const transactionDate = new Date(t.date)
        const startDate = dateRange.start ? new Date(dateRange.start) : null
        const endDate = dateRange.end ? new Date(dateRange.end) : null

        if (startDate && transactionDate < startDate) return false
        if (endDate && transactionDate > endDate) return false
        return true
      })
    }

    return transactionsToExport
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const exportToCSV = () => {
    const transactionsToExport = getTransactionsToExport()
    
    if (transactionsToExport.length === 0) {
      toast.error('No transactions to export')
      return
    }

    const headers = [
      'Date',
      'Description',
      'Merchant',
      'Account',
      'Category',
      'Type',
      'Amount',
      'Status',
      'Created At'
    ]

    const csvContent = [
      includeHeaders ? headers.join(',') : '',
      ...transactionsToExport.map(t => [
        t.date,
        `"${t.description}"`,
        `"${t.merchant || ''}"`,
        `"${t.accountName}"`,
        `"${t.categoryName || 'Uncategorized'}"`,
        t.type,
        t.amount,
        t.status,
        t.createdAt
      ].join(','))
    ].filter(row => row).join('\n')

    downloadFile(csvContent, 'transactions.csv', 'text/csv')
  }

  const exportToJSON = () => {
    const transactionsToExport = getTransactionsToExport()
    
    if (transactionsToExport.length === 0) {
      toast.error('No transactions to export')
      return
    }

    const jsonContent = JSON.stringify(transactionsToExport, null, 2)
    downloadFile(jsonContent, 'transactions.json', 'application/json')
  }

  const exportToXLSX = () => {
    // For XLSX export, we'd need a library like xlsx
    // For now, we'll show a message that this feature requires additional setup
    toast.error('XLSX export requires additional setup. Please use CSV or JSON export.')
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    toast.success(`Exported ${getTransactionsToExport().length} transactions`)
    onClose()
  }

  const handleExport = () => {
    switch (exportFormat) {
      case 'csv':
        exportToCSV()
        break
      case 'json':
        exportToJSON()
        break
      case 'xlsx':
        exportToXLSX()
        break
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Download className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">Export Transactions</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          ×
        </button>
      </div>

      <div className="space-y-6">
        {/* Export Format */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Export Format
          </label>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setExportFormat('csv')}
              className={`p-4 border rounded-lg text-center transition-colors ${
                exportFormat === 'csv'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <FileText className="h-6 w-6 mx-auto mb-2" />
              <div className="text-sm font-medium">CSV</div>
              <div className="text-xs text-gray-500">Spreadsheet</div>
            </button>
            
            <button
              onClick={() => setExportFormat('json')}
              className={`p-4 border rounded-lg text-center transition-colors ${
                exportFormat === 'json'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <File className="h-6 w-6 mx-auto mb-2" />
              <div className="text-sm font-medium">JSON</div>
              <div className="text-xs text-gray-500">Data format</div>
            </button>
            
            <button
              onClick={() => setExportFormat('xlsx')}
              className={`p-4 border rounded-lg text-center transition-colors ${
                exportFormat === 'xlsx'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <FileSpreadsheet className="h-6 w-6 mx-auto mb-2" />
              <div className="text-sm font-medium">Excel</div>
              <div className="text-xs text-gray-500">Advanced</div>
            </button>
          </div>
        </div>

        {/* Date Range Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date Range (Optional)
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="input text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="input text-sm"
              />
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Export Options
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeHeaders}
                onChange={(e) => setIncludeHeaders(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-700">Include column headers</span>
            </label>
          </div>
        </div>

        {/* Export Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">
            <strong>Export Summary:</strong>
          </div>
          <div className="text-sm text-gray-600 mt-1">
            • Format: {exportFormat.toUpperCase()}
          </div>
          <div className="text-sm text-gray-600">
            • Transactions: {getTransactionsToExport().length}
          </div>
          {dateRange.start || dateRange.end ? (
            <div className="text-sm text-gray-600">
              • Date range: {dateRange.start || 'All'} to {dateRange.end || 'All'}
            </div>
          ) : null}
        </div>

        {/* Export Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="btn btn-primary flex-1 flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            <span>Export {getTransactionsToExport().length} Transactions</span>
          </button>
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
