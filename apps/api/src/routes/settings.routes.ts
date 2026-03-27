import { Router, type Router as RouterType, type Response } from 'express';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.js';
import { getNotificationSettings, updateNotificationSettings } from '../services/user.service.js';

const router: RouterType = Router();

router.use(authenticate);

// GET /settings/notifications
router.get('/notifications', async (req, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const settings = await getNotificationSettings(userId);
  res.json(settings);
});

// PATCH /settings/notifications
router.patch('/notifications', async (req, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const { emailEnabled, emailAddress } = req.body;

  const updates: { emailEnabled?: boolean; emailAddress?: string | null } = {};

  if (typeof emailEnabled === 'boolean') {
    updates.emailEnabled = emailEnabled;
  }
  if (emailAddress !== undefined) {
    updates.emailAddress = emailAddress === '' ? null : emailAddress;
  }

  const settings = await updateNotificationSettings(userId, updates);
  res.json(settings);
});

export default router;
