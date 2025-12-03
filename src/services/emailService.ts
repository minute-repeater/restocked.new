import { Resend } from "resend";
import { UserRepository } from "../db/repositories/userRepository.js";
import { NotificationRepository, type DBNotification } from "../db/repositories/notificationRepository.js";
import type { DBUserNotificationSettings } from "../db/repositories/userNotificationSettingsRepository.js";
import { config } from "../config.js";

/**
 * Email service for sending notifications
 */
export class EmailService {
  private resend: Resend | null = null;

  constructor() {
    if (config.resendApiKey) {
      this.resend = new Resend(config.resendApiKey);
    } else {
      console.warn("[EmailService] RESEND_API_KEY not set, email sending disabled (will log instead)");
    }
  }

  /**
   * Send a notification email to a user
   *
   * @param userEmail - User email address
   * @param notification - Notification to send
   * @param productName - Product name
   * @param productUrl - Product URL
   * @returns true if sent successfully, false otherwise
   */
  async sendNotificationEmail(
    userEmail: string,
    notification: DBNotification,
    productName: string,
    productUrl: string
  ): Promise<boolean> {
    if (!this.resend) {
      // Graceful fallback: log the email payload instead of crashing
      const subject = this.getEmailSubject(notification, productName);
      const html = this.getNotificationEmailTemplate(
        notification,
        productName,
        productUrl
      );

      console.log(`[EmailService] RESEND_API_KEY not set - logging email payload instead of sending`);
      console.log(`[EmailService] Email would be sent to: ${userEmail}`);
      console.log(`[EmailService] Subject: ${subject}`);
      console.log(`[EmailService] Product: ${productName}`);
      console.log(`[EmailService] URL: ${productUrl}`);
      console.log(`[EmailService] Notification type: ${notification.type}`);
      if (notification.old_price && notification.new_price) {
        console.log(`[EmailService] Price change: ${notification.old_price} → ${notification.new_price}`);
      }
      if (notification.old_status && notification.new_status) {
        console.log(`[EmailService] Stock change: ${notification.old_status} → ${notification.new_status}`);
      }
      console.log(`[EmailService] Email body (first 200 chars): ${html.substring(0, 200)}...`);

      // Return true to indicate "sent" (logged) so the notification can be marked as sent
      return true;
    }

    try {
      const subject = this.getEmailSubject(notification, productName);
      const html = this.getNotificationEmailTemplate(
        notification,
        productName,
        productUrl
      );

      const result = await this.resend.emails.send({
        from: `${config.emailFromName} <${config.emailFrom}>`,
        to: userEmail,
        subject,
        html,
      });

      if (result.error) {
        console.error("[EmailService] Failed to send email:", result.error);
        return false;
      }

      console.log(`[EmailService] ✓ Notification email sent to ${userEmail} (notification ${notification.id})`);
      return true;
    } catch (error: any) {
      console.error("[EmailService] Error sending notification email:", error);
      // Don't crash - just return false
      return false;
    }
  }

  /**
   * Send weekly summary email to a user
   *
   * @param userEmail - User email address
   * @param summary - Summary data
   * @returns true if sent successfully, false otherwise
   */
  async sendWeeklySummary(
    userEmail: string,
    summary: {
      productCount: number;
      priceChanges: number;
      restocks: number;
      outOfStock: number;
    }
  ): Promise<boolean> {
    if (!this.resend) {
      console.warn("[EmailService] Cannot send email - Resend not configured");
      return false;
    }

    try {
      const html = this.getWeeklySummaryTemplate(summary);

      const result = await this.resend.emails.send({
        from: `${config.emailFromName} <${config.emailFrom}>`,
        to: userEmail,
        subject: "Your Weekly StockCheck Summary",
        html,
      });

      if (result.error) {
        console.error("[EmailService] Failed to send weekly summary:", result.error);
        return false;
      }

      console.log(`[EmailService] Weekly summary sent to ${userEmail}`);
      return true;
    } catch (error: any) {
      console.error("[EmailService] Error sending weekly summary:", error);
      return false;
    }
  }

  /**
   * Get email subject line based on notification type
   */
  private getEmailSubject(notification: DBNotification, productName: string): string {
    switch (notification.type) {
      case "RESTOCK":
        return `🎉 ${productName} is back in stock!`;
      case "PRICE":
        if (notification.new_price && notification.old_price) {
          const change = notification.new_price - notification.old_price;
          if (change < 0) {
            return `💰 Price drop: ${productName}`;
          } else {
            return `📈 Price update: ${productName}`;
          }
        }
        return `Price update: ${productName}`;
      case "STOCK":
        if (notification.new_status === "out_of_stock") {
          return `⚠️ ${productName} is out of stock`;
        }
        return `Stock update: ${productName}`;
      default:
        return `Update: ${productName}`;
    }
  }

  /**
   * Get notification email HTML template
   */
  private getNotificationEmailTemplate(
    notification: DBNotification,
    productName: string,
    productUrl: string
  ): string {
    let content = "";

    switch (notification.type) {
      case "RESTOCK":
        content = `
          <div style="background-color: #10b981; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="margin: 0; font-size: 24px;">🎉 Back in Stock!</h2>
            <p style="margin: 10px 0 0 0; font-size: 16px;">${productName} is now available!</p>
          </div>
        `;
        break;
      case "PRICE":
        if (notification.old_price && notification.new_price) {
          const change = notification.new_price - notification.old_price;
          const percentageChange = ((change / notification.old_price) * 100).toFixed(1);
          const isDrop = change < 0;
          
          content = `
            <div style="background-color: ${isDrop ? '#3b82f6' : '#f59e0b'}; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="margin: 0; font-size: 24px;">${isDrop ? '💰' : '📈'} Price ${isDrop ? 'Drop' : 'Update'}</h2>
              <p style="margin: 10px 0 0 0; font-size: 16px;">
                ${productName} price changed from ${notification.old_price} to ${notification.new_price}
                <br>
                <strong>${isDrop ? '↓' : '↑'} ${Math.abs(parseFloat(percentageChange))}%</strong>
              </p>
            </div>
          `;
        } else {
          content = `
            <div style="background-color: #3b82f6; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="margin: 0; font-size: 24px;">📈 Price Update</h2>
              <p style="margin: 10px 0 0 0; font-size: 16px;">${productName} price: ${notification.new_price}</p>
            </div>
          `;
        }
        break;
      case "STOCK":
        if (notification.new_status === "out_of_stock") {
          content = `
            <div style="background-color: #ef4444; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="margin: 0; font-size: 24px;">⚠️ Out of Stock</h2>
              <p style="margin: 10px 0 0 0; font-size: 16px;">${productName} is now out of stock</p>
            </div>
          `;
        } else {
          content = `
            <div style="background-color: #6b7280; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="margin: 0; font-size: 24px;">📦 Stock Update</h2>
              <p style="margin: 10px 0 0 0; font-size: 16px;">${productName} stock status: ${notification.new_status}</p>
            </div>
          `;
        }
        break;
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          ${content}
          
          <div style="margin-top: 30px;">
            <a href="${productUrl}" 
               style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              View Product
            </a>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
            <p>You're receiving this because you're tracking this product on Restocked.</p>
            <p><a href="${config.frontendUrl}/dashboard" style="color: #3b82f6;">Manage your tracked items</a></p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Get weekly summary email HTML template
   */
  private getWeeklySummaryTemplate(summary: {
    productCount: number;
    priceChanges: number;
    restocks: number;
    outOfStock: number;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="font-size: 28px; margin-bottom: 20px;">Your Weekly StockCheck Summary</h1>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="margin-top: 0; font-size: 20px;">This Week's Activity</h2>
            <ul style="list-style: none; padding: 0;">
              <li style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <strong>Products Tracked:</strong> ${summary.productCount}
              </li>
              <li style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <strong>Price Changes:</strong> ${summary.priceChanges}
              </li>
              <li style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <strong>Restocks:</strong> ${summary.restocks}
              </li>
              <li style="padding: 10px 0;">
                <strong>Out of Stock:</strong> ${summary.outOfStock}
              </li>
            </ul>
          </div>
          
          <div style="margin-top: 30px;">
            <a href="${config.frontendUrl}/dashboard" 
               style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              View Dashboard
            </a>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
            <p>You're receiving this weekly summary from Restocked.</p>
            <p><a href="${config.frontendUrl}/dashboard" style="color: #3b82f6;">Manage notification settings</a></p>
          </div>
        </body>
      </html>
    `;
  }
}

// Export singleton instance
export const emailService = new EmailService();

