import { Router, type Router as RouterType } from 'express';
import { createLogger } from '@covet/shared/logger';
import { constructWebhookEvent, handleWebhookEvent } from '../services/billing.service.js';

const log = createLogger('api:webhook');
const router: RouterType = Router();

// POST /webhooks/stripe
// Note: This route receives raw body (express.raw) — registered before express.json() in server.ts
router.post('/', async (req, res) => {
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }

  let event;
  try {
    event = constructWebhookEvent(req.body, signature);
  } catch (err) {
    log.error({ err }, 'Webhook signature verification failed');
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  try {
    await handleWebhookEvent(event);
  } catch (err) {
    // Return 200 to prevent Stripe from retrying — log and investigate later
    log.error({ err, eventType: event.type }, 'Webhook processing failed');
  }

  res.json({ received: true });
});

export default router;
