import { useState } from 'react'
import { 
  Home, 
  Smartphone, 
  PiggyBank, 
  TrendingUp, 
  Shield, 
  Zap, 
  FileText,
  Plus,
  Check
} from 'lucide-react'

interface ReminderTemplate {
  id: string
  title: string
  category: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  amount?: number
  recurringPattern: string
  priority: 'high' | 'medium' | 'low'
  description: string
}

interface ReminderTemplatesProps {
  onSelectTemplate: (template: ReminderTemplate) => void
  onClose: () => void
}

export function ReminderTemplates({ onSelectTemplate, onClose }: ReminderTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  const templates: ReminderTemplate[] = [
    {
      id: 'rent',
      title: 'Rent Payment',
      category: 'bills',
      icon: Home,
      color: 'bg-blue-500',
      amount: 1200,
      recurringPattern: 'monthly',
      priority: 'high',
      description: 'Monthly rent payment reminder'
    },
    {
      id: 'netflix',
      title: 'Netflix Subscription',
      category: 'subscriptions',
      icon: Smartphone,
      color: 'bg-red-500',
      amount: 15.99,
      recurringPattern: 'monthly',
      priority: 'low',
      description: 'Monthly Netflix subscription'
    },
    {
      id: 'savings',
      title: 'Emergency Fund',
      category: 'savings',
      icon: PiggyBank,
      color: 'bg-green-500',
      amount: 500,
      recurringPattern: 'monthly',
      priority: 'high',
      description: 'Monthly emergency fund contribution'
    },
    {
      id: 'investment',
      title: 'Investment Contribution',
      category: 'investments',
      icon: TrendingUp,
      color: 'bg-purple-500',
      amount: 1000,
      recurringPattern: 'monthly',
      priority: 'medium',
      description: 'Monthly investment contribution'
    },
    {
      id: 'insurance',
      title: 'Car Insurance',
      category: 'insurance',
      icon: Shield,
      color: 'bg-yellow-500',
      amount: 150,
      recurringPattern: 'monthly',
      priority: 'high',
      description: 'Monthly car insurance payment'
    },
    {
      id: 'electricity',
      title: 'Electricity Bill',
      category: 'utilities',
      icon: Zap,
      color: 'bg-orange-500',
      amount: 120,
      recurringPattern: 'monthly',
      priority: 'medium',
      description: 'Monthly electricity bill payment'
    },
    {
      id: 'phone',
      title: 'Phone Bill',
      category: 'utilities',
      icon: Smartphone,
      color: 'bg-indigo-500',
      amount: 80,
      recurringPattern: 'monthly',
      priority: 'medium',
      description: 'Monthly phone bill payment'
    },
    {
      id: 'gym',
      title: 'Gym Membership',
      category: 'subscriptions',
      icon: FileText,
      color: 'bg-pink-500',
      amount: 50,
      recurringPattern: 'monthly',
      priority: 'low',
      description: 'Monthly gym membership fee'
    }
  ]

  const handleSelectTemplate = (template: ReminderTemplate) => {
    setSelectedTemplate(template.id)
    setTimeout(() => {
      onSelectTemplate(template)
    }, 200)
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

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Reminder Templates</h3>
          <p className="text-sm text-gray-500">
            Choose from common reminder templates to get started quickly
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          ×
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => {
          const Icon = template.icon
          const isSelected = selectedTemplate === template.id
          
          return (
            <button
              key={template.id}
              onClick={() => handleSelectTemplate(template)}
              className={`p-4 border rounded-lg text-left transition-all hover:shadow-md ${
                isSelected 
                  ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${template.color}`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                {isSelected && (
                  <Check className="h-5 w-5 text-primary-600" />
                )}
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">{template.title}</h4>
                <p className="text-sm text-gray-600">{template.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(template.priority)}`}>
                      {template.priority}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">
                      {template.recurringPattern}
                    </span>
                  </div>
                  
                  {template.amount && (
                    <span className="text-sm font-medium text-gray-900">
                      ${template.amount.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Plus className="h-4 w-4" />
          <span>Don't see what you need? You can create a custom reminder instead.</span>
        </div>
      </div>
    </div>
  )
}
