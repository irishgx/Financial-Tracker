import { useState } from 'react'
import { 
  Bell, 
  Calendar, 
  DollarSign, 
  Tag, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  Clock,
  AlertTriangle,
  Repeat,
  MoreHorizontal,
  Filter,
  Search
} from 'lucide-react'

interface Reminder {
  id: string
  title: string
  amount?: number
  dueDate: string
  category?: string
  priority?: 'high' | 'medium' | 'low'
  isRecurring: boolean
  recurringPattern?: string
  recurringFrequency?: string
  notes?: string
  description?: string
  status?: 'upcoming' | 'overdue' | 'paid'
  isCompleted?: boolean
  createdAt: string
  updatedAt: string
}

interface EnhancedReminderListProps {
  reminders: Reminder[]
  onEdit: (reminder: Reminder) => void
  onDelete: (reminderId: string) => void
  onMarkAsPaid: (reminderId: string) => void
  onSnooze: (reminderId: string) => void
}

export function EnhancedReminderList({
  reminders,
  onEdit,
  onDelete,
  onMarkAsPaid,
  onSnooze
}: EnhancedReminderListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'overdue' | 'paid'>('all')
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'amount' | 'title'>('dueDate')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100'
      case 'medium':
        return 'text-yellow-600 bg-yellow-100'
      case 'low':
        return 'text-green-600 bg-green-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusForReminder = (reminder: Reminder) => {
    if (reminder.isCompleted || reminder.status === 'paid') return 'paid'
    const daysUntilDue = getDaysUntilDue(reminder.dueDate)
    if (daysUntilDue < 0) return 'overdue'
    return 'upcoming'
  }

  const getStatusColor = (reminder: Reminder) => {
    const status = getStatusForReminder(reminder)
    const daysUntilDue = getDaysUntilDue(reminder.dueDate)
    
    if (status === 'paid') return 'text-green-600 bg-green-100'
    if (status === 'overdue' || daysUntilDue < 0) return 'text-red-600 bg-red-100'
    if (daysUntilDue <= 3) return 'text-orange-600 bg-orange-100'
    return 'text-blue-600 bg-blue-100'
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'bills':
        return '🏠'
      case 'subscriptions':
        return '📱'
      case 'savings':
        return '💰'
      case 'investments':
        return '📈'
      case 'insurance':
        return '🛡️'
      case 'utilities':
        return '⚡'
      default:
        return '📝'
    }
  }

  const filteredAndSortedReminders = reminders
    .filter(reminder => {
      const matchesSearch = reminder.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (reminder.category || '').toLowerCase().includes(searchTerm.toLowerCase())
      
      const reminderStatus = getStatusForReminder(reminder)
      const matchesStatus = filterStatus === 'all' || reminderStatus === filterStatus
      const matchesPriority = filterPriority === 'all' || reminder.priority === filterPriority
      
      return matchesSearch && matchesStatus && matchesPriority
    })
    .sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'dueDate':
          aValue = new Date(a.dueDate).getTime()
          bValue = new Date(b.dueDate).getTime()
          break
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 }
          aValue = priorityOrder[a.priority]
          bValue = priorityOrder[b.priority]
          break
        case 'amount':
          aValue = a.amount || 0
          bValue = b.amount || 0
          break
        case 'title':
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        default:
          return 0
      }
      
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    })

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDirection('asc')
    }
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 lg:gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search reminders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 text-sm sm:text-base"
            />
          </div>
          
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="input text-sm sm:text-base"
          >
            <option value="all">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="overdue">Overdue</option>
            <option value="paid">Paid</option>
          </select>
          
          {/* Priority Filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as any)}
            className="input text-sm sm:text-base"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Reminders List */}
      <div className="space-y-2 sm:space-y-3">
        {filteredAndSortedReminders.map((reminder) => {
          const daysUntilDue = getDaysUntilDue(reminder.dueDate)
          const isOverdue = daysUntilDue < 0 && !reminder.isCompleted && reminder.status !== 'paid'
          
          return (
            <div
              key={reminder.id}
              className={`bg-white rounded-lg border border-gray-200 p-3 sm:p-4 hover:shadow-md transition-shadow ${
                isOverdue ? 'border-red-200 bg-red-50' : ''
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                  {/* Category Icon */}
                  <div className="text-xl sm:text-2xl flex-shrink-0">
                    {getCategoryIcon(reminder.category)}
                  </div>
                  
                  {/* Reminder Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-1">
                      <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">{reminder.title}</h4>
                      {reminder.isRecurring && (
                        <Repeat className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" title="Recurring" />
                      )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span>{formatDate(reminder.dueDate)}</span>
                        {daysUntilDue >= 0 && (
                          <span className="text-gray-500">({daysUntilDue} days)</span>
                        )}
                      </div>
                      
                      {reminder.amount && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="font-medium">{formatCurrency(reminder.amount)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Status and Priority */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full ${getPriorityColor(reminder.priority)}`}>
                      {reminder.priority}
                    </span>
                    <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full ${getStatusColor(reminder)}`}>
                      {getStatusForReminder(reminder)}
                    </span>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-1 sm:gap-2 sm:ml-4 border-t border-gray-200 sm:border-0 pt-3 sm:pt-0">
                  {!reminder.isCompleted && getStatusForReminder(reminder) !== 'paid' && (
                    <button
                      onClick={() => onMarkAsPaid(reminder.id)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1 text-green-600 hover:text-green-800 hover:bg-green-50 transition-colors py-2 sm:py-1 px-2 sm:px-1 rounded touch-manipulation"
                      title="Mark as paid"
                      aria-label="Mark as paid"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-xs sm:hidden">Mark Paid</span>
                    </button>
                  )}
                  
                  <button
                    onClick={() => onEdit(reminder)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors py-2 sm:py-1 px-2 sm:px-1 rounded touch-manipulation"
                    title="Edit reminder"
                    aria-label="Edit reminder"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span className="text-xs sm:hidden">Edit</span>
                  </button>
                  
                  <button
                    onClick={() => onSnooze(reminder.id)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 transition-colors py-2 sm:py-1 px-2 sm:px-1 rounded touch-manipulation"
                    title="Snooze reminder"
                    aria-label="Snooze reminder"
                  >
                    <Clock className="h-4 w-4" />
                    <span className="text-xs sm:hidden">Snooze</span>
                  </button>
                  
                  <button
                    onClick={() => onDelete(reminder.id)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors py-2 sm:py-1 px-2 sm:px-1 rounded touch-manipulation"
                    title="Delete reminder"
                    aria-label="Delete reminder"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="text-xs sm:hidden">Delete</span>
                  </button>
                </div>
              </div>
              
              {/* Notes */}
              {reminder.notes && (
                <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200">
                  <p className="text-xs sm:text-sm text-gray-600 break-words">{reminder.notes}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredAndSortedReminders.length === 0 && (
        <div className="text-center py-8 sm:py-12 px-4">
          <Bell className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
          <h3 className="mt-2 text-base sm:text-lg font-medium text-gray-900">No reminders found</h3>
          <p className="mt-1 text-sm sm:text-base text-gray-600 px-2">
            {searchTerm || filterStatus !== 'all' || filterPriority !== 'all'
              ? 'Try adjusting your filters or search terms.'
              : 'Create your first reminder to get started.'
            }
          </p>
        </div>
      )}
    </div>
  )
}
