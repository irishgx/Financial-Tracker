import { Upload, Edit3, Download } from 'lucide-react'
import { Account, Transaction, listTransactions } from '../../services/accountsStore'
import { Link } from 'react-router-dom'

interface AccountDetailPanelProps {
  account: Account | null
  onEdit?: (account: Account) => void
  onUpload?: () => void
}

export function AccountDetailPanel({ account, onEdit, onUpload }: AccountDetailPanelProps) {
  if (!account) {
    return (
      <div className="card h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Select an account to view details</p>
        </div>
      </div>
    )
  }

  const transactions = listTransactions(account.id).slice(0, 10)
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{account.name}</h3>
          <p className="text-sm text-gray-500 capitalize">{account.account_type}</p>
        </div>
        <div className="flex items-center gap-2">
          {onUpload && (
            <Link
              to="/transactions"
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
              title="Upload Statement"
            >
              <Upload className="h-4 w-4" />
            </Link>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(account)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
              title="Edit Account"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Account Metadata */}
      <div className="space-y-4 mb-6">
        <div>
          <p className="text-sm text-gray-500">Current Balance</p>
          <p className={`text-2xl font-bold ${
            account.current_balance >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(account.current_balance)}
          </p>
        </div>

        {account.institution_name && (
          <div>
            <p className="text-sm text-gray-500">Institution</p>
            <p className="text-sm font-medium text-gray-900">{account.institution_name}</p>
          </div>
        )}

        {account.masked_number && (
          <div>
            <p className="text-sm text-gray-500">Account Number</p>
            <p className="text-sm font-medium text-gray-900">****{account.masked_number}</p>
          </div>
        )}

        <div>
          <p className="text-sm text-gray-500">Created</p>
          <p className="text-sm font-medium text-gray-900">
            {formatDate(account.created_at)}
          </p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Transactions</h4>
        <div className="flex-1 overflow-y-auto">
          {transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {tx.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(tx.date)}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className={`text-sm font-medium ${
                      tx.amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(tx.amount)}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{tx.type}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">No transactions yet</p>
              {onUpload && (
                <Link
                  to="/transactions"
                  className="mt-2 inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Upload Statement
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

