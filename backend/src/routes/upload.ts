import { Router } from 'express';
import multer from 'multer';
import Joi from 'joi';
import { db } from '../db/connection';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getCurrentTimestamp } from '../services/jsonStorage';
import { FileParser } from '../services/fileParser';
import { logSecurityEvent } from '../middleware/securityLogger';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/pdf',
      'application/x-pdf',
      'application/vnd.ofx',
      'application/x-ofx'
    ];
    
    // Validate file extension as well (mimetype can be spoofed)
    const allowedExtensions = ['.csv', '.xls', '.xlsx', '.pdf', '.ofx'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      logSecurityEvent(req, 'suspicious_activity', { 
        reason: 'Invalid file type upload attempt',
        filename: file.originalname,
        mimetype: file.mimetype,
        extension: fileExtension
      });
      cb(new Error('Invalid file type. Only CSV, Excel, PDF, and OFX files are allowed.'));
    }
  }
});

// Direct file upload and parsing
router.post('/parse', authenticateToken, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user!.id;
    const file = req.file;

    // Additional security checks
    // Check for potentially dangerous file names
    if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
      logSecurityEvent(req, 'suspicious_activity', { 
        reason: 'Suspicious filename detected',
        filename: file.originalname,
        userId
      });
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Log file upload for security monitoring
    logSecurityEvent(req, 'file_upload', {
      userId,
      filename: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype
    });

    const now = getCurrentTimestamp();
    
    // Create upload record
    const uploadRecord = await db.uploads.create({
      userId,
      filename: file.originalname,
      originalName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      s3Key: `local-${Date.now()}-${file.originalname}`,
      status: 'processing',
      createdAt: now,
      updatedAt: now
    });

    // Handle different file types
    const isCSV = file.mimetype === 'text/csv';
    const isExcel = file.mimetype.includes('excel') || 
                    file.mimetype === 'application/vnd.ms-excel' ||
                    file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const isPDF = file.mimetype === 'application/pdf' || file.mimetype === 'application/x-pdf';
    const isOFX = file.mimetype === 'application/vnd.ofx' || file.mimetype === 'application/x-ofx';

    if (isCSV || isExcel) {
      // Parse CSV/Excel files
      const parseResult = await FileParser.parseCSV(file.buffer);

      // Update upload status
      await db.uploads.update(uploadRecord.id, {
        status: 'completed',
        updatedAt: getCurrentTimestamp()
      });

      // Create parse job record - store ALL transactions, not just preview
      const parseJob = await db.parseJobs.create({
        uploadId: uploadRecord.id,
        userId,
        status: 'completed',
        progress: 100,
        totalTransactions: parseResult.totalCount,
        parsedTransactions: parseResult.transactions.length,
        previewData: {
          transactions: parseResult.transactions.slice(0, 10),
          totalCount: parseResult.totalCount,
          errors: parseResult.errors,
          hasMore: parseResult.transactions.length > 10
        },
        // Store ALL transactions for full access
        allTransactions: parseResult.transactions,
        createdAt: now,
        updatedAt: now
      });

      res.json({
        message: 'File parsed successfully',
        parseJobId: parseJob.id,
        uploadId: uploadRecord.id,
        previewData: parseJob.previewData,
        totalTransactions: parseResult.transactions.length,
        errors: parseResult.errors
      });
    } else if (isPDF) {
      // Parse PDF files
      const parseResult = await FileParser.parsePDF(file.buffer);

      // Update upload status
      await db.uploads.update(uploadRecord.id, {
        status: 'completed',
        updatedAt: getCurrentTimestamp()
      });

      // Create parse job record - store ALL transactions, not just preview
      const parseJob = await db.parseJobs.create({
        uploadId: uploadRecord.id,
        userId,
        status: parseResult.transactions.length > 0 ? 'completed' : 'error',
        progress: parseResult.transactions.length > 0 ? 100 : 0,
        totalTransactions: parseResult.totalCount,
        parsedTransactions: parseResult.transactions.length,
        errorMessage: parseResult.transactions.length === 0 ? parseResult.errors.join('; ') : undefined,
        previewData: {
          transactions: parseResult.transactions.slice(0, 10),
          totalCount: parseResult.totalCount,
          errors: parseResult.errors,
          hasMore: parseResult.transactions.length > 10
        },
        // Store ALL transactions for full access
        allTransactions: parseResult.transactions,
        createdAt: now,
        updatedAt: now
      });

      res.json({
        message: parseResult.transactions.length > 0 
          ? 'File parsed successfully' 
          : 'PDF uploaded but no transactions could be extracted',
        parseJobId: parseJob.id,
        uploadId: uploadRecord.id,
        previewData: parseJob.previewData,
        totalTransactions: parseResult.transactions.length,
        errors: parseResult.errors
      });
    } else if (isOFX) {
      // OFX parsing not yet implemented
      await db.uploads.update(uploadRecord.id, {
        status: 'completed',
        updatedAt: getCurrentTimestamp()
      });

      const parseJob = await db.parseJobs.create({
        uploadId: uploadRecord.id,
        userId,
        status: 'error',
        progress: 0,
        totalTransactions: 0,
        parsedTransactions: 0,
        errorMessage: 'OFX parsing is not yet implemented. The file has been uploaded successfully.',
        previewData: {
          transactions: [],
          totalCount: 0,
          errors: ['OFX parsing is not yet implemented'],
          hasMore: false
        },
        createdAt: now,
        updatedAt: now
      });

      res.json({
        message: 'File uploaded successfully. OFX parsing is not yet implemented.',
        parseJobId: parseJob.id,
        uploadId: uploadRecord.id,
        previewData: parseJob.previewData,
        totalTransactions: 0,
        errors: ['OFX parsing is not yet implemented']
      });
    } else {
      await db.uploads.update(uploadRecord.id, {
        status: 'error',
        updatedAt: getCurrentTimestamp()
      });

      return res.status(400).json({ 
        error: 'Unsupported file type. Please upload a CSV, Excel, PDF, or OFX file.' 
      });
    }
  } catch (error: any) {
    console.error('File parsing error:', error);
    res.status(500).json({ error: 'Failed to parse file' });
  }
});

// Get parse job status
router.get('/parse-jobs/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const parseJobId = req.params.id;
    const userId = req.user!.id;
    const includeAllTransactions = req.query.all === 'true';

    const parseJob = await db.parseJobs.findById(parseJobId);
    if (!parseJob || parseJob.userId !== userId) {
      return res.status(404).json({ error: 'Parse job not found' });
    }

    const upload = await db.uploads.findById(parseJob.uploadId);

    // Include all transactions if requested
    const allTransactions = (parseJob as any).allTransactions || [];

    res.json({
      parseJob: {
        id: parseJob.id,
        status: parseJob.status,
        progress: parseJob.progress,
        totalTransactions: parseJob.totalTransactions,
        parsedTransactions: parseJob.parsedTransactions,
        errorMessage: parseJob.errorMessage,
        previewData: parseJob.previewData,
        // Include all transactions if requested
        ...(includeAllTransactions && allTransactions.length > 0 ? { allTransactions } : {}),
        upload: upload ? {
          filename: upload.filename,
          originalName: upload.originalName,
          fileSize: upload.fileSize,
          mimeType: upload.mimeType
        } : null,
        createdAt: parseJob.createdAt,
        updatedAt: parseJob.updatedAt
      }
    });
  } catch (error) {
    console.error('Get parse job error:', error);
    res.status(500).json({ error: 'Failed to get parse job' });
  }
});

// Confirm parsed transactions
router.post('/parse-jobs/:id/confirm', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const parseJobId = req.params.id;
    const userId = req.user!.id;
    const { transactions } = req.body;

    if (!Array.isArray(transactions)) {
      return res.status(400).json({ error: 'Transactions array is required' });
    }

    // Verify parse job belongs to user
    const parseJob = await db.parseJobs.findById(parseJobId);
    if (!parseJob || parseJob.userId !== userId) {
      return res.status(404).json({ error: 'Parse job not found' });
    }

    if (parseJob.status !== 'completed') {
      return res.status(400).json({ error: 'Parse job is not completed' });
    }

    // Get or create default account
    const userAccounts = await db.accounts.findBy('userId', userId);
    let account = userAccounts[0];
    if (!account) {
      const now = getCurrentTimestamp();
      account = await db.accounts.create({
        userId,
        name: 'Main Account',
        type: 'checking',
        balance: 0,
        createdAt: now,
        updatedAt: now
      });
    }

    // Create transactions
    const now = getCurrentTimestamp();
    const createdTransactions = [];
    
    for (const transaction of transactions) {
      const created = await db.transactions.create({
        userId,
        accountId: account.id,
        amount: transaction.amount,
        description: transaction.description,
        merchant: transaction.merchant,
        date: transaction.date,
        type: transaction.type,
        status: 'confirmed',
        createdAt: now,
        updatedAt: now
      });
      createdTransactions.push(created);
    }

    res.json({
      message: 'Transactions confirmed successfully',
      count: createdTransactions.length
    });
  } catch (error) {
    console.error('Confirm transactions error:', error);
    res.status(500).json({ error: 'Failed to confirm transactions' });
  }
});

// List user uploads
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const allUploads = await db.uploads.findBy('userId', userId);
    const uploads = allUploads.slice(offset, offset + limit);
    const total = allUploads.length;
    const totalPages = Math.ceil(total / limit);

    res.json({
      uploads: uploads.map(upload => ({
        id: upload.id,
        filename: upload.filename,
        originalName: upload.originalName,
        fileSize: upload.fileSize,
        mimeType: upload.mimeType,
        status: upload.status,
        createdAt: upload.createdAt
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('List uploads error:', error);
    res.status(500).json({ error: 'Failed to list uploads' });
  }
});

export { router as uploadRoutes };