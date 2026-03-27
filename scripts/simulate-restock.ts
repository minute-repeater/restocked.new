#!/usr/bin/env node
/**
 * Stock Change Simulator — fakes a stock/price change in the DB to test notifications.
 *
 * Usage:
 *   npx tsx scripts/simulate-restock.ts --tracked-item-id=UUID --scenario=back-in-stock
 *   npx tsx scripts/simulate-restock.ts --tracked-item-id=UUID --scenario=price-drop
 *   npx tsx scripts/simulate-restock.ts --tracked-item-id=UUID --scenario=target-hit
 *   npx tsx scripts/simulate-restock.ts --list                  # show all tracked items
 *
 * Options:
 *   --send-email    Actually send the notification email (requires RESEND_API_KEY)
 *   --list          List all active tracked items with their IDs
 */

import {
  db,
  trackedItems,
  products,
  stockChecks,
  users,
  eq,
  and,
  desc,
  isNull,
} from '@covet/db';
import { getNotificationType, type ProductToCheck } from '../apps/worker/src/jobs/stockChecker.js';

// ── Helpers ────────────────────────────────────────────────────────────────
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

function formatPrice(cents: number | null): string {
  if (cents === null) return 'n/a';
  return `$${(cents / 100).toFixed(2)}`;
}

function parseArgs(): { trackedItemId?: string; scenario?: string; sendEmail: boolean; list: boolean } {
  const args = process.argv.slice(2);
  let trackedItemId: string | undefined;
  let scenario: string | undefined;
  let sendEmail = false;
  let list = false;

  for (const arg of args) {
    if (arg.startsWith('--tracked-item-id=')) trackedItemId = arg.split('=')[1];
    else if (arg.startsWith('--scenario=')) scenario = arg.split('=')[1];
    else if (arg === '--send-email') sendEmail = true;
    else if (arg === '--list') list = true;
  }

  return { trackedItemId, scenario, sendEmail, list };
}

// ── List tracked items ─────────────────────────────────────────────────────
async function listTrackedItems(): Promise<void> {
  const items = await db
    .select({
      trackedItemId: trackedItems.id,
      productName: products.name,
      productUrl: products.url,
      userId: users.id,
      userEmail: users.email,
      targetPrice: trackedItems.targetPrice,
      isActive: trackedItems.isActive,
    })
    .from(trackedItems)
    .innerJoin(products, eq(trackedItems.productId, products.id))
    .innerJoin(users, eq(trackedItems.userId, users.id))
    .where(eq(trackedItems.isActive, true));

  if (items.length === 0) {
    console.log(`\n${YELLOW}No active tracked items found.${RESET}`);
    console.log('Add a product via the web app or API first.\n');
    return;
  }

  console.log(`\n${BOLD}Active Tracked Items (${items.length})${RESET}\n`);
  console.log('  ID'.padEnd(40) + 'Product'.padEnd(35) + 'User'.padEnd(30) + 'Target Price');
  console.log('  ' + '─'.repeat(120));

  for (const item of items) {
    const name = (item.productName || item.productUrl).substring(0, 32);
    console.log(
      `  ${item.trackedItemId}  ${name.padEnd(35)}${item.userEmail.padEnd(30)}${formatPrice(item.targetPrice)}`
    );
  }

  console.log(`\n${DIM}Use --tracked-item-id=<ID> --scenario=<scenario> to simulate a change${RESET}\n`);
}

// ── Simulate scenarios ─────────────────────────────────────────────────────
interface SimulationResult {
  scenario: string;
  previousState: { inStock: boolean | null; price: number | null };
  currentState: { inStock: boolean; price: number | null };
  notificationType: string | null;
  wouldNotify: boolean;
}

async function simulate(trackedItemId: string, scenario: string, sendEmail: boolean): Promise<void> {
  // Fetch tracked item with product and user details
  const [item] = await db
    .select({
      trackedItemId: trackedItems.id,
      productId: trackedItems.productId,
      variantId: trackedItems.variantId,
      targetPrice: trackedItems.targetPrice,
      productUrl: products.url,
      productName: products.name,
      userId: users.id,
      userEmail: users.email,
    })
    .from(trackedItems)
    .innerJoin(products, eq(trackedItems.productId, products.id))
    .innerJoin(users, eq(trackedItems.userId, users.id))
    .where(eq(trackedItems.id, trackedItemId));

  if (!item) {
    console.error(`${RED}✗ Tracked item not found: ${trackedItemId}${RESET}`);
    process.exit(1);
  }

  console.log(`\n${BOLD}Simulating: ${scenario}${RESET}`);
  console.log(`${DIM}Product: ${item.productName || item.productUrl}${RESET}`);
  console.log(`${DIM}User: ${item.userEmail}${RESET}`);
  console.log(`${DIM}Target price: ${formatPrice(item.targetPrice)}${RESET}\n`);

  // Get current last stock check
  const [currentLastCheck] = await db
    .select()
    .from(stockChecks)
    .where(
      and(
        eq(stockChecks.productId, item.productId),
        item.variantId
          ? eq(stockChecks.variantId, item.variantId)
          : isNull(stockChecks.variantId)
      )
    )
    .orderBy(desc(stockChecks.checkedAt))
    .limit(1);

  let previousState: { inStock: boolean; price: number | null };
  let currentState: { inStock: boolean; price: number | null };

  switch (scenario) {
    case 'back-in-stock':
      previousState = { inStock: false, price: currentLastCheck?.price ?? 5000 };
      currentState = { inStock: true, price: currentLastCheck?.price ?? 5000 };
      break;

    case 'price-drop':
      previousState = { inStock: true, price: 10000 }; // $100
      currentState = { inStock: true, price: 9200 };   // $92 (8% drop)
      break;

    case 'target-hit': {
      const target = item.targetPrice ?? 5000;
      previousState = { inStock: true, price: Math.round(target * 1.15) }; // 15% above target
      currentState = { inStock: true, price: Math.round(target * 0.95) };  // 5% below target
      break;
    }

    default:
      console.error(`${RED}✗ Unknown scenario: ${scenario}${RESET}`);
      console.log('Available: back-in-stock, price-drop, target-hit');
      process.exit(1);
  }

  // Step 1: Insert the "previous" state
  console.log(`${CYAN}Step 1:${RESET} Inserting previous state...`);
  console.log(`  inStock: ${previousState.inStock ? GREEN + 'true' : RED + 'false'}${RESET}, price: ${formatPrice(previousState.price)}`);

  await db.insert(stockChecks).values({
    productId: item.productId,
    variantId: item.variantId,
    inStock: previousState.inStock,
    price: previousState.price,
    currency: 'USD',
    checkedAt: new Date(Date.now() - 60000), // 1 minute ago
  });

  // Step 2: Build the ProductToCheck as the worker would see it
  const productToCheck: ProductToCheck = {
    productId: item.productId,
    productUrl: item.productUrl,
    productName: item.productName,
    variantId: item.variantId,
    trackedItemId: item.trackedItemId,
    userId: item.userId,
    userEmail: item.userEmail,
    targetPrice: item.targetPrice,
    lastInStock: previousState.inStock,
    lastPrice: previousState.price,
  };

  // Step 3: Check notification logic
  console.log(`\n${CYAN}Step 2:${RESET} Checking current state...`);
  console.log(`  inStock: ${currentState.inStock ? GREEN + 'true' : RED + 'false'}${RESET}, price: ${formatPrice(currentState.price)}`);

  const notificationType = getNotificationType(productToCheck, {
    inStock: currentState.inStock,
    price: currentState.price,
  });

  // Step 4: Insert the "current" state
  console.log(`\n${CYAN}Step 3:${RESET} Inserting current state into stock_checks...`);
  await db.insert(stockChecks).values({
    productId: item.productId,
    variantId: item.variantId,
    inStock: currentState.inStock,
    price: currentState.price,
    currency: 'USD',
  });

  // Step 5: Report
  console.log(`\n${BOLD}═══ RESULT ═══${RESET}`);
  if (notificationType) {
    console.log(`${GREEN}✓ Notification would fire: ${BOLD}${notificationType}${RESET}`);

    if (notificationType === 'price_drop' && previousState.price && currentState.price) {
      const drop = ((previousState.price - currentState.price) / previousState.price * 100).toFixed(1);
      console.log(`  ${DIM}Price dropped ${drop}%: ${formatPrice(previousState.price)} → ${formatPrice(currentState.price)}${RESET}`);
    }
    if (notificationType === 'price_target_hit') {
      console.log(`  ${DIM}Target: ${formatPrice(item.targetPrice)}, Current: ${formatPrice(currentState.price)}${RESET}`);
    }

    if (sendEmail) {
      console.log(`\n${YELLOW}--send-email flag detected. Sending actual notification...${RESET}`);
      // Dynamically import to avoid loading Resend when not needed
      try {
        const { sendEmailNotification } = await import('../apps/worker/src/notifications/email.js');
        const payload = {
          type: notificationType,
          productName: item.productName || 'Product',
          productUrl: item.productUrl,
          imageUrl: null as string | null,
          previousPrice: previousState.price,
          currentPrice: currentState.price,
          targetPrice: item.targetPrice,
        };
        const success = await sendEmailNotification(item.userEmail, payload);
        if (success) {
          console.log(`${GREEN}✓ Email sent to ${item.userEmail}${RESET}`);
        } else {
          console.log(`${RED}✗ Email failed to send${RESET}`);
        }
      } catch (err) {
        console.log(`${RED}✗ Email error: ${err instanceof Error ? err.message : err}${RESET}`);
        console.log(`${DIM}Make sure RESEND_API_KEY is set in .env${RESET}`);
      }
    } else {
      console.log(`\n${DIM}Add --send-email to actually send the notification email${RESET}`);
    }
  } else {
    console.log(`${YELLOW}○ No notification triggered for this scenario${RESET}`);
    console.log(`${DIM}This means the notification logic did not detect a qualifying change${RESET}`);
  }

  console.log();
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const { trackedItemId, scenario, sendEmail, list } = parseArgs();

  if (list || (!trackedItemId && !scenario)) {
    await listTrackedItems();
    process.exit(0);
  }

  if (!trackedItemId) {
    console.error(`${RED}✗ --tracked-item-id is required${RESET}`);
    console.log('Run with --list to see available tracked items');
    process.exit(1);
  }

  if (!scenario) {
    console.error(`${RED}✗ --scenario is required${RESET}`);
    console.log('Available: back-in-stock, price-drop, target-hit');
    process.exit(1);
  }

  await simulate(trackedItemId, scenario, sendEmail);
  process.exit(0);
}

main().catch((err) => {
  console.error(`${RED}Fatal error:${RESET}`, err);
  process.exit(1);
});
