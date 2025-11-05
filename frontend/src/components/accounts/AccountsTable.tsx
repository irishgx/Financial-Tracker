import { useState } from 'react'
import { Edit3, Trash2, Eye, ArrowUp, ArrowDown } from 'lucide-react'
import { Account } from '../../services/accountsStore'

interface AccountsTableProps {
  accounts: Account[]
  onSelectAccount: (account: Account) => void
  onEditAccount?: (account: Account) => void
  onArchiveAccount?: (accountId: string) => void
}

type SortField = 'name' | 'type' | 'balance'
type SortDirection = 'asc' | 'desc'

export function AccountsTable({
  accounts,
  onSelectAccount,
  onEditAccount,
  onArchiveAccount
}: AccountsTableProps) {
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedAccounts = [...accounts].sort((a, b) => {
    let comparison = 0
    
    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'type':
        comparison = a.account_type.localeCompare(b.account_type)
        break
      case 'balance':
        comparison = a.current_balance - b.current_balance
        break
    }
    
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3 w-3 inline ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 inline ml-1" />
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('name')}
            >
              Name <SortIcon field="name" />
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('type')}
            >
              Type <SortIcon field="type" />
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('balance')}
            >
              Balance <SortIcon field="balance" />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Institution
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedAccounts.map((account) => (
            <tr key={account.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{account.name}</div>
                {account.masked_number && (
                  <div className="text-sm text-gray-500">****{account.masked_number}</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-900 capitalize">{account.account_type}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`text-sm font-semibold ${
                  account.current_balance >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(account.current_balance)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-500">
                  {account.institution_name || '-'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onSelectAccount(account)}
                    className="text-primary-600 hover:text-primary-900"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  {onEditAccount && (
                    <button
                      onClick={() => onEditAccount(account)}
                      className="text-gray-600 hover:text-gray-900"
                      title="Edit"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  )}
                  {onArchiveAccount && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to archive "${account.name}"?`)) {
                          console.warn(`Archiving account: ${account.name}`)
                          onArchiveAccount(account.id)
                        }
                      }}
                      className="text-red-600 hover:text-red-900"
                      title="Archive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {sortedAccounts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No accounts found</p>
        </div>
      )}
    </div>
  )
}

