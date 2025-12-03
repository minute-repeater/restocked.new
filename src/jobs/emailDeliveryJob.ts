import { NotificationRepository } from "../db/repositories/notificationRepository.js";
import { UserRepository } from "../db/repositories/userRepository.js";
import { UserNotificationSettingsRepository } from "../db/repositories/userNotificationSettingsRepository.js";
import { ProductRepository } from "../db/repositories/productRepository.js";
import { emailService } from "../services/emailService.js";

/**
 * Email delivery job
 * Processes unsent notifications and sends emails
 * Should be run periodically (e.g., every 5 minutes)
 */
export class EmailDeliveryJob {
  private notificationRepo: NotificationRepository;
  private userRepo: UserRepository;
  private settingsRepo: UserNotificationSettingsRepository;
  private productRepo: ProductRepository;

  constructor() {
    this.notificationRepo = new NotificationRepository();
    this.userRepo = new UserRepository();
    this.settingsRepo = new UserNotificationSettingsRepository();
    this.productRepo = new ProductRepository();
  }

  /**
   * Process and send unsent notifications
   *
   * @param batchSize - Maximum number of notifications to process
   * @returns Number of notifications sent
   */
  async processUnsentNotifications(batchSize: number = 50): Promise<number> {
    console.log(`[EmailDeliveryJob] Processing unsent notifications (batch size: ${batchSize})`);

    const unsentNotifications = await this.notificationRepo.getUnsentNotifications(batchSize);
    let sentCount = 0;

    for (const notification of unsentNotifications) {
      try {
        // Get user
        const user = await this.userRepo.findById(notification.user_id);
        if (!user) {
          console.warn(`[EmailDeliveryJob] User ${notification.user_id} not found, skipping notification ${notification.id}`);
          continue;
        }

        // Get user settings
        const settings = await this.settingsRepo.getSettings(notification.user_id);
        if (!settings.email_enabled) {
          // Mark as sent even though we're not sending (user disabled emails)
          await this.notificationRepo.markAsSent(notification.id);
          continue;
        }

        // Get product
        const product = await this.productRepo.getProductById(notification.product_id);
        if (!product) {
          console.warn(`[EmailDeliveryJob] Product ${notification.product_id} not found, skipping notification ${notification.id}`);
          continue;
        }

        // Send email
        const sent = await emailService.sendNotificationEmail(
          user.email,
          notification,
          product.name || "Product",
          product.url
        );

        if (sent) {
          await this.notificationRepo.markAsSent(notification.id);
          sentCount++;
        }
      } catch (error: any) {
        console.error(`[EmailDeliveryJob] Error processing notification ${notification.id}:`, error);
        // Continue with next notification
      }
    }

    console.log(`[EmailDeliveryJob] Processed ${unsentNotifications.length} notifications, sent ${sentCount} emails`);
    return sentCount;
  }
}

// Export singleton instance
export const emailDeliveryJob = new EmailDeliveryJob();

