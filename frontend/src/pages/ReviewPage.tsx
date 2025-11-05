import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle, AlertCircle, Loader2, ArrowLeft, Edit3, Trash2 } from 'lucide-react'
import { api } from '../services/api'
import { toast } from 'react-hot-toast'
import { clsx } from 'clsx'
import { TransactionPreviewModal } from '../components/accounts/TransactionPreviewModal'

interface ParsedTransaction {
  amount: number
  description: string
  merchant?: string
  date: string
  type: 'income' | 'expense' | 'transfer'
}

interface ParseJob {
  id: string
  status: string
  progress: number
  totalTransactions: number
  parsedTransactions: number
  errorMessage?: string
  previewData: {
    transactions: ParsedTransaction[]
    totalCount: number
    errors: string[]
    hasMore: boolean
  }
  upload: {
    filename: string
    originalName: string
    fileSize: number
    mimeType: string
  }
}

export function ReviewPage() {
  const { parseJobId } = useParams<{ parseJobId: string }>()
  const navigate = useNavigate()
  const [parseJob, setParseJob] = useState<ParseJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set())
  const [editingTransaction, setEditingTransaction] = useState<number | null>(null)
  const [editedTransactions, setEditedTransactions] = useState<ParsedTransaction[]>([])
  const [showAccountSelection, setShowAccountSelection] = useState(false)

  useEffect(() => {
    if (parseJobId) {
      loadParseJob()
    }
  }, [parseJobId])

  const loadParseJob = async () => {
    try {
      // Fetch parse job with ALL transactions
      const response = await api.get(`/uploads/parse-jobs/${parseJobId}?all=true`)
      setParseJob(response.data.parseJob)
      
      // Use allTransactions if available, otherwise fall back to preview
      const transactionsToLoad = response.data.parseJob.allTransactions || 
                                 response.data.parseJob.previewData?.transactions || []
      
      if (transactionsToLoad.length > 0) {
        setEditedTransactions(transactionsToLoad)
      }
    } catch (error: any) {
      toast.error('Failed to load parse job')
      console.error('Error loading parse job:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectTransaction = (index: number) => {
    const newSelected = new Set(selectedTransactions)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedTransactions(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedTransactions.size === editedTransactions.length) {
      setSelectedTransactions(new Set())
    } else {
      setSelectedTransactions(new Set(editedTransactions.map((_, index) => index)))
    }
  }

  const handleEditTransaction = (index: number) => {
    setEditingTransaction(index)
  }

  const handleSaveTransaction = (index: number, updatedTransaction: ParsedTransaction) => {
    const newTransactions = [...editedTransactions]
    newTransactions[index] = updatedTransaction
    setEditedTransactions(newTransactions)
    setEditingTransaction(null)
  }

  const handleDeleteTransaction = (index: number) => {
    const newTransactions = editedTransactions.filter((_, i) => i !== index)
    setEditedTransactions(newTransactions)
    setSelectedTransactions(new Set())
  }

  const handleConfirmTransactions = () => {
    if (selectedTransactions.size === 0) {
      toast.error('Please select at least one transaction to import')
      return
    }

    // Show account selection modal instead of directly confirming
    setShowAccountSelection(true)
  }

  const handleImportComplete = () => {
    // After successful import, navigate to transactions page
    navigate('/transactions')
  }

  // Map transactions for the preview modal
  const getTransactionsForImport = () => {
    return Array.from(selectedTransactions).map(index => {
      const tx = editedTransactions[index]
      // Map to format expected by TransactionPreviewModal
      return {
        date: tx.date,
        description: tx.description,
        withdrawal: tx.amount < 0 ? Math.abs(tx.amount) : undefined,
        deposit: tx.amount > 0 ? tx.amount : undefined,
        balance: undefined, // Balance not available from parser output currently
        amount: tx.amount,
        type: tx.type,
        merchant: tx.merchant,
        raw_lines: undefined // Can be added if parser provides it
      }
    })
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getTypeColor = (type: string) => {
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
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!parseJob) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-600" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">Parse job not found</h3>
        <p className="mt-2 text-gray-600">The requested parse job could not be found.</p>
        <button
          onClick={() => navigate('/transactions')}
          className="mt-4 btn btn-primary"
        >
          Go to Transactions
        </button>
      </div>
    )
  }

  if (parseJob.status === 'failed' || parseJob.status === 'error') {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-600" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">Processing failed</h3>
        <p className="mt-2 text-gray-600">{parseJob.errorMessage || 'An error occurred while processing the file.'}</p>
        {parseJob.previewData.errors.length > 0 && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-2xl mx-auto text-left">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">Details:</h4>
            <ul className="text-sm text-yellow-700 list-disc list-inside">
              {parseJob.previewData.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        <button
          onClick={() => navigate('/transactions')}
          className="mt-4 btn btn-primary"
        >
          Go to Transactions
        </button>
      </div>
    )
  }

  if (parseJob.status !== 'completed') {
    return (
      <div className="text-center py-12">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary-600" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">Processing file...</h3>
        <p className="mt-2 text-gray-600">
          {parseJob.progress}% complete ({parseJob.parsedTransactions} of {parseJob.totalTransactions} transactions)
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <button
          onClick={() => navigate('/transactions')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Transactions
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Review Transactions</h1>
        <p className="mt-2 text-gray-600">
          Review and edit the parsed transactions from {parseJob.upload.originalName}
        </p>
      </div>

      {parseJob.previewData.errors.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">Parsing Warnings</h3>
          <ul className="text-sm text-yellow-700 list-disc list-inside">
            {parseJob.previewData.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {editedTransactions.length === 0 && parseJob.status === 'completed' && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">No Transactions Found</h3>
          <p className="text-sm text-blue-700">
            No transactions could be extracted from the file. This may occur if:
          </p>
          <ul className="text-sm text-blue-700 list-disc list-inside mt-2">
            <li>The PDF is a scanned image (requires OCR)</li>
            <li>The file format is not supported</li>
            <li>The statement uses an unusual layout</li>
          </ul>
          <p className="text-sm text-blue-700 mt-2">
            Try uploading a CSV or Excel file, or ensure your PDF contains selectable text.
          </p>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900">
              Transactions ({editedTransactions.length})
            </h2>
            <p className="text-sm text-gray-600">
              {editedTransactions.length} transaction{editedTransactions.length !== 1 ? 's' : ''} ready to review
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleSelectAll}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              {selectedTransactions.size === editedTransactions.length ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={handleConfirmTransactions}
              disabled={selectedTransactions.size === 0 || confirming}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {confirming ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              <span>Import {selectedTransactions.size} Transactions</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.size === editedTransactions.length && editedTransactions.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Merchant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {editedTransactions.map((transaction, index) => (
                <tr key={index} className={selectedTransactions.has(index) ? 'bg-primary-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.has(index)}
                      onChange={() => handleSelectTransaction(index)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {transaction.description}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {transaction.merchant || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatAmount(transaction.amount)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={clsx(
                      'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                      getTypeColor(transaction.type)
                    )}>
                      {transaction.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditTransaction(index)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTransaction(index)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editedTransactions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No transactions found in this file.</p>
          </div>
        )}
      </div>

      {/* Account Selection Modal */}
      {showAccountSelection && (
        <TransactionPreviewModal
          isOpen={showAccountSelection}
          onClose={() => setShowAccountSelection(false)}
          transactions={getTransactionsForImport()}
          onSuccess={handleImportComplete}
        />
      )}
    </div>
  )
}
