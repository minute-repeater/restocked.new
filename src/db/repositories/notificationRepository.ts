import { BaseRepository } from "../baseRepository.js";

/**
 * Notification as stored in the database
 */
export interface DBNotification {
  id: number;
  user_id: string; // UUID
  product_id: number;
  variant_id: number | null;
  type: "STOCK" | "PRICE" | "RESTOCK";
  message: string | null;
  old_price: number | null;
  new_price: number | null;
  old_status: string | null;
  new_status: string | null;
  created_at: string; // ISO timestamp string
  delivered: boolean;
  delivered_at: string | null;
  sent: boolean;
  sent_at: string | null;
  read: boolean;
  notify_price_change: boolean;
  notify_restock: boolean;
  notify_oos: boolean;
  metadata: any; // JSONB
}

/**
 * Input type for creating a notification
 */
export interface CreateNotificationInput {
  user_id: string; // UUID
  product_id: number;
  variant_id?: number | null;
  type: "STOCK" | "PRICE" | "RESTOCK";
  message?: string | null;
  old_price?: number | null;
  new_price?: number | null;
  old_status?: string | null;
  new_status?: string | null;
  notify_price_change?: boolean;
  notify_restock?: boolean;
  notify_oos?: boolean;
  metadata?: any;
}

/**
 * Repository for notification database operations
 */
export class NotificationRepository extends BaseRepository {
  /**
   * Create a new notification
   *
   * @param data - Notification data
   * @returns Created notification
   */
  async createNotification(data: CreateNotificationInput): Promise<DBNotification> {
    const sql = `
      INSERT INTO notifications (
        user_id,
        product_id,
        variant_id,
        type,
        message,
        old_price,
        new_price,
        old_status,
        new_status,
        notify_price_change,
        notify_restock,
        notify_oos,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const params = [
      data.user_id,
      data.product_id,
      data.variant_id ?? null,
      data.type,
      data.message ?? null,
      data.old_price ?? null,
      data.new_price ?? null,
      data.old_status ?? null,
      data.new_status ?? null,
      data.notify_price_change ?? true,
      data.notify_restock ?? true,
      data.notify_oos ?? true,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ];

    return this.insert<DBNotification>(sql, params);
  }

  /**
   * Get notifications for a user
   *
   * @param user_id - User UUID
   * @param limit - Maximum number of notifications
   * @param offset - Number of notifications to skip
   * @returns Array of notifications
   */
  async getNotificationsByUser(
    user_id: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<DBNotification[]> {
    const sql = `
      SELECT *
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    return this.findMany<DBNotification>(sql, [user_id, limit, offset]);
  }

  /**
   * Get unread notifications count for a user
   *
   * @param user_id - User UUID
   * @returns Count of unread notifications
   */
  async getUnreadCount(user_id: string): Promise<number> {
    const sql = `
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = $1 AND read = FALSE
    `;

    const result = await this.db<{ count: string }>(sql, [user_id]);
    return parseInt(result.rows[0]?.count || "0", 10);
  }

  /**
   * Mark notifications as read
   *
   * @param user_id - User UUID
   * @param notificationIds - Array of notification IDs to mark as read (optional, if empty marks all)
   * @returns Number of notifications updated
   */
  async markAsRead(user_id: string, notificationIds?: number[]): Promise<number> {
    if (notificationIds && notificationIds.length > 0) {
      const sql = `
        UPDATE notifications
        SET read = TRUE
        WHERE user_id = $1 AND id = ANY($2::int[])
        RETURNING id
      `;
      const result = await this.db<{ id: number }>(sql, [user_id, notificationIds]);
      return result.rows.length;
    } else {
      const sql = `
        UPDATE notifications
        SET read = TRUE
        WHERE user_id = $1 AND read = FALSE
        RETURNING id
      `;
      const result = await this.db<{ id: number }>(sql, [user_id]);
      return result.rows.length;
    }
  }

  /**
   * Mark notification as sent
   *
   * @param id - Notification ID
   * @returns Updated notification
   */
  async markAsSent(id: number): Promise<DBNotification> {
    const sql = `
      UPDATE notifications
      SET sent = TRUE, sent_at = now(), delivered = TRUE, delivered_at = now()
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db<DBNotification>(sql, [id]);
    if (result.rows.length === 0) {
      throw new Error(`Notification with id ${id} not found`);
    }
    return result.rows[0];
  }

  /**
   * Get unsent notifications (for email delivery)
   *
   * @param limit - Maximum number of notifications
   * @returns Array of unsent notifications
   */
  async getUnsentNotifications(limit: number = 100): Promise<DBNotification[]> {
    const sql = `
      SELECT *
      FROM notifications
      WHERE sent = FALSE
      ORDER BY created_at ASC
      LIMIT $1
    `;

    return this.findMany<DBNotification>(sql, [limit]);
  }
}

