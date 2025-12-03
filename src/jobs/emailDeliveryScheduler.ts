import * as cron from "node-cron";
import { emailDeliveryJob } from "./emailDeliveryJob.js";
import { config } from "../config.js";

/**
 * Email delivery scheduler
 * Runs periodically to process and send unsent notifications
 */
class EmailDeliveryScheduler {
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;

  /**
   * Start the email delivery scheduler
   * Runs every 5 minutes by default (configurable via EMAIL_DELIVERY_INTERVAL_MINUTES)
   * Uses config layer for environment-aware behavior
   */
  start(): void {
    if (!config.enableEmailScheduler) {
      console.log("[EmailDeliveryScheduler] Disabled (check config.enableEmailScheduler)");
      return;
    }

    if (this.cronJob) {
      console.log("[EmailDeliveryScheduler] Already running");
      return;
    }

    const intervalMinutes = config.emailDeliveryIntervalMinutes;

    console.log(
      `[EmailDeliveryScheduler] Starting email delivery scheduler (interval: ${intervalMinutes} minutes)`
    );

    // Run every X minutes
    const cronExpression = `*/${intervalMinutes} * * * *`;

    this.cronJob = cron.schedule(cronExpression, async () => {
      await this.processEmails();
    });

    console.log(
      `[EmailDeliveryScheduler] Email delivery scheduler started`
    );
  }

  /**
   * Stop the email delivery scheduler
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log("[EmailDeliveryScheduler] Stopped");
    }
  }

  /**
   * Process emails immediately (manual trigger)
   */
  async processEmails(): Promise<void> {
    if (this.isRunning) {
      console.log("[EmailDeliveryScheduler] Already processing emails, skipping...");
      return;
    }

    this.isRunning = true;
    try {
      const sentCount = await emailDeliveryJob.processUnsentNotifications(50);
      console.log(`[EmailDeliveryScheduler] Processed emails, sent ${sentCount} notifications`);
    } catch (error: any) {
      console.error("[EmailDeliveryScheduler] Error processing emails:", error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      enabled: config.enableEmailScheduler,
      isRunning: this.isRunning,
      cronJobActive: this.cronJob !== null,
      intervalMinutes: config.emailDeliveryIntervalMinutes,
    };
  }
}

// Export singleton instance
export const emailDeliveryScheduler = new EmailDeliveryScheduler();

