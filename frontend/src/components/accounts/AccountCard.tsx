import { CreditCard } from 'lucide-react'
import { Account } from '../../services/accountsStore'

interface AccountCardProps {
  account: Account
  isSelected?: boolean
  onClick?: () => void
}

export function AccountCard({ account, isSelected, onClick }: AccountCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div
      onClick={onClick}
      className={`
        card cursor-pointer transition-all
        ${isSelected ? 'ring-2 ring-primary-500 bg-primary-50' : 'hover:shadow-md'}
      `}
    >
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-primary-700 font-semibold text-sm">
              {getInitials(account.name)}
            </span>
          </div>
        </div>
        <div className="ml-4 flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{account.name}</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(account.current_balance)}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-gray-500 capitalize">{account.account_type}</p>
            {account.masked_number && (
              <>
                <span className="text-gray-300">•</span>
                <p className="text-xs text-gray-500">****{account.masked_number.slice(-4)}</p>
              </>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 ml-2">
          <CreditCard className="h-5 w-5 text-gray-400" />
        </div>
      </div>
    </div>
  )
}

