import { StockStrategy } from "./baseStockStrategy.js";
import { findAll, getAttr } from "../../parser/queryHelpers.js";
import { extractCleanText, normalizeText } from "../../parser/textExtraction.js";
import type {
  StockExtractionContext,
  StockExtractionResult,
  StockShell,
  StockStatus,
} from "../stockTypes.js";

/**
 * In-stock button text patterns
 */
const IN_STOCK_BUTTON_PATTERNS = [
  /add\s+to\s+cart/i,
  /add\s+to\s+bag/i,
  /buy\s+now/i,
  /checkout/i,
  /purchase/i,
  /add\s+to\s+basket/i,
];

/**
 * Out-of-stock button text patterns
 */
const OUT_OF_STOCK_BUTTON_PATTERNS = [
  /sold\s+out/i,
  /out\s+of\s+stock/i,
  /unavailable/i,
  /notify\s+me/i,
  /email\s+when\s+available/i,
  /coming\s+soon/i,
];

/**
 * Button-based stock extraction strategy
 * Extracts stock status from button states and text
 */
export class ButtonStockStrategy extends StockStrategy {
  name = "button-stock-strategy";

  extract(context: StockExtractionContext): StockExtractionResult {
    const notes: string[] = [];

    // Find all button-like elements
    const buttons = findAll(
      context.$,
      "button, a[role='button'], input[type='submit'], [class*='button'], [class*='btn']"
    );

    if (buttons.length === 0) {
      return {
        stock: null,
        notes: ["No button elements found"],
      };
    }

    let inStockCandidate: {
      text: string;
      element: ReturnType<typeof findAll>[0];
      score: number;
    } | null = null;

    let outOfStockCandidate: {
      text: string;
      element: ReturnType<typeof findAll>[0];
      score: number;
    } | null = null;

    for (const button of buttons) {
      const text = extractCleanText(button);
      const disabled = getAttr(button, "disabled") !== null;
      const ariaDisabled = getAttr(button, "aria-disabled") === "true";
      const dataDisabled = getAttr(button, "data-disabled") === "true";
      const isDisabled = disabled || ariaDisabled || dataDisabled;

      if (!text) {
        continue;
      }

      // Check for in-stock button patterns
      for (const pattern of IN_STOCK_BUTTON_PATTERNS) {
        if (pattern.test(text)) {
          let score = 10;

          // Enabled buttons are stronger indicators
          if (!isDisabled) {
            score += 10;
          } else {
            score -= 5; // Disabled "Add to Cart" might mean OOS
          }

          // Prefer exact matches
          if (normalizeText(text).includes("add to cart")) {
            score += 3;
          }

          if (!inStockCandidate || score > inStockCandidate.score) {
            inStockCandidate = { text, element: button, score };
          }
        }
      }

      // Check for out-of-stock button patterns
      for (const pattern of OUT_OF_STOCK_BUTTON_PATTERNS) {
        if (pattern.test(text)) {
          let score = 10;

          // Disabled buttons are stronger indicators for OOS
          if (isDisabled) {
            score += 5;
          }

          if (!outOfStockCandidate || score > outOfStockCandidate.score) {
            outOfStockCandidate = { text, element: button, score };
          }
        }
      }

      // Check for disabled "Add to Cart" buttons (likely OOS)
      if (
        isDisabled &&
        (text.toLowerCase().includes("add") || text.toLowerCase().includes("cart"))
      ) {
        if (!outOfStockCandidate || 15 > outOfStockCandidate.score) {
          outOfStockCandidate = {
            text: `Disabled: ${text}`,
            element: button,
            score: 15,
          };
        }
      }
    }

    // Determine result based on candidates
    if (outOfStockCandidate && (!inStockCandidate || outOfStockCandidate.score >= inStockCandidate.score)) {
      notes.push(`Found out-of-stock indicator: ${outOfStockCandidate.text}`);
      return {
        stock: {
          status: "out_of_stock",
          raw: outOfStockCandidate.text,
          metadata: {
            source: "button",
            score: outOfStockCandidate.score,
            disabled: true,
          },
        },
        notes,
      };
    }

    if (inStockCandidate) {
      notes.push(`Found in-stock indicator: ${inStockCandidate.text}`);
      return {
        stock: {
          status: "in_stock",
          raw: inStockCandidate.text,
          metadata: {
            source: "button",
            score: inStockCandidate.score,
            disabled: false,
          },
        },
        notes,
      };
    }

    return {
      stock: null,
      notes: ["Found buttons but no clear stock indicators"],
    };
  }
}


