import { useState, useEffect } from 'react'
import { Plus, Bell, Calendar, BarChart3, FileText, Filter } from 'lucide-react'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ReminderForm } from '../components/ReminderForm'
import { ReminderTemplates } from '../components/ReminderTemplates'
import { ReminderAnalytics } from '../components/ReminderAnalytics'
import { EnhancedReminderList } from '../components/EnhancedReminderList'
import { api } from '../services/api'
import toast from 'react-hot-toast'

interface Reminder {
  id: string
  title: string
  amount?: number
  dueDate: string
  category?: string
  priority?: 'high' | 'medium' | 'low'
  isRecurring: boolean
  recurringFrequency?: string
  recurringPattern?: string
  notes?: string
  description?: string
  status?: 'upcoming' | 'overdue' | 'paid'
  isCompleted?: boolean
  createdAt: string
  updatedAt: string
}

export function RemindersPage() {
  const [loading, setLoading] = useState(true)
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [showReminderForm, setShowReminderForm] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [editingReminder, setEditingReminder] = useState<Reminder | undefined>()
  const [viewMode, setViewMode] = useState<'list' | 'analytics'>('list')

  useEffect(() => {
    loadReminders()
  }, [])

  const loadReminders = async () => {
    try {
      setLoading(true)
      const response = await api.get('/reminders')
      // Map backend data to frontend format
      const mappedReminders = (response.data.reminders || []).map((r: any) => ({
        ...r,
        status: r.isCompleted ? 'paid' : (new Date(r.dueDate) < new Date() ? 'overdue' : 'upcoming'),
        recurringPattern: r.recurringFrequency, // Map for compatibility
        category: r.category || 'other',
        priority: r.priority || 'medium'
      }))
      setReminders(mappedReminders)
    } catch (error) {
      console.error('Error loading reminders:', error)
      toast.error('Failed to load reminders')
    } finally {
      setLoading(false)
    }
  }

  const handleReminderAdded = () => {
    loadReminders()
    setShowReminderForm(false)
    setEditingReminder(undefined)
  }

  const handleEditReminder = (reminder: Reminder) => {
    setEditingReminder(reminder)
    setShowReminderForm(true)
  }

  const handleDeleteReminder = async (reminderId: string) => {
    if (!confirm('Are you sure you want to delete this reminder?')) {
      return
    }

    try {
      await api.delete(`/reminders/${reminderId}`)
      toast.success('Reminder deleted successfully')
      loadReminders()
    } catch (error) {
      toast.error('Failed to delete reminder')
      console.error('Error deleting reminder:', error)
    }
  }

  const handleMarkAsPaid = async (reminderId: string) => {
    try {
      await api.put(`/reminders/${reminderId}`, { isCompleted: true })
      toast.success('Reminder marked as paid')
      loadReminders()
    } catch (error) {
      toast.error('Failed to update reminder')
      console.error('Error updating reminder:', error)
    }
  }

  const handleSnoozeReminder = async (reminderId: string) => {
    try {
      // Snooze for 1 day
      const newDueDate = new Date()
      newDueDate.setDate(newDueDate.getDate() + 1)
      
      await api.put(`/reminders/${reminderId}`, { 
        dueDate: newDueDate.toISOString()
      })
      toast.success('Reminder snoozed for 1 day')
      loadReminders()
    } catch (error) {
      toast.error('Failed to snooze reminder')
      console.error('Error snoozing reminder:', error)
    }
  }

  const handleSelectTemplate = async (template: any) => {
    try {
      // Calculate next due date based on recurring pattern
      const today = new Date()
      let dueDate = new Date(today)
      
      switch (template.recurringPattern) {
        case 'daily':
          dueDate.setDate(today.getDate() + 1)
          break
        case 'weekly':
          dueDate.setDate(today.getDate() + 7)
          break
        case 'monthly':
          dueDate.setMonth(today.getMonth() + 1)
          break
        case 'quarterly':
          dueDate.setMonth(today.getMonth() + 3)
          break
        case 'yearly':
          dueDate.setFullYear(today.getFullYear() + 1)
          break
        default:
          dueDate.setMonth(today.getMonth() + 1)
      }

      // Map quarterly to monthly (or handle as needed)
      const recurringFrequency = template.recurringPattern === 'quarterly' 
        ? 'monthly' 
        : template.recurringPattern

      const reminderData = {
        title: template.title,
        description: template.description,
        amount: template.amount,
        dueDate: dueDate.toISOString(),
        isRecurring: true,
        recurringFrequency: recurringFrequency
      }

      await api.post('/reminders', reminderData)
      toast.success(`Reminder "${template.title}" created successfully!`)
      setShowTemplates(false)
      loadReminders()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create reminder from template')
      console.error('Error creating reminder from template:', error)
    }
  }

  const getUpcomingCount = () => {
    const now = new Date()
    return reminders.filter(r => {
      const dueDate = new Date(r.dueDate)
      return dueDate > now && !r.isCompleted
    }).length
  }

  const getOverdueCount = () => {
    const now = new Date()
    return reminders.filter(r => {
      const dueDate = new Date(r.dueDate)
      return dueDate < now && !r.isCompleted
    }).length
  }

  const getTotalValue = () => {
    return reminders.reduce((sum, r) => sum + (r.amount || 0), 0)
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="px-1 sm:px-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reminders</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            Manage your bills, subscriptions, and recurring payments
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowTemplates(true)}
            className="btn btn-secondary flex items-center text-sm sm:text-base px-3 sm:px-4 py-2 touch-manipulation"
          >
            <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
            <span className="hidden sm:inline">Templates</span>
            <span className="sm:hidden">Templates</span>
          </button>
          <button
            onClick={() => setShowReminderForm(true)}
            className="btn btn-primary flex items-center text-sm sm:text-base px-3 sm:px-4 py-2 touch-manipulation"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
            <span>Add Reminder</span>
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500">Upcoming</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-600 mt-0.5 sm:mt-1">{getUpcomingCount()}</p>
            </div>
            <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0 ml-2" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500">Overdue</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600 mt-0.5 sm:mt-1">{getOverdueCount()}</p>
            </div>
            <Bell className="h-6 w-6 sm:h-8 sm:w-8 text-red-600 flex-shrink-0 ml-2" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500">Total Value</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5 sm:mt-1 break-words">
                ${getTotalValue().toFixed(0)}
              </p>
            </div>
            <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-gray-600 flex-shrink-0 ml-2" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500">All Reminders</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5 sm:mt-1">{reminders.length}</p>
            </div>
            <Bell className="h-6 w-6 sm:h-8 sm:w-8 text-gray-600 flex-shrink-0 ml-2" />
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setViewMode('list')}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors touch-manipulation ${
              viewMode === 'list'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-500 hover:text-gray-700 bg-gray-100 sm:bg-transparent'
            }`}
          >
            <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline sm:mr-2" />
            <span className="ml-1 sm:ml-0">List</span>
            <span className="hidden sm:inline ml-1">View</span>
          </button>
          <button
            onClick={() => setViewMode('analytics')}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors touch-manipulation ${
              viewMode === 'analytics'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-500 hover:text-gray-700 bg-gray-100 sm:bg-transparent'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline sm:mr-2" />
            <span className="ml-1 sm:ml-0">Analytics</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'list' ? (
        <EnhancedReminderList
          reminders={reminders}
          onEdit={handleEditReminder}
          onDelete={handleDeleteReminder}
          onMarkAsPaid={handleMarkAsPaid}
          onSnooze={handleSnoozeReminder}
        />
      ) : (
        <ReminderAnalytics reminders={reminders} />
      )}

      {/* Empty State */}
      {reminders.length === 0 && (
        <div className="text-center py-8 sm:py-12 px-4">
          <div className="text-gray-400 mb-3 sm:mb-4">
            <Bell className="mx-auto h-10 w-10 sm:h-12 sm:w-12" />
          </div>
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No reminders yet</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-6 px-2">
            Create reminders for your bills and recurring payments to stay on top of your finances
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={() => setShowReminderForm(true)}
              className="btn btn-primary flex items-center justify-center text-sm sm:text-base px-4 py-2 touch-manipulation"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span>Add Reminder</span>
            </button>
            <button
              onClick={() => setShowTemplates(true)}
              className="btn btn-secondary flex items-center justify-center text-sm sm:text-base px-4 py-2 touch-manipulation"
            >
              <FileText className="h-4 w-4 mr-2" />
              <span>Browse Templates</span>
            </button>
          </div>
        </div>
      )}

      {/* Reminder Form Modal */}
      {showReminderForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                {editingReminder ? 'Edit Reminder' : 'Add Reminder'}
              </h2>
              <button
                onClick={() => {
                  setShowReminderForm(false)
                  setEditingReminder(undefined)
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors touch-manipulation p-1 text-2xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <ReminderForm
              onSuccess={handleReminderAdded}
              onCancel={() => {
                setShowReminderForm(false)
                setEditingReminder(undefined)
              }}
              reminder={editingReminder}
            />
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <ReminderTemplates
              onSelectTemplate={handleSelectTemplate}
              onClose={() => setShowTemplates(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}