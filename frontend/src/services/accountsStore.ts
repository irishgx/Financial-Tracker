/**
 * Accounts Store - LocalStorage-based JSON persistence
 * Stores accounts, transactions, categories, and related data in localStorage
 */

import { DEFAULT_CATEGORIES } from '../constants/defaultCategories'

// Re-export for convenience
export { DEFAULT_CATEGORIES }

const STORAGE_KEY = 'finance_app_v1'

export interface Account {
  id: string
  name: string
  institution_name?: string
  account_type: string
  masked_number?: string
  current_balance: number
  opening_balance?: number
  created_at: string
  updated_at: string
  archived?: boolean
}

export interface Transaction {
  id: string
  account_id: string
  date: string
  description: string
  withdrawal?: number
  deposit?: number
  balance?: number
  amount: number
  type: 'income' | 'expense' | 'transfer'
  merchant?: string
  category_id?: string
  import_source?: string
  raw_lines?: string[]
  created_at: string
}

export interface Category {
  id: string
  name: string
  type: 'income' | 'expense' | 'transfer'
  color: string
  icon?: string
  isDefault: boolean
  created_at?: string
  updated_at?: string
}

export interface Store {
  accounts: Account[]
  transactions: Transaction[]
  categories: Category[]
  meta: {
    lastSelectedAccountId?: string
    version: string
    lastUpdated: string
  }
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Normalize date to ISO format
 * Handles M/D, MM/DD, MM/DD/YY, MM/DD/YYYY formats
 */
function normalizeDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0]
  
  // If already ISO format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }
  
  // Try to parse common date formats
  const parts = dateStr.split(/[\/\-]/)
  if (parts.length >= 2) {
    const month = parseInt(parts[0], 10)
    const day = parseInt(parts[1], 10)
    let year = parts[2] ? parseInt(parts[2], 10) : new Date().getFullYear()
    
    // Handle 2-digit years
    if (year < 100) {
      const currentYear = new Date().getFullYear()
      const currentCentury = Math.floor(currentYear / 100) * 100
      // If year is > 50, assume 1900s, otherwise 2000s
      year = year > 50 ? currentCentury - 100 + year : currentCentury + year
    }
    
    // Validate date
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const date = new Date(year, month - 1, day)
      if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
        return date.toISOString().split('T')[0]
      }
    }
  }
  
  // Fallback: try to parse with Date constructor
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0]
  }
  
  // Last resort: return today's date
  return new Date().toISOString().split('T')[0]
}

/**
 * Load the entire store from localStorage
 */
export function loadStore(): Store {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Ensure structure exists
      return {
        accounts: parsed.accounts || [],
        transactions: parsed.transactions || [],
        categories: parsed.categories || [],
        meta: {
          ...parsed.meta,
          version: parsed.meta?.version || '1.0.0',
          lastUpdated: parsed.meta?.lastUpdated || new Date().toISOString()
        }
      }
    }
  } catch (error) {
    console.error('Error loading store:', error)
  }
  
  // Return empty store
  return {
    accounts: [],
    transactions: [],
    categories: [],
    meta: {
      version: '1.0.0',
      lastUpdated: new Date().toISOString()
    }
  }
}

/**
 * Save the entire store to localStorage
 */
export function saveStore(store: Store): void {
  try {
    store.meta.lastUpdated = new Date().toISOString()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch (error) {
    console.error('Error saving store:', error)
    throw new Error('Failed to save to localStorage')
  }
}

/**
 * List all accounts (excluding archived)
 */
export function listAccounts(): Account[] {
  const store = loadStore()
  return store.accounts.filter(acc => !acc.archived)
}

/**
 * Get a specific account by ID
 */
export function getAccount(id: string): Account | null {
  const store = loadStore()
  return store.accounts.find(acc => acc.id === id && !acc.archived) || null
}

/**
 * Create a new account
 */
export function createAccount(payload: {
  name: string
  institution_name?: string
  account_type: string
  masked_number?: string
  opening_balance?: number
}): Account {
  const store = loadStore()
  const now = new Date().toISOString()
  
  const account: Account = {
    id: generateId(),
    name: payload.name,
    institution_name: payload.institution_name,
    account_type: payload.account_type,
    masked_number: payload.masked_number,
    current_balance: payload.opening_balance || 0,
    opening_balance: payload.opening_balance || 0,
    created_at: now,
    updated_at: now,
    archived: false
  }
  
  store.accounts.push(account)
  saveStore(store)
  
  return account
}

/**
 * Update an account
 */
export function updateAccount(id: string, patch: Partial<Account>): Account | null {
  const store = loadStore()
  const accountIndex = store.accounts.findIndex(acc => acc.id === id)
  
  if (accountIndex === -1) {
    return null
  }
  
  const updated = {
    ...store.accounts[accountIndex],
    ...patch,
    updated_at: new Date().toISOString(),
    id // Ensure ID doesn't change
  }
  
  store.accounts[accountIndex] = updated
  saveStore(store)
  
  return updated
}

/**
 * Archive an account (soft delete)
 */
export function archiveAccount(id: string): boolean {
  const store = loadStore()
  const accountIndex = store.accounts.findIndex(acc => acc.id === id)
  
  if (accountIndex === -1) {
    return false
  }
  
  store.accounts[accountIndex].archived = true
  store.accounts[accountIndex].updated_at = new Date().toISOString()
  saveStore(store)
  
  return true
}

/**
 * List transactions, optionally filtered by account ID
 */
export function listTransactions(accountId?: string): Transaction[] {
  const store = loadStore()
  let transactions = store.transactions
  
  if (accountId) {
    transactions = transactions.filter(t => t.account_id === accountId)
  }
  
  // Sort by date descending (newest first)
  return transactions.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )
}

/**
 * Append transactions to the store
 * Handles deduplication and batch processing
 */
export function appendTransactions(
  transactions: Array<{
    account_id: string
    date: string
    description: string
    withdrawal?: number
    deposit?: number
    balance?: number
    amount: number
    type: 'income' | 'expense' | 'transfer'
    merchant?: string
    category_id?: string
    import_source?: string
    raw_lines?: string[]
  }>,
  options?: {
    updateAccountBalance?: boolean
    deduplicate?: boolean
  }
): { added: number; duplicates: number; errors: string[] } {
  const store = loadStore()
  const now = new Date().toISOString()
  let added = 0
  let duplicates = 0
  const errors: string[] = []
  
  // Create a fingerprint set for deduplication
  const fingerprints = new Set<string>()
  if (options?.deduplicate !== false) {
    store.transactions.forEach(t => {
      if (t.raw_lines) {
        const fp = t.raw_lines.join('|')
        fingerprints.add(fp)
      } else {
        // Fallback: use date + description + amount
        const fp = `${t.date}|${t.description}|${t.amount}`
        fingerprints.add(fp)
      }
    })
  }
  
  // Process transactions in batches to avoid blocking
  const batchSize = 200
  const batches: typeof transactions[] = []
  
  for (let i = 0; i < transactions.length; i += batchSize) {
    batches.push(transactions.slice(i, i + batchSize))
  }
  
  const newTransactions: Transaction[] = []
  let lastBalance: number | undefined
  
  for (const batch of batches) {
    for (const tx of batch) {
      try {
        // Check for duplicates
        let isDuplicate = false
        if (options?.deduplicate !== false) {
          const fingerprint = tx.raw_lines 
            ? tx.raw_lines.join('|')
            : `${tx.date}|${tx.description}|${tx.amount}`
          
          if (fingerprints.has(fingerprint)) {
            isDuplicate = true
            duplicates++
          } else {
            fingerprints.add(fingerprint)
          }
        }
        
        if (!isDuplicate) {
          const normalizedDate = normalizeDate(tx.date)
          
          const transaction: Transaction = {
            id: generateId(),
            account_id: tx.account_id,
            date: normalizedDate,
            description: tx.description,
            withdrawal: tx.withdrawal,
            deposit: tx.deposit,
            balance: tx.balance,
            amount: tx.amount,
            type: tx.type,
            merchant: tx.merchant,
            category_id: tx.category_id,
            import_source: tx.import_source || 'upload',
            raw_lines: tx.raw_lines,
            created_at: now
          }
          
          newTransactions.push(transaction)
          added++
          
          // Track last balance if provided
          if (tx.balance !== undefined && tx.balance !== null) {
            lastBalance = tx.balance
          }
        }
      } catch (error) {
        errors.push(`Failed to process transaction: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }
  
  // Append new transactions
  store.transactions.push(...newTransactions)
  
  // Update account balance if requested and balance is available
  if (options?.updateAccountBalance && lastBalance !== undefined && transactions.length > 0) {
    const accountId = transactions[0].account_id
    const account = store.accounts.find(acc => acc.id === accountId && !acc.archived)
    if (account) {
      account.current_balance = lastBalance
      account.updated_at = now
    }
  }
  
  // Save store
  saveStore(store)
  
  return { added, duplicates, errors }
}

/**
 * Export entire store as JSON
 */
export function exportJSON(): string {
  const store = loadStore()
  return JSON.stringify(store, null, 2)
}

/**
 * Import JSON data into store
 */
export function importJSON(
  json: string,
  options: { replace?: boolean } = {}
): { success: boolean; accounts: number; transactions: number; errors: string[] } {
  try {
    const imported = JSON.parse(json)
    
    if (options.replace) {
      console.warn('Replacing all data in store')
      const newStore: Store = {
        accounts: imported.accounts || [],
        transactions: imported.transactions || [],
        categories: imported.categories || [],
        meta: {
          version: imported.meta?.version || '1.0.0',
          lastUpdated: new Date().toISOString(),
          lastSelectedAccountId: imported.meta?.lastSelectedAccountId
        }
      }
      // Ensure defaults are still present after replace
      ensureDefaultCategories()
      saveStore(newStore)
      
      return {
        success: true,
        accounts: newStore.accounts.length,
        transactions: newStore.transactions.length,
        errors: []
      }
    } else {
      // Merge mode
      const store = loadStore()
      
      // Merge accounts (avoid duplicates by ID)
      const existingAccountIds = new Set(store.accounts.map(a => a.id))
      const newAccounts = (imported.accounts || []).filter((a: Account) => !existingAccountIds.has(a.id))
      store.accounts.push(...newAccounts)
      
      // Merge transactions (avoid duplicates)
      const existingTxIds = new Set(store.transactions.map(t => t.id))
      const newTransactions = (imported.transactions || []).filter((t: Transaction) => !existingTxIds.has(t.id))
      store.transactions.push(...newTransactions)
      
      // Merge categories (avoid duplicates by name, but preserve defaults)
      const existingCategoryNames = new Set(store.categories.map(c => c.name.toLowerCase()))
      const newCategories = (imported.categories || []).filter((c: Category) => {
        // Don't import if name already exists
        return !existingCategoryNames.has(c.name.toLowerCase())
      })
      store.categories.push(...newCategories)
      
      // Ensure defaults are still present after merge
      ensureDefaultCategories()
      saveStore(store)
      
      return {
        success: true,
        accounts: newAccounts.length,
        transactions: newTransactions.length,
        errors: []
      }
    }
  } catch (error) {
    return {
      success: false,
      accounts: 0,
      transactions: 0,
      errors: [error instanceof Error ? error.message : 'Failed to parse JSON']
    }
  }
}

/**
 * Get last selected account ID from metadata
 */
export function getLastSelectedAccountId(): string | null {
  const store = loadStore()
  return store.meta.lastSelectedAccountId || null
}

/**
 * Set last selected account ID
 */
export function setLastSelectedAccountId(accountId: string): void {
  const store = loadStore()
  store.meta.lastSelectedAccountId = accountId
  saveStore(store)
}

/**
 * Ensure default categories are seeded in the store
 * This should be called on app initialization
 */
export function ensureDefaultCategories(): void {
  const store = loadStore()
  
  // Only seed if no categories exist
  if (!store.categories || store.categories.length === 0) {
    const now = new Date().toISOString()
    store.categories = DEFAULT_CATEGORIES.map(cat => ({
      id: generateId(),
      name: cat.name,
      type: cat.type,
      color: cat.color,
      icon: cat.icon,
      isDefault: true,
      created_at: now,
      updated_at: now
    }))
    saveStore(store)
  }
}

/**
 * List all categories, optionally filtered by type
 */
export function listCategories(type?: 'income' | 'expense' | 'transfer'): Category[] {
  const store = loadStore()
  let categories = store.categories || []
  
  if (type) {
    categories = categories.filter(cat => cat.type === type)
  }
  
  // Sort: defaults first, then by name
  return categories.sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1
    if (!a.isDefault && b.isDefault) return 1
    return a.name.localeCompare(b.name)
  })
}

/**
 * Get a specific category by ID
 */
export function getCategory(id: string): Category | null {
  const store = loadStore()
  return store.categories.find(cat => cat.id === id) || null
}

/**
 * Create a new category (custom, not default)
 */
export function createCategory(payload: {
  name: string
  type: 'income' | 'expense' | 'transfer'
  color: string
  icon?: string
}): Category {
  const store = loadStore()
  const now = new Date().toISOString()
  
  // Check for duplicate name
  const existing = store.categories.find(
    cat => cat.name.toLowerCase() === payload.name.toLowerCase()
  )
  if (existing) {
    throw new Error('Category with this name already exists')
  }
  
  const category: Category = {
    id: generateId(),
    name: payload.name,
    type: payload.type,
    color: payload.color,
    icon: payload.icon,
    isDefault: false,
    created_at: now,
    updated_at: now
  }
  
  store.categories.push(category)
  saveStore(store)
  
  return category
}

/**
 * Update a category
 */
export function updateCategory(id: string, patch: Partial<Category>): Category | null {
  const store = loadStore()
  const categoryIndex = store.categories.findIndex(cat => cat.id === id)
  
  if (categoryIndex === -1) {
    return null
  }
  
  const updated = {
    ...store.categories[categoryIndex],
    ...patch,
    updated_at: new Date().toISOString(),
    id, // Ensure ID doesn't change
    isDefault: store.categories[categoryIndex].isDefault // Prevent changing isDefault
  }
  
  // Check for duplicate name (excluding current category)
  const duplicate = store.categories.find(
    (cat, idx) => idx !== categoryIndex && 
    cat.name.toLowerCase() === updated.name.toLowerCase()
  )
  if (duplicate) {
    throw new Error('Category with this name already exists')
  }
  
  store.categories[categoryIndex] = updated
  saveStore(store)
  
  return updated
}

/**
 * Delete a category
 */
export function deleteCategory(id: string): boolean {
  const store = loadStore()
  const categoryIndex = store.categories.findIndex(cat => cat.id === id)
  
  if (categoryIndex === -1) {
    return false
  }
  
  const category = store.categories[categoryIndex]
  
  // Warn if deleting default category
  if (category.isDefault) {
    console.warn(`Deleting default category: ${category.name}`)
  }
  
  store.categories.splice(categoryIndex, 1)
  saveStore(store)
  
  return true
}

