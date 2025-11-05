import { Router } from 'express';
import Joi from 'joi';
import { db } from '../db/connection';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getCurrentTimestamp } from '../services/jsonStorage';

const router = Router();

const createReminderSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).optional(),
  amount: Joi.number().positive().optional(),
  dueDate: Joi.date().required(),
  isRecurring: Joi.boolean().default(false),
  recurringFrequency: Joi.string().valid('daily', 'weekly', 'monthly', 'quarterly', 'yearly').when('isRecurring', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional()
  })
});

const updateReminderSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(1000).optional(),
  amount: Joi.number().positive().optional(),
  dueDate: Joi.date().optional(),
  isRecurring: Joi.boolean().optional(),
  recurringFrequency: Joi.string().valid('daily', 'weekly', 'monthly', 'quarterly', 'yearly').optional()
});

// Get all reminders
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const showCompleted = req.query.showCompleted === 'true';
    
    let userReminders = await db.reminders.findBy('userId', userId);
    
    if (!showCompleted) {
      userReminders = userReminders.filter(r => !r.isCompleted);
    }

    // Sort by due date
    userReminders.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    res.json({
      reminders: userReminders.map(reminder => ({
        id: reminder.id,
        title: reminder.title,
        description: reminder.description,
        amount: reminder.amount,
        dueDate: reminder.dueDate,
        isRecurring: reminder.isRecurring,
        recurringFrequency: reminder.recurringFrequency,
        isCompleted: reminder.isCompleted,
        createdAt: reminder.createdAt,
        updatedAt: reminder.updatedAt
      }))
    });
  } catch (error) {
    console.error('Get reminders error:', error);
    res.status(500).json({ error: 'Failed to get reminders' });
  }
});

// Create reminder
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { error, value } = createReminderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { title, description, amount, dueDate, isRecurring, recurringFrequency } = value;
    const userId = req.user!.id;

    const now = getCurrentTimestamp();
    const reminder = await db.reminders.create({
      userId,
      title,
      description: description || undefined,
      amount: amount || undefined,
      dueDate: dueDate.toISOString().split('T')[0],
      isRecurring,
      recurringFrequency: recurringFrequency || undefined,
      isCompleted: false,
      createdAt: now,
      updatedAt: now
    });

    res.status(201).json({
      reminder: {
        id: reminder.id,
        title: reminder.title,
        description: reminder.description,
        amount: reminder.amount,
        dueDate: reminder.dueDate,
        isRecurring: reminder.isRecurring,
        recurringFrequency: reminder.recurringFrequency,
        isCompleted: reminder.isCompleted,
        createdAt: reminder.createdAt,
        updatedAt: reminder.updatedAt
      }
    });
  } catch (error) {
    console.error('Create reminder error:', error);
    res.status(500).json({ error: 'Failed to create reminder' });
  }
});

// Update reminder
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const reminderId = req.params.id;
    const userId = req.user!.id;

    const { error, value } = updateReminderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const reminder = await db.reminders.findById(reminderId);
    if (!reminder || reminder.userId !== userId) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    const updateData: any = {
      updatedAt: getCurrentTimestamp()
    };

    if (value.title !== undefined) updateData.title = value.title;
    if (value.description !== undefined) updateData.description = value.description;
    if (value.amount !== undefined) updateData.amount = value.amount;
    if (value.dueDate !== undefined) updateData.dueDate = value.dueDate.toISOString().split('T')[0];
    if (value.isRecurring !== undefined) updateData.isRecurring = value.isRecurring;
    if (value.recurringFrequency !== undefined) updateData.recurringFrequency = value.recurringFrequency;

    const updated = await db.reminders.update(reminderId, updateData);

    res.json({
      reminder: {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        amount: updated.amount,
        dueDate: updated.dueDate,
        isRecurring: updated.isRecurring,
        recurringFrequency: updated.recurringFrequency,
        isCompleted: updated.isCompleted,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt
      }
    });
  } catch (error) {
    console.error('Update reminder error:', error);
    res.status(500).json({ error: 'Failed to update reminder' });
  }
});

// Delete reminder
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const reminderId = req.params.id;
    const userId = req.user!.id;

    const reminder = await db.reminders.findById(reminderId);
    if (!reminder || reminder.userId !== userId) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    await db.reminders.delete(reminderId);

    res.json({ message: 'Reminder deleted successfully' });
  } catch (error) {
    console.error('Delete reminder error:', error);
    res.status(500).json({ error: 'Failed to delete reminder' });
  }
});

export { router as reminderRoutes };