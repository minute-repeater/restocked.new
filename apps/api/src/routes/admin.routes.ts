import { Router, type Router as RouterType } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { getOverviewStats, getUsers, getTopProducts, getSystemHealth } from '../services/admin.service.js';

const router: RouterType = Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// GET /admin/stats/overview
router.get('/stats/overview', async (req, res, next) => {
  try {
    const stats = await getOverviewStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// GET /admin/stats/users?search=&page=1&limit=20
router.get('/stats/users', async (req, res, next) => {
  try {
    const search = req.query.search as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const result = await getUsers(search, page, limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /admin/stats/products?page=1&limit=20
router.get('/stats/products', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const result = await getTopProducts(page, limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /admin/stats/health
router.get('/stats/health', async (req, res, next) => {
  try {
    const health = await getSystemHealth();
    res.json(health);
  } catch (error) {
    next(error);
  }
});

export default router;
