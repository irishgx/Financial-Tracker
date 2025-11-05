import { useState, useEffect } from 'react'
import { X, Building, CreditCard, DollarSign } from 'lucide-react'
import { createAccount, updateAccount, Account } from '../../services/accountsStore'

interface AddAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (account: Account) => void
  editingAccount?: Account | null
}

export function AddAccountModal({ isOpen, onClose, onSuccess, editingAccount }: AddAccountModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    institution_name: '',
    account_type: 'checking',
    masked_number: '',
    opening_balance: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (editingAccount && isOpen) {
      setFormData({
        name: editingAccount.name,
        institution_name: editingAccount.institution_name || '',
        account_type: editingAccount.account_type,
        masked_number: editingAccount.masked_number || '',
        opening_balance: editingAccount.opening_balance?.toString() || ''
      })
    } else if (isOpen) {
      setFormData({
        name: '',
        institution_name: '',
        account_type: 'checking',
        masked_number: '',
        opening_balance: ''
      })
    }
  }, [editingAccount, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      return
    }

    setSubmitting(true)
    
    try {
      let account: Account
      
      if (editingAccount) {
        // Update existing account
        const updated = updateAccount(editingAccount.id, {
          name: formData.name.trim(),
          institution_name: formData.institution_name.trim() || undefined,
          account_type: formData.account_type,
          masked_number: formData.masked_number.trim() || undefined
        })
        
        if (!updated) {
          throw new Error('Failed to update account')
        }
        
        account = updated
      } else {
        // Create new account
        account = createAccount({
          name: formData.name.trim(),
          institution_name: formData.institution_name.trim() || undefined,
          account_type: formData.account_type,
          masked_number: formData.masked_number.trim() || undefined,
          opening_balance: formData.opening_balance ? parseFloat(formData.opening_balance) : undefined
        })
      }
      
      onSuccess(account)
      setFormData({
        name: '',
        institution_name: '',
        account_type: 'checking',
        masked_number: '',
        opening_balance: ''
      })
      onClose()
    } catch (error) {
      console.error('Error saving account:', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingAccount ? 'Edit Account' : 'Add Account'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Account Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Main Checking, Savings Account"
                className="input pl-10"
                required
              />
            </div>
          </div>

          {/* Institution Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Institution Name
            </label>
            <input
              type="text"
              value={formData.institution_name}
              onChange={(e) => setFormData(prev => ({ ...prev, institution_name: e.target.value }))}
              placeholder="e.g., Chase, Bank of America"
              className="input"
            />
          </div>

          {/* Account Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.account_type}
              onChange={(e) => setFormData(prev => ({ ...prev, account_type: e.target.value }))}
              className="input"
              required
            >
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
              <option value="credit">Credit Card</option>
              <option value="investment">Investment</option>
              <option value="loan">Loan</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Masked Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Number (Last 4 digits)
            </label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={formData.masked_number}
                onChange={(e) => setFormData(prev => ({ ...prev, masked_number: e.target.value.replace(/\D/g, '').slice(-4) }))}
                placeholder="1234"
                maxLength={4}
                className="input pl-10"
              />
            </div>
          </div>

              {/* Opening Balance - Only show for new accounts */}
          {!editingAccount && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Opening Balance
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  value={formData.opening_balance}
                  onChange={(e) => setFormData(prev => ({ ...prev, opening_balance: e.target.value }))}
                  placeholder="0.00"
                  className="input pl-10"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Leave empty to start at $0.00</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
                <button
                  type="submit"
                  className="flex-1 btn btn-primary"
                  disabled={submitting}
                >
                  {submitting 
                    ? (editingAccount ? 'Updating...' : 'Adding...') 
                    : (editingAccount ? 'Update Account' : 'Add Account')}
                </button>
          </div>
        </form>
      </div>
    </div>
  )
}

