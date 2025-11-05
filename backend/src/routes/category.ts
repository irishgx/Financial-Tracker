import { Router } from 'express';
import Joi from 'joi';
import { db } from '../db/connection';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getCurrentTimestamp } from '../services/jsonStorage';

const router = Router();

const createCategorySchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: Joi.string().max(50).optional()
});

// Get all categories
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const userCategories = await db.categories.findBy('userId', userId);

    res.json({
      categories: userCategories.map(category => ({
        id: category.id,
        name: category.name,
        color: category.color,
        icon: category.icon,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
      }))
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// Create category
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { error, value } = createCategorySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, color, icon } = value;
    const userId = req.user!.id;

    // Check if category with same name already exists for user
    const existingCategories = await db.categories.findBy('userId', userId);
    if (existingCategories.some(c => c.name === name)) {
      return res.status(409).json({ error: 'Category with this name already exists' });
    }

    const now = getCurrentTimestamp();
    const category = await db.categories.create({
      userId,
      name,
      color: color || undefined,
      icon: icon || undefined,
      createdAt: now,
      updatedAt: now
    });

    res.status(201).json({
      category: {
        id: category.id,
        name: category.name,
        color: category.color,
        icon: category.icon,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
      }
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const categoryId = req.params.id;
    const userId = req.user!.id;

    const { error, value } = createCategorySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const category = await db.categories.findById(categoryId);
    if (!category || category.userId !== userId) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const { name, color, icon } = value;

    // Check if another category with same name already exists (excluding current one)
    const existingCategories = await db.categories.findBy('userId', userId);
    if (existingCategories.some(c => c.name === name && c.id !== categoryId)) {
      return res.status(409).json({ error: 'Category with this name already exists' });
    }

    const now = getCurrentTimestamp();
    const updated = await db.categories.update(categoryId, {
      name,
      color: color || undefined,
      icon: icon || undefined,
      updatedAt: now
    });

    res.json({
      category: {
        id: updated.id,
        name: updated.name,
        color: updated.color,
        icon: updated.icon,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt
      }
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const categoryId = req.params.id;
    const userId = req.user!.id;

    const category = await db.categories.findById(categoryId);
    if (!category || category.userId !== userId) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await db.categories.delete(categoryId);

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export { router as categoryRoutes };