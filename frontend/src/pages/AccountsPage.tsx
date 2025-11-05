import { useState, useEffect } from 'react'
import { Plus, CreditCard, DollarSign, Download, Upload as UploadIcon } from 'lucide-react'
import { LoadingSpinner } from '../components/LoadingSpinner'
import toast from 'react-hot-toast'
import {
  Account,
  listAccounts,
  archiveAccount,
  exportJSON,
  importJSON,
  updateAccount
} from '../services/accountsStore'
import { AccountCard } from '../components/accounts/AccountCard'
import { AccountsTable } from '../components/accounts/AccountsTable'
import { AccountDetailPanel } from '../components/accounts/AccountDetailPanel'
import { AddAccountModal } from '../components/accounts/AddAccountModal'
import { MigrationHelper } from '../components/accounts/MigrationHelper'

export function AccountsPage() {
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = () => {
    try {
      setLoading(true)
      const allAccounts = listAccounts()
      setAccounts(allAccounts)
      
      // If an account was selected, re-select it after reload
      if (selectedAccount) {
        const updated = allAccounts.find(a => a.id === selectedAccount.id)
        if (updated) {
          setSelectedAccount(updated)
        } else {
          setSelectedAccount(null)
        }
      }
    } catch (error) {
      console.error('Error loading accounts:', error)
      toast.error('Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }

  const handleAccountCreated = (account: Account) => {
    loadAccounts()
    setSelectedAccount(account)
    toast.success('Account created successfully!')
  }

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account)
    setShowAccountForm(true)
  }

  const handleArchiveAccount = (accountId: string) => {
    if (archiveAccount(accountId)) {
      toast.success('Account archived successfully')
      loadAccounts()
      if (selectedAccount?.id === accountId) {
        setSelectedAccount(null)
      }
    } else {
      toast.error('Failed to archive account')
    }
  }

  const handleExport = () => {
    try {
      const json = exportJSON()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `finance-app-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Data exported successfully')
    } catch (error) {
      toast.error('Failed to export data')
      console.error('Export error:', error)
    }
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const json = event.target?.result as string
          
          // Ask user if they want to replace or merge
          const shouldReplace = window.confirm(
            'Import Options:\n\n' +
            'OK = Replace all data (WARNING: This will overwrite existing data)\n' +
            'Cancel = Merge with existing data\n\n' +
            'Do you want to REPLACE all data?'
          )
          
          console.warn(shouldReplace ? 'Replacing all data' : 'Merging data')
          
          const result = importJSON(json, { replace: shouldReplace })
          
          if (result.success) {
            toast.success(
              `Import successful: ${result.accounts} accounts, ${result.transactions} transactions`
            )
            loadAccounts()
          } else {
            toast.error(`Import failed: ${result.errors.join(', ')}`)
          }
        } catch (error) {
          toast.error('Failed to parse JSON file')
          console.error('Import error:', error)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Accounts</h1>
          <p className="mt-2 text-gray-600">
            Manage your financial accounts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="btn btn-secondary flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            <span>Export</span>
          </button>
          <button
            onClick={handleImport}
            className="btn btn-secondary flex items-center"
          >
            <UploadIcon className="h-4 w-4 mr-2" />
            <span>Import</span>
          </button>
          <button 
            onClick={() => {
              setEditingAccount(null)
              setShowAccountForm(true)
            }}
            className="btn btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Account Cards */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              isSelected={selectedAccount?.id === account.id}
              onClick={() => setSelectedAccount(account)}
            />
          ))}
        </div>
      )}

      {/* Migration Helper */}
      <MigrationHelper onComplete={loadAccounts} />

      {/* Main Content: Table and Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accounts Table */}
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-lg font-medium text-gray-900 mb-4">All Accounts</h2>
            <AccountsTable
              accounts={accounts}
              onSelectAccount={setSelectedAccount}
              onEditAccount={handleEditAccount}
              onArchiveAccount={handleArchiveAccount}
            />
          </div>
        </div>

        {/* Account Detail Panel */}
        <div className="lg:col-span-1">
          <AccountDetailPanel
            account={selectedAccount}
            onEdit={handleEditAccount}
            onUpload={() => {}}
          />
        </div>
      </div>

      {/* Empty State */}
      {accounts.length === 0 && (
        <div className="card">
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <DollarSign className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No accounts yet</h3>
            <p className="text-gray-600 mb-6">
              Add your first account to start tracking
            </p>
            <button 
              onClick={() => {
                setEditingAccount(null)
                setShowAccountForm(true)
              }}
              className="btn btn-primary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span>Add Account</span>
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Account Modal */}
      {showAccountForm && (
        <AddAccountModal
          isOpen={showAccountForm}
          editingAccount={editingAccount}
          onClose={() => {
            setShowAccountForm(false)
            setEditingAccount(null)
          }}
          onSuccess={(account) => {
            handleAccountCreated(account)
            setShowAccountForm(false)
            setEditingAccount(null)
          }}
        />
      )}
    </div>
  )
}
