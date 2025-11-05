import { useState } from 'react'
import { Calendar, DollarSign, Tag, Bell, Repeat, AlertTriangle } from 'lucide-react'
import { api } from '../services/api'
import toast from 'react-hot-toast'

interface ReminderFormProps {
  onSuccess: () => void
  onCancel: () => void
  reminder?: {
    id: string
    title: string
    amount?: number
    dueDate: string
    category: string
    priority: 'high' | 'medium' | 'low'
    isRecurring: boolean
    recurringPattern?: string
    notes?: string
  }
}

export function ReminderForm({ onSuccess, onCancel, reminder }: ReminderFormProps) {
  const [formData, setFormData] = useState({
    title: reminder?.title || '',
    amount: reminder?.amount || '',
    dueDate: reminder?.dueDate || '',
    category: reminder?.category || 'bills',
    priority: reminder?.priority || 'medium',
    isRecurring: reminder?.isRecurring || false,
    recurringPattern: reminder?.recurringPattern || 'monthly',
    notes: reminder?.notes || ''
  })

  const [loading, setLoading] = useState(false)

  const categories = [
    { value: 'bills', label: 'Bills', icon: '🏠' },
    { value: 'subscriptions', label: 'Subscriptions', icon: '📱' },
    { value: 'savings', label: 'Savings Goals', icon: '💰' },
    { value: 'investments', label: 'Investments', icon: '📈' },
    { value: 'insurance', label: 'Insurance', icon: '🛡️' },
    { value: 'utilities', label: 'Utilities', icon: '⚡' },
    { value: 'other', label: 'Other', icon: '📝' }
  ]

  const recurringPatterns = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' }
  ]

  const priorities = [
    { value: 'high', label: 'High', color: 'text-red-600 bg-red-100' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600 bg-yellow-100' },
    { value: 'low', label: 'Low', color: 'text-green-600 bg-green-100' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      toast.error('Please enter a reminder title')
      return
    }

    if (!formData.dueDate) {
      toast.error('Please select a due date')
      return
    }

    setLoading(true)

    try {
      const reminderData = {
        title: formData.title.trim(),
        description: formData.notes || undefined,
        amount: formData.amount ? parseFloat(formData.amount.toString()) : undefined,
        dueDate: new Date(formData.dueDate).toISOString(),
        isRecurring: formData.isRecurring,
        recurringFrequency: formData.isRecurring ? formData.recurringPattern : undefined
      }

      if (reminder) {
        // Update existing reminder
        await api.put(`/reminders/${reminder.id}`, reminderData)
        toast.success('Reminder updated successfully')
      } else {
        // Create new reminder
        await api.post('/reminders', reminderData)
        toast.success('Reminder created successfully')
      }
      
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save reminder')
      console.error('Error saving reminder:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'medium':
        return <Bell className="h-4 w-4 text-yellow-600" />
      case 'low':
        return <Bell className="h-4 w-4 text-green-600" />
      default:
        return <Bell className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Reminder Title *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="input"
          placeholder="e.g., Rent Payment, Netflix Subscription"
          required
        />
      </div>

      {/* Amount and Due Date */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <DollarSign className="h-4 w-4 inline mr-1" />
            Amount (Optional)
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            className="input"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="h-4 w-4 inline mr-1" />
            Due Date *
          </label>
          <input
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            className="input"
            required
          />
        </div>
      </div>

      {/* Category and Priority */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Tag className="h-4 w-4 inline mr-1" />
            Category
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="input"
          >
            {categories.map(category => (
              <option key={category.value} value={category.value}>
                {category.icon} {category.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Priority
          </label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
            className="input"
          >
            {priorities.map(priority => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Recurring Options */}
      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isRecurring"
            checked={formData.isRecurring}
            onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="isRecurring" className="ml-2 text-sm font-medium text-gray-700">
            <Repeat className="h-4 w-4 inline mr-1" />
            Recurring Reminder
          </label>
        </div>

        {formData.isRecurring && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recurring Pattern
            </label>
            <select
              value={formData.recurringPattern}
              onChange={(e) => setFormData({ ...formData, recurringPattern: e.target.value })}
              className="input"
            >
              {recurringPatterns.map(pattern => (
                <option key={pattern.value} value={pattern.value}>
                  {pattern.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notes (Optional)
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="input"
          rows={3}
          placeholder="Additional notes about this reminder..."
        />
      </div>

      {/* Preview */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Preview</h4>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {getPriorityIcon(formData.priority)}
              <span className="font-medium text-gray-900">{formData.title}</span>
            </div>
            {formData.amount && (
              <span className="text-sm text-gray-600">
                ${parseFloat(formData.amount.toString()).toFixed(2)}
              </span>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">
              Due: {formData.dueDate ? new Date(formData.dueDate).toLocaleDateString() : 'Not set'}
            </div>
            {formData.isRecurring && (
              <div className="text-xs text-blue-600">
                Repeats {formData.recurringPattern}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? 'Saving...' : (reminder ? 'Update Reminder' : 'Create Reminder')}
        </button>
      </div>
    </form>
  )
}
