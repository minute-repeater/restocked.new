import { StockStrategy } from "./baseStockStrategy.js";
import { findAll, getAttr } from "../../parser/queryHelpers.js";
import { extractCleanText, normalizeText } from "../../parser/textExtraction.js";
import type {
  StockExtractionContext,
  StockExtractionResult,
  StockStatus,
} from "../stockTypes.js";

/**
 * NotifyMeStockStrategy - High-priority out-of-stock detection for fashion/luxury sites
 * 
 * PRECEDENCE RULES:
 * This strategy runs FIRST (before JSON, DOM, Button strategies) because:
 * 1. Fashion/luxury sites often remove purchase controls entirely when OOS
 * 2. Product JSON may show "in_stock" at product level while specific variants are OOS
 * 3. "Notify me" UI is the clearest signal that an item is unavailable
 * 
 * DETECTION LOGIC:
 * 1. Look for explicit "notify me" / "get notified" CTAs
 * 2. Look for email input fields within notification/availability contexts
 * 3. Look for copy indicating future availability ("when available", "back in stock")
 * 4. Verify NO active purchase CTA exists (Add to Cart/Bag/Basket not present or disabled)
 * 
 * If notify UI is present AND no active purchase CTA exists → OUT_OF_STOCK (high confidence)
 * 
 * VARIANT HANDLING:
 * - This detection applies to the current page state, which reflects the selected variant
 * - URL params like ?variant=... are respected because the page renders variant-specific UI
 */

/**
 * Notify me / waitlist CTA patterns (case-insensitive)
 * These indicate the item is not currently purchasable
 */
const NOTIFY_ME_PATTERNS = [
  /notify\s+me/i,
  /get\s+notified/i,
  /email\s+me\s+when\s+available/i,
  /alert\s+me/i,
  /waitlist/i,
  /wait\s+list/i,
  /join\s+waitlist/i,
  /sign\s+up\s+for\s+alerts/i,
  /register\s+interest/i,
  /register\s+your\s+interest/i,
  /remind\s+me/i,
  /back\s+in\s+stock\s+alert/i,
  /notify\s+when\s+available/i,
  /email\s+when\s+back/i,
];

/**
 * Future availability copy patterns
 * These indicate the item will be available later but isn't now
 */
const FUTURE_AVAILABILITY_PATTERNS = [
  /receive\s+an?\s+email.*(?:when|as\s+soon\s+as).*available/i,
  /we'?ll\s+(?:let\s+you\s+know|notify|email).*(?:when|available)/i,
  /as\s+soon\s+as.*(?:product|item).*available/i,
  /back\s+in\s+stock/i,
  /when\s+(?:it'?s?\s+)?back/i,
  /currently\s+(?:out\s+of\s+stock|unavailable|sold\s+out)/i,
  /temporarily\s+(?:out\s+of\s+stock|unavailable|sold\s+out)/i,
  /this\s+(?:product|item)\s+is\s+(?:currently\s+)?(?:unavailable|sold\s+out)/i,
];

/**
 * Active purchase CTA patterns (case-insensitive)
 * If these exist and are NOT disabled, the item is likely in stock
 */
const PURCHASE_CTA_PATTERNS = [
  /add\s+to\s+(?:cart|bag|basket)/i,
  /buy\s+now/i,
  /purchase/i,
  /checkout/i,
  /shop\s+now/i,
  /order\s+now/i,
];

/**
 * Check if an element is disabled
 */
function isElementDisabled(element: ReturnType<typeof findAll>[0]): boolean {
  const disabled = getAttr(element, "disabled") !== null;
  const ariaDisabled = getAttr(element, "aria-disabled") === "true";
  const dataDisabled = getAttr(element, "data-disabled") === "true";
  const className = getAttr(element, "class") || "";
  const hasDisabledClass = /\bdisabled\b/i.test(className);
  
  return disabled || ariaDisabled || dataDisabled || hasDisabledClass;
}

/**
 * Check if page has an active (non-disabled) purchase CTA
 */
function hasActivePurchaseCTA(context: StockExtractionContext): {
  found: boolean;
  details: string;
} {
  const buttons = findAll(
    context.$,
    "button, a[role='button'], input[type='submit'], [class*='button'], [class*='btn'], [class*='add-to'], [class*='purchase']"
  );

  for (const button of buttons) {
    const text = extractCleanText(button);
    if (!text) continue;

    for (const pattern of PURCHASE_CTA_PATTERNS) {
      if (pattern.test(text)) {
        // Found a purchase CTA - check if it's disabled
        if (!isElementDisabled(button)) {
          return {
            found: true,
            details: `Active purchase CTA found: "${text}"`,
          };
        }
      }
    }
  }

  return {
    found: false,
    details: "No active purchase CTA found",
  };
}

/**
 * Find notify me / waitlist UI elements
 */
function findNotifyMeUI(context: StockExtractionContext): {
  found: boolean;
  elements: Array<{ type: string; text: string; score: number }>;
} {
  const elements: Array<{ type: string; text: string; score: number }> = [];

  // 1. Check for notify me buttons/CTAs
  const buttons = findAll(
    context.$,
    "button, a[role='button'], input[type='submit'], [class*='button'], [class*='btn'], [class*='notify'], [class*='waitlist']"
  );

  for (const button of buttons) {
    const text = extractCleanText(button);
    if (!text) continue;

    for (const pattern of NOTIFY_ME_PATTERNS) {
      if (pattern.test(text)) {
        elements.push({
          type: "notify-button",
          text: text.slice(0, 100),
          score: 30, // High confidence
        });
        break;
      }
    }
  }

  // 2. Check for email input fields in notification context
  // Look for email inputs near "notify", "available", "stock" text
  const emailInputs = findAll(
    context.$,
    "input[type='email'], input[name*='email'], input[placeholder*='email']"
  );

  for (const input of emailInputs) {
    // Check parent/siblings for notification context
    const parent = input.parent();
    const grandparent = parent?.parent();
    
    const parentText = extractCleanText(parent) || "";
    const grandparentText = extractCleanText(grandparent) || "";
    const combinedText = `${parentText} ${grandparentText}`.toLowerCase();

    // Check if email input is in a notification context
    if (
      /notify|available|stock|alert|waitlist/i.test(combinedText) ||
      /when.*available|back\s+in\s+stock/i.test(combinedText)
    ) {
      elements.push({
        type: "notification-email-input",
        text: "Email input in notification context",
        score: 25,
      });
    }
  }

  // 3. Check for future availability copy in prominent areas
  const prominentSelectors = [
    "[class*='product']",
    "[class*='availability']",
    "[class*='stock']",
    "[class*='notify']",
    "[class*='waitlist']",
    "main",
    "[role='main']",
    ".pdp", // Product detail page
    "#product",
  ];

  for (const selector of prominentSelectors) {
    const containers = findAll(context.$, selector);
    
    for (const container of containers) {
      const text = extractCleanText(container);
      if (!text) continue;

      for (const pattern of FUTURE_AVAILABILITY_PATTERNS) {
        if (pattern.test(text)) {
          elements.push({
            type: "future-availability-text",
            text: text.slice(0, 150),
            score: 20,
          });
          break;
        }
      }
    }
  }

  // 4. Check form elements with notify/stock context
  const forms = findAll(
    context.$,
    "form[action*='notify'], form[action*='waitlist'], form[action*='stock'], form[class*='notify'], form[class*='waitlist']"
  );

  for (const form of forms) {
    const formText = extractCleanText(form);
    elements.push({
      type: "notification-form",
      text: formText?.slice(0, 100) || "Notification form found",
      score: 28,
    });
  }

  // Deduplicate by type
  const uniqueTypes = new Set<string>();
  const uniqueElements = elements.filter((el) => {
    if (uniqueTypes.has(el.type)) return false;
    uniqueTypes.add(el.type);
    return true;
  });

  return {
    found: uniqueElements.length > 0,
    elements: uniqueElements,
  };
}

/**
 * NotifyMeStockStrategy - Detects out-of-stock via notification UI patterns
 * 
 * This strategy has HIGHEST PRIORITY because:
 * - Fashion/luxury sites remove purchase controls when OOS
 * - Product JSON often shows product-level availability, not variant-level
 * - "Notify me" UI is an explicit signal from the retailer that the item is unavailable
 */
export class NotifyMeStockStrategy extends StockStrategy {
  name = "notify-me-stock-strategy";

  extract(context: StockExtractionContext): StockExtractionResult {
    const notes: string[] = [];

    // Step 1: Look for notify me / waitlist UI
    const notifyUI = findNotifyMeUI(context);

    if (!notifyUI.found) {
      // No notify UI found - let other strategies handle it
      return {
        stock: null,
        notes: ["No notify-me UI patterns detected"],
      };
    }

    notes.push(`Found ${notifyUI.elements.length} notify-me UI element(s)`);
    for (const el of notifyUI.elements) {
      notes.push(`  - ${el.type}: "${el.text}" (score: ${el.score})`);
    }

    // Step 2: Check if there's an active purchase CTA
    // If yes, the notify UI might be for a different variant or a secondary feature
    const purchaseCTA = hasActivePurchaseCTA(context);
    notes.push(purchaseCTA.details);

    // Calculate confidence score
    const notifyScore = notifyUI.elements.reduce((sum, el) => sum + el.score, 0);
    
    // If we have notify UI BUT also have an active purchase CTA,
    // reduce confidence - the notify might be for a different variant
    const adjustedScore = purchaseCTA.found ? notifyScore - 20 : notifyScore;

    notes.push(`Notify UI score: ${notifyScore}, adjusted: ${adjustedScore}`);

    // Decision threshold
    // Require score >= 20 without purchase CTA, or >= 40 with purchase CTA
    const threshold = purchaseCTA.found ? 40 : 20;

    if (adjustedScore >= threshold) {
      const primaryElement = notifyUI.elements.sort((a, b) => b.score - a.score)[0];
      
      notes.push(`OUT_OF_STOCK detected via notify-me UI (score ${adjustedScore} >= ${threshold})`);

      return {
        stock: {
          status: "out_of_stock",
          raw: primaryElement.text,
          metadata: {
            source: "notify-me-ui",
            score: adjustedScore,
            hasActivePurchaseCTA: purchaseCTA.found,
            elementsFound: notifyUI.elements.map((e) => e.type),
            // Note about variant handling
            note: "Detected via UI state which reflects selected variant",
          },
        },
        notes,
      };
    }

    // Score too low for confident detection - let other strategies decide
    notes.push(`Score ${adjustedScore} below threshold ${threshold}, deferring to other strategies`);
    return {
      stock: null,
      notes,
    };
  }
}
