import { useState } from 'react'
import { Trash2, Edit, Download, Tag, Building, MoreHorizontal } from 'lucide-react'
import toast from 'react-hot-toast'

interface BulkOperationsProps {
  selectedCount: number
  onBulkDelete: () => void
  onBulkEdit: () => void
  onBulkExport: () => void
  onBulkCategorize: () => void
  onBulkChangeAccount: () => void
  onClearSelection: () => void
}

export function BulkOperations({
  selectedCount,
  onBulkDelete,
  onBulkEdit,
  onBulkExport,
  onBulkCategorize,
  onBulkChangeAccount,
  onClearSelection
}: BulkOperationsProps) {
  const [showMenu, setShowMenu] = useState(false)

  if (selectedCount === 0) return null

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedCount} transactions?`)) {
      onBulkDelete()
    }
  }

  return (
    <div className="bg-gradient-to-r from-primary-50 to-primary-100 border-2 border-primary-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0">
          <div className="bg-primary-600 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 rounded-full whitespace-nowrap shadow-sm">
            {selectedCount} {selectedCount === 1 ? 'selected' : 'selected'}
          </div>
          <span className="text-xs sm:text-sm text-primary-800 font-medium">
            Choose an action to apply
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onClearSelection}
            className="text-xs sm:text-sm text-primary-600 hover:text-primary-800 transition-colors touch-manipulation px-2 py-1"
          >
            Clear
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 sm:p-2 text-primary-600 hover:text-primary-800 transition-colors touch-manipulation"
              aria-label="More options"
            >
              <MoreHorizontal className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 sm:w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <div className="py-1">
                  <button
                    onClick={() => {
                      onBulkEdit()
                      setShowMenu(false)
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors touch-manipulation"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Selected
                  </button>
                  
                  <button
                    onClick={() => {
                      onBulkCategorize()
                      setShowMenu(false)
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors touch-manipulation"
                  >
                    <Tag className="h-4 w-4" />
                    Change Category
                  </button>
                  
                  <button
                    onClick={() => {
                      onBulkChangeAccount()
                      setShowMenu(false)
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors touch-manipulation"
                  >
                    <Building className="h-4 w-4" />
                    Change Account
                  </button>
                  
                  <button
                    onClick={() => {
                      onBulkExport()
                      setShowMenu(false)
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors touch-manipulation"
                  >
                    <Download className="h-4 w-4" />
                    Export Selected
                  </button>
                  
                  <hr className="my-1" />
                  
                  <button
                    onClick={() => {
                      handleBulkDelete()
                      setShowMenu(false)
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors touch-manipulation"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Selected
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <button
          onClick={onBulkEdit}
          className="btn btn-sm btn-secondary flex items-center justify-center text-xs sm:text-sm px-3 py-2 touch-manipulation hover:shadow-sm transition-all duration-200"
        >
          <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
          <span>Edit</span>
        </button>
        
        <button
          onClick={onBulkExport}
          className="btn btn-sm btn-secondary flex items-center justify-center text-xs sm:text-sm px-3 py-2 touch-manipulation hover:shadow-sm transition-all duration-200"
        >
          <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
          <span>Export</span>
        </button>
        
        <button
          onClick={handleBulkDelete}
          className="btn btn-sm btn-danger flex items-center justify-center text-xs sm:text-sm px-3 py-2 touch-manipulation hover:shadow-sm transition-all duration-200"
        >
          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  )
}
