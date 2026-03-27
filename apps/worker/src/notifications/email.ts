import { Resend } from 'resend';
import { createLogger } from '@covet/shared/logger';
import { config } from '../config.js';
import type { NotificationPayload } from '@covet/shared';

const log = createLogger('worker:email');

const resend = new Resend(config.resendApiKey);

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const MAX_EMAIL_RETRIES = 2;

export async function sendEmailNotification(
  to: string,
  payload: NotificationPayload
): Promise<boolean> {
  const subject = getSubject(payload);
  const html = getHtmlContent(payload);

  for (let attempt = 0; attempt <= MAX_EMAIL_RETRIES; attempt++) {
    try {
      const { error } = await resend.emails.send({
        from: config.fromEmail,
        to,
        subject,
        html,
      });

      if (error) {
        // Resend API errors (rate limit, invalid email, etc.)
        log.error({ err: error, to, attempt }, 'Failed to send email');

        // Don't retry on client errors (400-level) — only on server/rate limit errors
        const status = (error as { statusCode?: number }).statusCode;
        if (status && status >= 400 && status < 500 && status !== 429) {
          return false;
        }

        if (attempt < MAX_EMAIL_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        return false;
      }

      return true;
    } catch (error) {
      log.error({ err: error, to, attempt }, 'Email send error');

      if (attempt < MAX_EMAIL_RETRIES) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      return false;
    }
  }

  return false;
}

function getSubject(payload: NotificationPayload): string {
  // Subject line is plain text, but escape HTML entities for safety
  const name = escapeHtml(payload.productName);
  switch (payload.type) {
    case 'back_in_stock':
      return `🎉 Back in Stock: ${name}`;
    case 'price_drop':
      return `💰 Price Drop: ${name}`;
    case 'price_target_hit':
      return `🎯 Price Target Hit: ${name}`;
    default:
      return `Update: ${name}`;
  }
}

function getHtmlContent(payload: NotificationPayload): string {
  const priceInfo = getPriceInfo(payload);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    ${payload.imageUrl ? `<img src="${escapeHtml(payload.imageUrl)}" alt="${escapeHtml(payload.productName)}" style="width: 100%; max-height: 300px; object-fit: cover;">` : ''}

    <div style="padding: 24px;">
      <h1 style="margin: 0 0 16px; font-size: 24px; color: #333;">
        ${getHeadline(payload)}
      </h1>

      <p style="margin: 0 0 16px; font-size: 18px; color: #666;">
        ${escapeHtml(payload.productName)}
      </p>

      ${priceInfo}

      <a href="${payload.productUrl}" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
        View Product
      </a>
    </div>

    <div style="padding: 16px 24px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 12px; color: #9ca3af;">
        You're receiving this because you're tracking this product on Covet
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function getHeadline(payload: NotificationPayload): string {
  switch (payload.type) {
    case 'back_in_stock':
      return '🎉 Back in Stock!';
    case 'price_drop':
      return '💰 Price Dropped!';
    case 'price_target_hit':
      return '🎯 Price Target Hit!';
    default:
      return 'Product Update';
  }
}

function getPriceInfo(payload: NotificationPayload): string {
  if (payload.type === 'back_in_stock' && !payload.currentPrice) {
    return '';
  }

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  if (payload.type === 'price_drop' && payload.previousPrice && payload.currentPrice) {
    const savings = payload.previousPrice - payload.currentPrice;
    return `
      <div style="margin: 16px 0; padding: 16px; background: #f0fdf4; border-radius: 8px;">
        <p style="margin: 0 0 8px; font-size: 14px; color: #666;">
          <span style="text-decoration: line-through;">${formatPrice(payload.previousPrice)}</span>
        </p>
        <p style="margin: 0; font-size: 28px; font-weight: bold; color: #16a34a;">
          ${formatPrice(payload.currentPrice)}
        </p>
        <p style="margin: 8px 0 0; font-size: 14px; color: #16a34a;">
          You save ${formatPrice(savings)}!
        </p>
      </div>
    `;
  }

  if (payload.type === 'price_target_hit' && payload.currentPrice && payload.targetPrice) {
    return `
      <div style="margin: 16px 0; padding: 16px; background: #f0fdf4; border-radius: 8px;">
        <p style="margin: 0 0 8px; font-size: 14px; color: #666;">
          Your target: ${formatPrice(payload.targetPrice)}
        </p>
        <p style="margin: 0; font-size: 28px; font-weight: bold; color: #16a34a;">
          Now: ${formatPrice(payload.currentPrice)}
        </p>
      </div>
    `;
  }

  if (payload.currentPrice) {
    return `
      <p style="margin: 16px 0; font-size: 24px; font-weight: bold; color: #333;">
        ${formatPrice(payload.currentPrice)}
      </p>
    `;
  }

  return '';
}
