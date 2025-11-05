import { useState, useEffect } from 'react'
import { Plus, Tag, Edit3, Trash2, TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { CategoryForm } from '../components/CategoryForm'
import { 
  listCategories, 
  deleteCategory, 
  ensureDefaultCategories,
  Category 
} from '../services/accountsStore'
import toast from 'react-hot-toast'

export function CategoriesPage() {
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  useEffect(() => {
    // Ensure defaults are seeded
    ensureDefaultCategories()
    loadCategories()
  }, [])

  const loadCategories = () => {
    try {
      setLoading(true)
      const allCategories = listCategories()
      setCategories(allCategories)
    } catch (error) {
      console.error('Error loading categories:', error)
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCategory = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    if (!category) return

    // Special warning for default categories
    const message = category.isDefault
      ? `This is a default category. You can hide or rename it, but deleting will remove it permanently. Continue?`
      : 'Are you sure you want to delete this category?'
    
    if (!confirm(message)) {
      return
    }

    try {
      if (deleteCategory(categoryId)) {
        toast.success('Category deleted successfully')
        loadCategories()
      } else {
        toast.error('Failed to delete category')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete category')
      console.error('Error deleting category:', error)
    }
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setShowCategoryForm(true)
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
          <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
          <p className="mt-2 text-gray-600">
            Organize your transactions with categories
          </p>
        </div>
        <button 
          onClick={() => {
            setEditingCategory(null)
            setShowCategoryForm(true)
          }}
          className="btn btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          <span>Add Category</span>
        </button>
      </div>

      {categories.length > 0 ? (
        <div className="space-y-6">
          {/* Income Categories */}
          {categories.filter(c => c.type === 'income').length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">Income</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.filter(c => c.type === 'income').map((category) => (
                  <div key={category.id} className="card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div 
                            className="h-8 w-8 rounded-full flex items-center justify-center"
                            style={{ 
                              backgroundColor: `${category.color}20`,
                              color: category.color
                            }}
                          >
                            <Tag className="h-4 w-4" />
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">{category.name}</p>
                            {category.isDefault && (
                              <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">Income</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleEditCategory(category)}
                          className="text-gray-400 hover:text-gray-600"
                          title="Edit category"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-gray-400 hover:text-red-600"
                          title="Delete category"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expense Categories */}
          {categories.filter(c => c.type === 'expense').length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="h-5 w-5 text-red-600" />
                <h2 className="text-lg font-semibold text-gray-900">Expenses</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.filter(c => c.type === 'expense').map((category) => (
                  <div key={category.id} className="card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div 
                            className="h-8 w-8 rounded-full flex items-center justify-center"
                            style={{ 
                              backgroundColor: `${category.color}20`,
                              color: category.color
                            }}
                          >
                            <Tag className="h-4 w-4" />
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">{category.name}</p>
                            {category.isDefault && (
                              <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">Expense</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleEditCategory(category)}
                          className="text-gray-400 hover:text-gray-600"
                          title="Edit category"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-gray-400 hover:text-red-600"
                          title="Delete category"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transfer Categories */}
          {categories.filter(c => c.type === 'transfer').length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ArrowLeftRight className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Transfers</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.filter(c => c.type === 'transfer').map((category) => (
                  <div key={category.id} className="card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div 
                            className="h-8 w-8 rounded-full flex items-center justify-center"
                            style={{ 
                              backgroundColor: `${category.color}20`,
                              color: category.color
                            }}
                          >
                            <Tag className="h-4 w-4" />
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">{category.name}</p>
                            {category.isDefault && (
                              <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">Transfer</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleEditCategory(category)}
                          className="text-gray-400 hover:text-gray-600"
                          title="Edit category"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-gray-400 hover:text-red-600"
                          title="Delete category"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Tag className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No categories yet</h3>
            <p className="text-gray-600 mb-6">
              Create categories to organize your transactions
            </p>
            <button 
              onClick={() => {
                setEditingCategory(null)
                setShowCategoryForm(true)
              }}
              className="btn btn-primary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span>Add Category</span>
            </button>
          </div>
        </div>
      )}

      {/* Category Form Modal */}
      {showCategoryForm && (
        <CategoryForm
          isOpen={showCategoryForm}
          onClose={() => {
            setShowCategoryForm(false)
            setEditingCategory(null)
          }}
          onSuccess={() => {
            loadCategories()
            setShowCategoryForm(false)
            setEditingCategory(null)
          }}
          editingCategory={editingCategory}
        />
      )}
    </div>
  )
}
