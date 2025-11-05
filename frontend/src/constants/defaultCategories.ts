/**
 * Default financial categories that are automatically seeded for all users
 */

export interface DefaultCategoryTemplate {
  name: string
  type: 'income' | 'expense' | 'transfer'
  color: string
  icon?: string
}

export const DEFAULT_CATEGORIES: DefaultCategoryTemplate[] = [
  // Income
  { name: 'Salary', type: 'income', color: '#22C55E' },
  { name: 'Business Income', type: 'income', color: '#22C55E' },
  { name: 'Investments', type: 'income', color: '#22C55E' },
  { name: 'Refunds', type: 'income', color: '#22C55E' },
  { name: 'Gifts Received', type: 'income', color: '#22C55E' },
  { name: 'Interest Earned', type: 'income', color: '#22C55E' },

  // Expenses
  { name: 'Rent / Mortgage', type: 'expense', color: '#EF4444' },
  { name: 'Utilities', type: 'expense', color: '#F59E0B' },
  { name: 'Groceries', type: 'expense', color: '#10B981' },
  { name: 'Dining & Takeout', type: 'expense', color: '#F97316' },
  { name: 'Transportation / Fuel', type: 'expense', color: '#3B82F6' },
  { name: 'Insurance', type: 'expense', color: '#8B5CF6' },
  { name: 'Healthcare', type: 'expense', color: '#EC4899' },
  { name: 'Entertainment', type: 'expense', color: '#6366F1' },
  { name: 'Subscriptions', type: 'expense', color: '#14B8A6' },
  { name: 'Shopping / Personal Care', type: 'expense', color: '#F43F5E' },
  { name: 'Education', type: 'expense', color: '#0EA5E9' },
  { name: 'Travel', type: 'expense', color: '#A855F7' },
  { name: 'Donations', type: 'expense', color: '#84CC16' },
  { name: 'Miscellaneous', type: 'expense', color: '#6B7280' },

  // Transfers
  { name: 'Internal Transfer', type: 'transfer', color: '#3B82F6' },
  { name: 'Savings Deposit', type: 'transfer', color: '#3B82F6' },
  { name: 'Credit Card Payment', type: 'transfer', color: '#3B82F6' }
]

