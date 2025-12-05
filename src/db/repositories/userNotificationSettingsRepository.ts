import { BaseRepository } from "../baseRepository.js";

/**
 * User notification settings as stored in the database
 */
export interface DBUserNotificationSettings {
  user_id: string; // UUID
  email_enabled: boolean;
  push_enabled: boolean;
  threshold_percentage: number;
  created_at: string; // ISO timestamp string
  updated_at: string; // ISO timestamp string
}

/**
 * Input type for updating notification settings
 */
export interface UpdateNotificationSettingsInput {
  email_enabled?: boolean;
  push_enabled?: boolean;
  threshold_percentage?: number;
}

/**
 * Repository for user notification settings database operations
 */
export class UserNotificationSettingsRepository extends BaseRepository {
  /**
   * Get notification settings for a user (creates default if not exists)
   *
   * @param user_id - User UUID
   * @returns User notification settings
   */
  async getSettings(user_id: string): Promise<DBUserNotificationSettings> {
    let settings = await this.findOne<DBUserNotificationSettings>(
      "SELECT * FROM user_notification_settings WHERE user_id = $1",
      [user_id]
    );

    // Create default settings if not exists
    if (!settings) {
      settings = await this.createDefaultSettings(user_id);
    }

    return settings;
  }

  /**
   * Create default notification settings for a user
   *
   * @param user_id - User UUID
   * @returns Created settings
   */
  async createDefaultSettings(user_id: string): Promise<DBUserNotificationSettings> {
    const sql = `
      INSERT INTO user_notification_settings (
        user_id,
        email_enabled,
        push_enabled,
        threshold_percentage
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    return this.insert<DBUserNotificationSettings>(sql, [
      user_id,
      true, // email_enabled
      false, // push_enabled
      10, // threshold_percentage
    ]);
  }

  /**
   * Update notification settings for a user
   *
   * @param user_id - User UUID
   * @param data - Settings to update
   * @returns Updated settings
   */
  async updateSettings(
    user_id: string,
    data: UpdateNotificationSettingsInput
  ): Promise<DBUserNotificationSettings> {
    // Ensure settings exist
    await this.getSettings(user_id);

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.email_enabled !== undefined) {
      updates.push(`email_enabled = $${paramIndex++}`);
      values.push(data.email_enabled);
    }
    if (data.push_enabled !== undefined) {
      updates.push(`push_enabled = $${paramIndex++}`);
      values.push(data.push_enabled);
    }
    if (data.threshold_percentage !== undefined) {
      updates.push(`threshold_percentage = $${paramIndex++}`);
      values.push(data.threshold_percentage);
    }

    if (updates.length === 0) {
      return this.getSettings(user_id);
    }

    updates.push(`updated_at = now()`);
    values.push(user_id);

    const sql = `
      UPDATE user_notification_settings
      SET ${updates.join(", ")}
      WHERE user_id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db<DBUserNotificationSettings>(sql, values);
    if (result.rows.length === 0) {
      throw new Error(`Settings for user ${user_id} not found`);
    }
    return result.rows[0];
  }
}




