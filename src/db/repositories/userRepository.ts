import { BaseRepository } from "../baseRepository.js";

/**
 * User as stored in the database
 */
export interface DBUser {
  id: string; // UUID
  email: string;
  password_hash: string;
  plan: 'free' | 'pro';
  created_at: string; // ISO timestamp string
  updated_at: string; // ISO timestamp string
}

/**
 * Input type for creating a user
 */
export interface CreateUserInput {
  email: string;
  password_hash: string;
}

/**
 * Repository for user database operations
 * Handles CRUD operations for the users table
 */
export class UserRepository extends BaseRepository {
  /**
   * Create a new user
   *
   * @param data - User data to insert
   * @returns Created user (without password_hash)
   */
  async createUser(data: CreateUserInput): Promise<Omit<DBUser, "password_hash">> {
    const sql = `
      INSERT INTO users (email, password_hash)
      VALUES (LOWER($1), $2)
      RETURNING id, email, plan, created_at, updated_at
    `;

    const params = [data.email, data.password_hash];
    return this.insert<Omit<DBUser, "password_hash">>(sql, params);
  }

  /**
   * Find a user by email
   *
   * @param email - User email (will be lowercased)
   * @returns User with password_hash or null if not found
   */
  async findByEmail(email: string): Promise<DBUser | null> {
    const sql = `SELECT * FROM users WHERE email = LOWER($1)`;
    return this.findOne<DBUser>(sql, [email]);
  }

  /**
   * Find a user by ID
   *
   * @param id - User UUID
   * @returns User without password_hash or null if not found
   */
  async findById(id: string): Promise<Omit<DBUser, "password_hash"> | null> {
    const sql = `SELECT id, email, plan, created_at, updated_at FROM users WHERE id = $1`;
    return this.findOne<Omit<DBUser, "password_hash">>(sql, [id]);
  }

  /**
   * Update user plan
   *
   * @param id - User UUID
   * @param plan - New plan ('free' | 'pro')
   * @returns Updated user without password_hash
   */
  async updatePlan(id: string, plan: 'free' | 'pro'): Promise<Omit<DBUser, "password_hash">> {
    const sql = `
      UPDATE users 
      SET plan = $1, updated_at = now()
      WHERE id = $2
      RETURNING id, email, plan, created_at, updated_at
    `;
    const result = await this.update<Omit<DBUser, "password_hash">>(sql, [plan, id]);
    if (!result) {
      throw new Error(`User ${id} not found`);
    }
    return result;
  }

  /**
   * Check if an email already exists
   *
   * @param email - Email to check
   * @returns true if email exists, false otherwise
   */
  async emailExists(email: string): Promise<boolean> {
    const sql = `SELECT 1 FROM users WHERE email = LOWER($1) LIMIT 1`;
    const result = await this.findOne<{ "?column?": number }>(sql, [email]);
    return result !== null;
  }
}

