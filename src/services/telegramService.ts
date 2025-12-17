/**
 * Telegram Bot API Service
 * 
 * Sends messages via Telegram Bot API for restock alerts.
 * Uses native fetch (Node 20+).
 * 
 * Environment Variables:
 *   TELEGRAM_BOT_TOKEN - Bot token from @BotFather (required)
 *   TELEGRAM_CHAT_ID   - Default chat ID to send messages to
 * 
 * SECURITY: Never log the bot token. Only log redacted versions or status codes.
 */

import { logger } from "../api/utils/logger.js";

// ============================================================================
// Configuration
// ============================================================================

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const TELEGRAM_API_BASE = "https://api.telegram.org";

/**
 * Check if Telegram is configured
 */
export function isTelegramConfigured(): boolean {
  return Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);
}

/**
 * Get redacted token for logging (shows first 4 and last 4 chars)
 */
function getRedactedToken(): string {
  if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN.length < 12) {
    return "[not set]";
  }
  return `${TELEGRAM_BOT_TOKEN.slice(0, 4)}...${TELEGRAM_BOT_TOKEN.slice(-4)}`;
}

// ============================================================================
// Types
// ============================================================================

interface TelegramSendMessageResponse {
  ok: boolean;
  result?: {
    message_id: number;
    chat: { id: number };
    date: number;
    text: string;
  };
  error_code?: number;
  description?: string;
}

interface SendMessageOptions {
  text: string;
  chatId?: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
  disableNotification?: boolean;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Send a message via Telegram Bot API
 * 
 * @param options - Message options
 * @returns true if sent successfully, false otherwise
 */
export async function sendTelegramMessage(options: SendMessageOptions): Promise<boolean> {
  const { text, chatId, parseMode = "HTML", disableNotification = false } = options;
  const targetChatId = chatId || TELEGRAM_CHAT_ID;

  // Validate configuration
  if (!TELEGRAM_BOT_TOKEN) {
    logger.warn({ tokenSet: false }, "[Telegram] TELEGRAM_BOT_TOKEN not set, skipping message");
    return false;
  }

  if (!targetChatId) {
    logger.warn({ chatIdSet: false }, "[Telegram] No chat ID provided and TELEGRAM_CHAT_ID not set");
    return false;
  }

  const url = `${TELEGRAM_API_BASE}/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  const body = {
    chat_id: targetChatId,
    text,
    parse_mode: parseMode,
    disable_notification: disableNotification,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as TelegramSendMessageResponse;

    if (data.ok) {
      logger.info(
        {
          chatId: targetChatId,
          messageId: data.result?.message_id,
          textLength: text.length,
        },
        "[Telegram] Message sent successfully"
      );
      return true;
    } else {
      // Log error but redact sensitive info
      logger.error(
        {
          chatId: targetChatId,
          errorCode: data.error_code,
          description: data.description,
          tokenRedacted: getRedactedToken(),
        },
        "[Telegram] Failed to send message"
      );
      return false;
    }
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        chatId: targetChatId,
        tokenRedacted: getRedactedToken(),
      },
      "[Telegram] Error sending message"
    );
    return false;
  }
}

/**
 * Send a restock alert message
 * 
 * @param productName - Name of the product
 * @param productUrl - URL to the product page
 * @param confidence - Detection confidence (0-100)
 * @param chatId - Optional specific chat ID (defaults to TELEGRAM_CHAT_ID)
 * @returns true if sent successfully
 */
export async function sendRestockAlert(
  productName: string,
  productUrl: string,
  confidence: number,
  chatId?: string
): Promise<boolean> {
  const confidenceEmoji = confidence >= 90 ? "🎯" : confidence >= 70 ? "✅" : "⚠️";
  
  const text = `🎉 <b>Back in Stock!</b>

<b>Product:</b> ${escapeHtml(productName)}
<b>Confidence:</b> ${confidenceEmoji} ${confidence}%

<a href="${escapeHtml(productUrl)}">View Product →</a>`;

  return sendTelegramMessage({ text, chatId });
}

/**
 * Send a worker boot ping (for testing)
 * 
 * @returns true if sent successfully
 */
export async function sendWorkerBootPing(): Promise<boolean> {
  const timestamp = new Date().toISOString();
  
  const text = `🤖 <b>Worker Online</b>

Restocked worker started successfully.
<code>${timestamp}</code>

This is a test ping. Set <code>TELEGRAM_TEST_ON_BOOT=false</code> to disable.`;

  return sendTelegramMessage({ text });
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Escape HTML special characters for Telegram HTML parse mode
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Log Telegram configuration status (for debugging, no secrets)
 */
export function logTelegramConfig(): void {
  logger.info(
    {
      configured: isTelegramConfigured(),
      tokenSet: Boolean(TELEGRAM_BOT_TOKEN),
      tokenRedacted: getRedactedToken(),
      chatIdSet: Boolean(TELEGRAM_CHAT_ID),
      chatId: TELEGRAM_CHAT_ID ? `${TELEGRAM_CHAT_ID.slice(0, 3)}...` : "[not set]",
    },
    "[Telegram] Configuration status"
  );
}
