import { Router } from 'express';
import Joi from 'joi';
import { db } from '../db/connection';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getCurrentTimestamp } from '../services/jsonStorage';

const router = Router();

const createAccountSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  type: Joi.string().valid('checking', 'savings', 'credit', 'investment', 'loan', 'other').required(),
  balance: Joi.number().default(0)
});

// Get all accounts
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const userAccounts = await db.accounts.findBy('userId', userId);

    res.json({
      accounts: userAccounts.map(account => ({
        id: account.id,
        name: account.name,
        type: account.type,
        balance: account.balance,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt
      }))
    });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ error: 'Failed to get accounts' });
  }
});

// Create account
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { error, value } = createAccountSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, type, balance } = value;
    const userId = req.user!.id;

    const now = getCurrentTimestamp();
    const account = await db.accounts.create({
      userId,
      name,
      type,
      balance: balance || 0,
      createdAt: now,
      updatedAt: now
    });

    res.status(201).json({
      account: {
        id: account.id,
        name: account.name,
        type: account.type,
        balance: account.balance,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt
      }
    });
  } catch (error) {
    console.error('Create account error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

export { router as accountRoutes };