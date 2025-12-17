#!/usr/bin/env node
/**
 * Manual Telegram Alert Testing Script
 * 
 * Purpose: Test Telegram restock alerts for specific Shopify products
 * WITHOUT affecting schedulers, workers, or database.
 * 
 * This script:
 * - Fetches product data directly from Shopify product.js endpoints
 * - Checks stock status via variant.available
 * - Sends Telegram alerts for in-stock items
 * - Logs results without DB writes
 * 
 * Usage:
 *   npm run build
 *   node dist/scripts/telegram.js
 * 
 * Requirements:
 *   TELEGRAM_BOT_TOKEN - Bot token from @BotFather
 *   TELEGRAM_CHAT_ID - Your Telegram chat ID
 * 
 * NOTE: This is a MANUAL testing tool. It does NOT affect:
 * - Scheduled tracking jobs
 * - Database records
 * - Production alerts
 */

import "dotenv/config";
import { sendRestockAlert } from "../src/services/telegramService.js";

// ============================================================================
// Test Product URLs
// ============================================================================

const TEST_URLS = [
  "https://www.driesvannoten.com/en-gb/collections/discovery-and-travel-sets/products/001-099053-set3?variant=55107449160058",
  "https://cherryla.com/collections/headwear/products/bucking-dad-hat-beige",
];

// ============================================================================
// Types
// ============================================================================

interface ShopifyVariant {
  id: number;
  title: string;
  available: boolean;
  price: number;
  option1: string | null;
  option2: string | null;
  option3: string | null;
}

interface ShopifyProduct {
  title: string;
  handle: string;
  variants: ShopifyVariant[];
  url: string;
}

interface TestResult {
  url: string;
  productName: string;
  variantId: number | null;
  inStock: boolean;
  telegramSent: boolean;
  error?: string;
}

// ============================================================================
// Shopify Product.js Fetching
// ============================================================================

/**
 * Extract Shopify product handle and variant ID from URL
 * 
 * Examples:
 * - https://store.com/products/handle-name → { handle: "handle-name", variantId: null }
 * - https://store.com/products/handle-name?variant=123 → { handle: "handle-name", variantId: 123 }
 */
function parseShopifyUrl(url: string): { handle: string; variantId: number | null; origin: string } {
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split("/");
  const productsIndex = pathParts.indexOf("products");
  
  if (productsIndex === -1 || !pathParts[productsIndex + 1]) {
    throw new Error(`Invalid Shopify product URL: ${url}`);
  }
  
  const handle = pathParts[productsIndex + 1];
  const variantParam = urlObj.searchParams.get("variant");
  const variantId = variantParam ? parseInt(variantParam, 10) : null;
  
  return {
    handle,
    variantId,
    origin: urlObj.origin,
  };
}

/**
 * Fetch Shopify product.js data
 * 
 * @param origin - Store origin (e.g., https://store.com)
 * @param handle - Product handle (e.g., "bucket-hat")
 * @returns Shopify product data
 */
async function fetchShopifyProduct(origin: string, handle: string): Promise<ShopifyProduct> {
  const productJsonUrl = `${origin}/products/${handle}.js`;
  
  console.log(`  Fetching: ${productJsonUrl}`);
  
  const response = await fetch(productJsonUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Restocked/1.0; +https://restocked.now)",
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch product.js: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json() as ShopifyProduct;
  return data;
}

/**
 * Check stock status for a product
 * 
 * @param url - Full product URL
 * @returns Stock check result
 */
async function checkProductStock(url: string): Promise<{
  productName: string;
  variantId: number;
  inStock: boolean;
}> {
  const { handle, variantId: targetVariantId, origin } = parseShopifyUrl(url);
  const product = await fetchShopifyProduct(origin, handle);
  
  // Find target variant
  let variant: ShopifyVariant;
  
  if (targetVariantId) {
    // Specific variant requested
    const found = product.variants.find((v) => v.id === targetVariantId);
    if (!found) {
      throw new Error(`Variant ${targetVariantId} not found in product ${product.handle}`);
    }
    variant = found;
  } else {
    // No variant specified - use first variant
    if (product.variants.length === 0) {
      throw new Error(`Product ${product.handle} has no variants`);
    }
    variant = product.variants[0];
  }
  
  const productName = variant.title !== "Default Title"
    ? `${product.title} - ${variant.title}`
    : product.title;
  
  return {
    productName,
    variantId: variant.id,
    inStock: variant.available,
  };
}

// ============================================================================
// Main Test Function
// ============================================================================

async function testTelegramAlerts(): Promise<void> {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("Manual Telegram Alert Testing");
  console.log("═══════════════════════════════════════════════════════════\n");
  
  // Verify Telegram is configured
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error("❌ TELEGRAM_BOT_TOKEN not set");
    process.exit(1);
  }
  
  if (!process.env.TELEGRAM_CHAT_ID) {
    console.error("❌ TELEGRAM_CHAT_ID not set");
    process.exit(1);
  }
  
  console.log("✓ Telegram configured");
  console.log(`  Token: ${process.env.TELEGRAM_BOT_TOKEN.slice(0, 4)}...${process.env.TELEGRAM_BOT_TOKEN.slice(-4)}`);
  console.log(`  Chat ID: ${process.env.TELEGRAM_CHAT_ID}\n`);
  
  const results: TestResult[] = [];
  
  // Test each product
  for (const url of TEST_URLS) {
    console.log(`─────────────────────────────────────────────────────────────`);
    console.log(`Testing: ${url}\n`);
    
    try {
      const stockCheck = await checkProductStock(url);
      
      console.log(`  Product: ${stockCheck.productName}`);
      console.log(`  Variant ID: ${stockCheck.variantId}`);
      console.log(`  Stock Status: ${stockCheck.inStock ? "✅ IN STOCK" : "❌ OUT OF STOCK"}`);
      
      if (stockCheck.inStock) {
        console.log(`  Sending Telegram alert...`);
        const success = await sendRestockAlert(
          stockCheck.productName,
          url,
          99 // High confidence for manual test
        );
        
        if (success) {
          console.log(`  ✅ Telegram alert sent\n`);
          results.push({
            url,
            productName: stockCheck.productName,
            variantId: stockCheck.variantId,
            inStock: true,
            telegramSent: true,
          });
        } else {
          console.log(`  ❌ Telegram alert failed\n`);
          results.push({
            url,
            productName: stockCheck.productName,
            variantId: stockCheck.variantId,
            inStock: true,
            telegramSent: false,
            error: "Telegram send failed",
          });
        }
      } else {
        console.log(`  ⏭️  Skipped (out of stock)\n`);
        results.push({
          url,
          productName: stockCheck.productName,
          variantId: stockCheck.variantId,
          inStock: false,
          telegramSent: false,
        });
      }
    } catch (error) {
      console.error(`  ❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
      results.push({
        url,
        productName: "Unknown",
        variantId: null,
        inStock: false,
        telegramSent: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  
  // Summary
  console.log("═══════════════════════════════════════════════════════════");
  console.log("Test Summary");
  console.log("═══════════════════════════════════════════════════════════\n");
  
  const telegramSentCount = results.filter((r) => r.telegramSent).length;
  const inStockCount = results.filter((r) => r.inStock).length;
  const errorCount = results.filter((r) => r.error).length;
  
  console.log(`Total products tested: ${results.length}`);
  console.log(`In stock: ${inStockCount}`);
  console.log(`Telegram alerts sent: ${telegramSentCount}`);
  console.log(`Errors: ${errorCount}\n`);
  
  if (errorCount > 0) {
    console.log("Errors:");
    results.filter((r) => r.error).forEach((r) => {
      console.log(`  - ${r.url}: ${r.error}`);
    });
    console.log();
  }
  
  console.log("═══════════════════════════════════════════════════════════\n");
}

// Run the test
testTelegramAlerts().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
