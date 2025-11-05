import { useState, useEffect } from 'react'
import { X, CheckCircle, AlertTriangle, Download, Upload } from 'lucide-react'
import { Account, appendTransactions, listAccounts, getLastSelectedAccountId, setLastSelectedAccountId } from '../../services/accountsStore'
import { AddAccountModal } from './AddAccountModal'
import toast from 'react-hot-toast'

interface ParsedTransaction {
  date: string
  description: string
  withdrawal?: number
  deposit?: number
  balance?: number
  amount: number
  type: 'income' | 'expense' | 'transfer'
  merchant?: string
  raw_lines?: string[]
}

interface TransactionPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  transactions: ParsedTransaction[]
  onSuccess: () => void
}

export function TransactionPreviewModal({
  isOpen,
  onClose,
  transactions,
  onSuccess
}: TransactionPreviewModalProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [updateBalance, setUpdateBalance] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadAccounts()
    }
  }, [isOpen])

  const loadAccounts = () => {
    const allAccounts = listAccounts()
    setAccounts(allAccounts)
    
    // Set default to last selected account
    const lastSelected = getLastSelectedAccountId()
    if (lastSelected && allAccounts.find(a => a.id === lastSelected)) {
      setSelectedAccountId(lastSelected)
    } else if (allAccounts.length > 0) {
      setSelectedAccountId(allAccounts[0].id)
    }
  }

  const handleAccountCreated = (account: Account) => {
    setAccounts(listAccounts())
    setSelectedAccountId(account.id)
    setShowAddAccount(false)
  }

  const handleConfirm = async () => {
    if (!selectedAccountId) {
      toast.error('Please select an account')
      return
    }

    if (transactions.length === 0) {
      toast.error('No transactions to import')
      return
    }

    setSubmitting(true)

    try {
      // Map parsed transactions to store format
      const mappedTransactions = transactions.map(tx => ({
        account_id: selectedAccountId,
        date: tx.date,
        description: tx.description,
        withdrawal: tx.withdrawal,
        deposit: tx.deposit,
        balance: tx.balance,
        amount: tx.amount,
        type: tx.type,
        merchant: tx.merchant,
        import_source: 'upload',
        raw_lines: tx.raw_lines
      }))

      const result = appendTransactions(mappedTransactions, {
        updateAccountBalance: updateBalance,
        deduplicate: true
      })

      // Remember selected account
      setLastSelectedAccountId(selectedAccountId)

      if (result.duplicates > 0) {
        toast.success(
          `Imported ${result.added} transactions. ${result.duplicates} duplicates skipped.`,
          { duration: 5000 }
        )
      } else {
        toast.success(`Successfully imported ${result.added} transactions`)
      }

      if (result.errors.length > 0) {
        console.warn('Import errors:', result.errors)
      }

      onSuccess()
      onClose()
    } catch (error) {
      toast.error('Failed to import transactions')
      console.error('Error importing transactions:', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Import Transactions
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {transactions.length} transactions ready to import
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {/* Account Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Account <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="flex-1 input"
                  required
                >
                  <option value="">-- Select Account --</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.account_type}) - {formatCurrency(account.current_balance)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowAddAccount(true)}
                  className="btn btn-secondary whitespace-nowrap"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  New Account
                </button>
              </div>
            </div>

            {/* Balance Update Option */}
            {transactions.some(t => t.balance !== undefined && t.balance !== null) && (
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={updateBalance}
                    onChange={(e) => setUpdateBalance(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Update account balance from statement (use last transaction balance)
                  </span>
                </label>
              </div>
            )}

            {/* Transactions Preview Table */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Transactions Preview
              </h3>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Description
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Amount
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Type
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.slice(0, 10).map((tx, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {new Date(tx.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {tx.description}
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-medium">
                          <span className={tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(tx.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 capitalize">
                          {tx.type}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {transactions.length > 10 && (
                  <div className="px-4 py-2 bg-gray-50 text-sm text-gray-600 text-center">
                    ... and {transactions.length - 10} more transactions
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <button
              onClick={onClose}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedAccountId || submitting}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Importing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Import {transactions.length} Transactions
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Add Account Modal */}
      {showAddAccount && (
        <AddAccountModal
          isOpen={showAddAccount}
          onClose={() => setShowAddAccount(false)}
          onSuccess={handleAccountCreated}
        />
      )}
    </>
  )
}

