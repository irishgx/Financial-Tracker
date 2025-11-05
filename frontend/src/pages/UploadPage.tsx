import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import { Upload, File, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { api } from '../services/api'
import { toast } from 'react-hot-toast'
import { clsx } from 'clsx'

interface UploadStatus {
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  message: string
  uploadId?: string
  parseJobId?: string
}

export function UploadPage() {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: 'idle',
    progress: 0,
    message: ''
  })
  const navigate = useNavigate()

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    // Validate file type (check both MIME type and file extension as fallback)
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/pdf',
      'application/x-pdf',
      'application/vnd.ofx',
      'application/x-ofx'
    ]
    
    // Also check file extension as fallback (some browsers may report different MIME types)
    const fileExtension = file.name.toLowerCase().split('.').pop()
    const allowedExtensions = ['csv', 'xls', 'xlsx', 'pdf', 'ofx']

    // Accept file if MIME type is allowed OR file extension is allowed
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension || '')) {
      toast.error('Invalid file type. Please upload a CSV, Excel, PDF, or OFX file.')
      return
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size too large. Please upload a file smaller than 10MB.')
      return
    }

    try {
      setUploadStatus({
        status: 'uploading',
        progress: 50,
        message: 'Processing file...'
      })

      // Create FormData for file upload
      const formData = new FormData()
      formData.append('file', file)

      // Upload and parse file directly
      const response = await api.post('/uploads/parse', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      const { parseJobId, previewData, totalTransactions, errors } = response.data

      // Check if there are errors or no transactions found
      const hasErrors = errors && errors.length > 0
      const noTransactions = totalTransactions === 0

      if (hasErrors || noTransactions) {
        // Show warning if PDF parsing had issues
        const errorMessage = hasErrors ? errors.join(' ') : 'No transactions found in the file.'
        
        if (file.type === 'application/pdf' || file.type === 'application/x-pdf') {
          toast.error(`PDF processed, but ${errorMessage}`, {
            duration: 6000
          })
        } else {
          toast.error(errorMessage, {
            duration: 6000
          })
        }
      } else {
        toast.success(`File processed successfully! Found ${totalTransactions} transactions.`)
      }

      setUploadStatus({
        status: 'completed',
        progress: 100,
        message: noTransactions 
          ? (hasErrors ? 'File processed with errors' : 'No transactions found')
          : 'File processed successfully!',
        parseJobId
      })

      // Still navigate to review page so user can see what was found (or not found)
      navigate(`/review/${parseJobId}`)

    } catch (error: any) {
      setUploadStatus({
        status: 'error',
        progress: 0,
        message: error.response?.data?.error || 'Upload failed'
      })
      toast.error(error.response?.data?.error || 'Upload failed')
    }
  }, [navigate])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/pdf': ['.pdf'],
      'application/x-pdf': ['.pdf'],
      'application/vnd.ofx': ['.ofx'],
      'application/x-ofx': ['.ofx']
    },
    multiple: false,
    disabled: uploadStatus.status === 'uploading' || uploadStatus.status === 'processing'
  })

  const resetUpload = () => {
    setUploadStatus({
      status: 'idle',
      progress: 0,
      message: ''
    })
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload Bank Statement</h1>
        <p className="mt-2 text-gray-600">
          Upload your bank statement in CSV, Excel, PDF, or OFX format to automatically import transactions.
        </p>
      </div>

      <div className="card">
        {uploadStatus.status === 'idle' && (
          <div
            {...getRootProps()}
            className={clsx(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              isDragActive
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-gray-400'
            )}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <p className="text-lg font-medium text-gray-900">
                {isDragActive ? 'Drop the file here' : 'Drag & drop your file here'}
              </p>
              <p className="mt-2 text-sm text-gray-600">
                or click to browse files
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Supports CSV, Excel, PDF, and OFX files up to 10MB
              </p>
            </div>
          </div>
        )}

        {(uploadStatus.status === 'uploading' || uploadStatus.status === 'processing') && (
          <div className="text-center py-8">
            <Loader2 className="mx-auto h-12 w-12 text-primary-600 animate-spin" />
            <div className="mt-4">
              <p className="text-lg font-medium text-gray-900">{uploadStatus.message}</p>
              <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadStatus.progress}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-gray-600">
                {Math.round(uploadStatus.progress)}% complete
              </p>
            </div>
          </div>
        )}

        {uploadStatus.status === 'completed' && (
          <div className="text-center py-8">
            <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
            <div className="mt-4">
              <p className="text-lg font-medium text-gray-900">Upload completed!</p>
              <p className="mt-2 text-sm text-gray-600">
                Your file has been processed successfully. You can now review the imported transactions.
              </p>
              <div className="mt-6 flex justify-center space-x-4">
                <button
                  onClick={() => navigate(`/review/${uploadStatus.parseJobId}`)}
                  className="btn btn-primary"
                >
                  Review Transactions
                </button>
                <button
                  onClick={resetUpload}
                  className="btn btn-secondary"
                >
                  Upload Another File
                </button>
              </div>
            </div>
          </div>
        )}

        {uploadStatus.status === 'error' && (
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-red-600" />
            <div className="mt-4">
              <p className="text-lg font-medium text-gray-900">Upload failed</p>
              <p className="mt-2 text-sm text-gray-600">{uploadStatus.message}</p>
              <div className="mt-6">
                <button
                  onClick={resetUpload}
                  className="btn btn-primary"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Supported File Formats</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <File className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">CSV Files</p>
              <p className="text-xs text-gray-500">Comma-separated values</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <File className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">Excel Files</p>
              <p className="text-xs text-gray-500">.xls and .xlsx</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <File className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">PDF Files</p>
              <p className="text-xs text-gray-500">Bank statements</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <File className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">OFX Files</p>
              <p className="text-xs text-gray-500">Open Financial Exchange</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
