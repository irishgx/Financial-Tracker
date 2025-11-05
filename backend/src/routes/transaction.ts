import { Router } from 'express';
import Joi from 'joi';
import { db } from '../db/connection';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getCurrentTimestamp } from '../services/jsonStorage';

const router = Router();

const createTransactionSchema = Joi.object({
  accountId: Joi.string().required(),
  categoryId: Joi.string().optional(),
  amount: Joi.number().required(),
  description: Joi.string().min(1).required(),
  merchant: Joi.string().max(255).optional(),
  date: Joi.date().required(),
  type: Joi.string().valid('income', 'expense', 'transfer').required()
});

// Get transactions
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const accountId = req.query.accountId as string;
    const categoryId = req.query.categoryId as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    let userTransactions = await db.transactions.findBy('userId', userId);

    // Apply filters
    if (accountId) {
      userTransactions = userTransactions.filter(t => t.accountId === accountId);
    }
    if (categoryId) {
      userTransactions = userTransactions.filter(t => t.categoryId === categoryId);
    }
    if (startDate) {
      userTransactions = userTransactions.filter(t => t.date >= startDate);
    }
    if (endDate) {
      userTransactions = userTransactions.filter(t => t.date <= endDate);
    }

    // Sort by date descending
    userTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const total = userTransactions.length;
    const totalPages = Math.ceil(total / limit);
    const transactions = userTransactions.slice(offset, offset + limit);

    // Get account and category names
    const accounts = await db.accounts.findAll();
    const categories = await db.categories.findAll();

    res.json({
      transactions: transactions.map(transaction => {
        const account = accounts.find(a => a.id === transaction.accountId);
        const category = categories.find(c => c.id === transaction.categoryId);
        
        return {
          id: transaction.id,
          accountId: transaction.accountId,
          accountName: account?.name || 'Unknown Account',
          categoryId: transaction.categoryId,
          categoryName: category?.name,
          categoryColor: category?.color,
          amount: transaction.amount,
          description: transaction.description,
          merchant: transaction.merchant,
          date: transaction.date,
          type: transaction.type,
          status: transaction.status,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

// Create transaction
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { error, value } = createTransactionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { accountId, categoryId, amount, description, merchant, date, type } = value;
    const userId = req.user!.id;

    // Verify account belongs to user
    const account = await db.accounts.findById(accountId);
    if (!account || account.userId !== userId) {
      return res.status(400).json({ error: 'Account not found' });
    }

    // Verify category belongs to user if provided
    if (categoryId) {
      const category = await db.categories.findById(categoryId);
      if (!category || category.userId !== userId) {
        return res.status(400).json({ error: 'Category not found' });
      }
    }

    const now = getCurrentTimestamp();
    const transaction = await db.transactions.create({
      userId,
      accountId,
      categoryId: categoryId || undefined,
      amount,
      description,
      merchant: merchant || undefined,
      date: date.toISOString().split('T')[0],
      type,
      status: 'confirmed',
      createdAt: now,
      updatedAt: now
    });

    res.status(201).json({
      transaction: {
        id: transaction.id,
        accountId: transaction.accountId,
        categoryId: transaction.categoryId,
        amount: transaction.amount,
        description: transaction.description,
        merchant: transaction.merchant,
        date: transaction.date,
        type: transaction.type,
        status: transaction.status,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt
      }
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// Delete transaction
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const transactionId = req.params.id;
    const userId = req.user!.id;

    const transaction = await db.transactions.findById(transactionId);
    if (!transaction || transaction.userId !== userId) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await db.transactions.delete(transactionId);
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

export { router as transactionRoutes };