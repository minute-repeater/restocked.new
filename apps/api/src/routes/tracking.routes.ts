import { Router, type Router as RouterType, type Request } from 'express';
import { z } from 'zod';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.js';
import {
  addTrackedItem,
  getTrackedItems,
  getTrackedItemById,
  getStockHistory,
  getItemNotifications,
  updateTrackedItem,
  deleteTrackedItem,
} from '../services/tracking.service.js';
import { isValidProductUrl } from '@restocked/shared';
import { AppError } from '../middleware/errorHandler.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

const addItemSchema = z.object({
  url: z.string().refine(isValidProductUrl, 'Invalid product URL'),
  targetPrice: z.number().positive().optional(),
  variantId: z.string().uuid().optional(),
});

const updateItemSchema = z.object({
  targetPrice: z.number().positive().nullable().optional(),
  isActive: z.boolean().optional(),
});

// GET /tracking - Get all tracked items for user
router.get('/', async (req, res, next) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const items = await getTrackedItems(userId);

    res.json({ items });
  } catch (error) {
    next(error);
  }
});

// POST /tracking - Add a new tracked item
router.post('/', async (req, res, next) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { url, targetPrice, variantId } = addItemSchema.parse(req.body);

    const item = await addTrackedItem(userId, url, targetPrice, variantId);

    res.status(201).json({ item });
  } catch (error) {
    next(error);
  }
});

// GET /tracking/:id/history - Get stock check history
router.get('/:id/history', async (req: Request<{ id: string }>, res, next) => {
  try {
    const { userId } = req as unknown as AuthenticatedRequest;
    const { id } = req.params;

    const checks = await getStockHistory(userId, id);

    res.json({ checks });
  } catch (error) {
    next(error);
  }
});

// GET /tracking/:id/notifications - Get notification log
router.get('/:id/notifications', async (req: Request<{ id: string }>, res, next) => {
  try {
    const { userId } = req as unknown as AuthenticatedRequest;
    const { id } = req.params;

    const notifications = await getItemNotifications(userId, id);

    res.json({ notifications });
  } catch (error) {
    next(error);
  }
});

// GET /tracking/:id - Get single item with full detail
router.get('/:id', async (req: Request<{ id: string }>, res, next) => {
  try {
    const { userId } = req as unknown as AuthenticatedRequest;
    const { id } = req.params;

    const detail = await getTrackedItemById(userId, id);

    res.json(detail);
  } catch (error) {
    next(error);
  }
});

// PATCH /tracking/:id - Update a tracked item
router.patch('/:id', async (req: Request<{ id: string }>, res, next) => {
  try {
    const { userId } = req as unknown as AuthenticatedRequest;
    const { id } = req.params;
    const updates = updateItemSchema.parse(req.body);

    if (Object.keys(updates).length === 0) {
      throw new AppError(400, 'No valid updates provided');
    }

    const item = await updateTrackedItem(userId, id, updates);

    res.json({ item });
  } catch (error) {
    next(error);
  }
});

// DELETE /tracking/:id - Remove a tracked item
router.delete('/:id', async (req: Request<{ id: string }>, res, next) => {
  try {
    const { userId } = req as unknown as AuthenticatedRequest;
    const { id } = req.params;

    await deleteTrackedItem(userId, id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
