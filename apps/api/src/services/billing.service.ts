import Stripe from 'stripe';
import { db, users, eq } from '@covet/db';
import { createLogger } from '@covet/shared/logger';
import { config } from '../config.js';
import { AppError } from '../middleware/errorHandler.js';
import { getStripePrices, getPlanFromPriceId } from '../config/stripe.js';
import type { PlanTier } from '@covet/shared';

const log = createLogger('api:billing');

/** In Stripe SDK v20+, current_period_end moved from Subscription to SubscriptionItem */
function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): Date {
  const periodEnd = subscription.items.data[0]?.current_period_end;
  return periodEnd ? new Date(periodEnd * 1000) : new Date();
}

/** Extract subscription ID from an invoice (Stripe SDK v20+ uses parent.subscription_details) */
function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const sub = invoice.parent?.subscription_details?.subscription;
  if (!sub) return null;
  return typeof sub === 'string' ? sub : sub.id;
}

function getStripe(): Stripe {
  if (!config.stripeSecretKey) {
    throw new AppError(501, 'Stripe billing is not configured');
  }
  return new Stripe(config.stripeSecretKey);
}

// ---------------------------------------------------------------------------
// Stripe Customer (lazy creation)
// ---------------------------------------------------------------------------

export async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) throw new AppError(404, 'User not found');
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { userId: user.id },
  });

  await db.update(users).set({
    stripeCustomerId: customer.id,
    updatedAt: new Date(),
  }).where(eq(users.id, userId));

  return customer.id;
}

// ---------------------------------------------------------------------------
// Checkout Session
// ---------------------------------------------------------------------------

export async function createCheckoutSession(
  userId: string,
  plan: Exclude<PlanTier, 'free'>,
  interval: 'monthly' | 'annual'
): Promise<string> {
  const stripe = getStripe();

  // Check for existing subscription
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user) throw new AppError(404, 'User not found');
  if (user.stripeSubscriptionId) {
    throw new AppError(409, 'You already have an active subscription. Use the billing portal to change plans.');
  }

  const customerId = await getOrCreateStripeCustomer(userId);
  const prices = getStripePrices();
  const priceId = prices[plan][interval];

  if (!priceId) {
    throw new AppError(400, `No price configured for ${plan} ${interval}`);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${config.frontendUrl}/dashboard/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.frontendUrl}/pricing`,
    metadata: { userId, plan },
    subscription_data: {
      metadata: { userId, plan },
    },
  });

  if (!session.url) {
    throw new AppError(500, 'Failed to create checkout session');
  }

  return session.url;
}

// ---------------------------------------------------------------------------
// Customer Portal
// ---------------------------------------------------------------------------

export async function createPortalSession(userId: string): Promise<string> {
  const stripe = getStripe();

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user) throw new AppError(404, 'User not found');
  if (!user.stripeCustomerId) {
    throw new AppError(400, 'No billing account found. Subscribe to a plan first.');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${config.frontendUrl}/dashboard/billing`,
  });

  return session.url;
}

// ---------------------------------------------------------------------------
// Billing Status
// ---------------------------------------------------------------------------

export async function getBillingStatus(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user) throw new AppError(404, 'User not found');

  return {
    plan: user.plan,
    hasSubscription: !!user.stripeSubscriptionId,
    cancelAtPeriodEnd: user.stripeCancelAtPeriodEnd,
    currentPeriodEnd: user.stripeCurrentPeriodEnd?.toISOString() ?? null,
  };
}

// ---------------------------------------------------------------------------
// Webhook Event Processing
// ---------------------------------------------------------------------------

export function constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
  const stripe = getStripe();
  if (!config.stripeWebhookSecret) {
    throw new AppError(501, 'Stripe webhook secret is not configured');
  }
  return stripe.webhooks.constructEvent(rawBody, signature, config.stripeWebhookSecret);
}

export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const subscriptionId = session.subscription as string;

      if (!userId || !subscriptionId) {
        log.warn({ sessionId: session.id }, 'Checkout session missing userId or subscriptionId');
        break;
      }

      const stripe = getStripe();
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0]?.price.id;
      if (!priceId) break;

      const plan = getPlanFromPriceId(priceId);
      if (!plan) {
        log.warn({ priceId }, 'Unknown Stripe price ID');
        break;
      }

      await db.update(users).set({
        plan,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscriptionId,
        stripeCurrentPeriodEnd: getSubscriptionPeriodEnd(subscription),
        stripeCancelAtPeriodEnd: subscription.cancel_at_period_end,
        updatedAt: new Date(),
      }).where(eq(users.id, userId));

      log.info({ userId, plan, subscriptionId }, 'Subscription created via checkout');
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const priceId = subscription.items.data[0]?.price.id;

      const user = await db.query.users.findFirst({
        where: eq(users.stripeCustomerId, customerId),
      });
      if (!user) {
        log.warn({ customerId }, 'Subscription updated for unknown customer');
        break;
      }

      const plan = priceId ? getPlanFromPriceId(priceId) : null;

      await db.update(users).set({
        ...(plan && subscription.status === 'active' ? { plan } : {}),
        stripeCurrentPeriodEnd: getSubscriptionPeriodEnd(subscription),
        stripeCancelAtPeriodEnd: subscription.cancel_at_period_end,
        updatedAt: new Date(),
      }).where(eq(users.id, user.id));

      log.info({ userId: user.id, plan, cancelAtPeriodEnd: subscription.cancel_at_period_end }, 'Subscription updated');
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const user = await db.query.users.findFirst({
        where: eq(users.stripeCustomerId, customerId),
      });
      if (!user) break;

      await db.update(users).set({
        plan: 'free',
        stripeSubscriptionId: null,
        stripeCurrentPeriodEnd: null,
        stripeCancelAtPeriodEnd: false,
        updatedAt: new Date(),
      }).where(eq(users.id, user.id));

      log.info({ userId: user.id }, 'Subscription deleted, downgraded to free');
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      log.warn({ customerId: invoice.customer, invoiceId: invoice.id }, 'Payment failed');
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const subscriptionId = getSubscriptionIdFromInvoice(invoice);
      if (!subscriptionId) break;

      const stripe = getStripe();
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      const user = await db.query.users.findFirst({
        where: eq(users.stripeCustomerId, customerId),
      });
      if (!user) break;

      await db.update(users).set({
        stripeCurrentPeriodEnd: getSubscriptionPeriodEnd(subscription),
        updatedAt: new Date(),
      }).where(eq(users.id, user.id));

      log.info({ userId: user.id }, 'Invoice paid, period end updated');
      break;
    }

    default:
      log.debug({ eventType: event.type }, 'Unhandled Stripe event');
  }
}
