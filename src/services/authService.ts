import bcrypt from "bcrypt";
import { UserRepository, type DBUser } from "../db/repositories/userRepository.js";
import { signToken } from "../api/utils/jwtUtils.js";

/**
 * Result of user registration
 */
export interface RegisterResult {
  user: Omit<DBUser, "password_hash">;
  token: string;
}

/**
 * Result of user login
 */
export interface LoginResult {
  user: Omit<DBUser, "password_hash">;
  token: string;
}

/**
 * Authentication service
 * Handles user registration and login with password hashing
 */
export class AuthService {
  private userRepo: UserRepository;

  constructor(userRepo?: UserRepository) {
    this.userRepo = userRepo || new UserRepository();
  }

  /**
   * Register a new user
   *
   * @param email - User email (will be lowercased)
   * @param password - Plain text password (will be hashed)
   * @returns User data and JWT token
   * @throws Error if email already exists or password is invalid
   */
  async registerUser(email: string, password: string): Promise<RegisterResult> {
    // Check if email already exists
    const emailExists = await this.userRepo.emailExists(email);
    if (emailExists) {
      throw new Error("Email already registered");
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await this.userRepo.createUser({
      email: email.toLowerCase(),
      password_hash,
      oauth_provider: 'local', // Email/password users are 'local'
      oauth_provider_id: null,
    });

    // Generate JWT token
    const token = signToken(user.id);

    return {
      user,
      token,
    };
  }

  /**
   * Login a user with email and password
   *
   * @param email - User email
   * @param password - Plain text password
   * @returns User data and JWT token
   * @throws Error if email not found or password is incorrect
   */
  async loginUser(email: string, password: string): Promise<LoginResult> {
    // Find user by email
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Check if user has a password (not an OAuth-only user)
    if (!user.password_hash) {
      throw new Error("Invalid email or password");
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      throw new Error("Invalid email or password");
    }

    // Generate JWT token
    const token = signToken(user.id);

    // Return user without password_hash
    const { password_hash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  /**
   * Create or login a user via OAuth
   * If user exists, returns existing user. If not, creates new user.
   *
   * @param email - User email from OAuth provider
   * @param provider - OAuth provider ('google' | 'apple')
   * @param providerId - Provider's user ID
   * @returns User data and JWT token
   */
  async oauthLogin(
    email: string,
    provider: 'google' | 'apple',
    providerId: string
  ): Promise<LoginResult> {
    // First, try to find user by OAuth provider + provider ID
    let user = await this.userRepo.findByOAuthProvider(provider, providerId);

    // If not found by provider ID, try by email (for existing users who might link OAuth later)
    if (!user) {
      user = await this.userRepo.findByEmail(email);
    }

    if (!user) {
      // Create new user for OAuth (no password)
      const newUser = await this.userRepo.createUser({
        email: email.toLowerCase(),
        password_hash: null, // OAuth users don't have passwords
        oauth_provider: provider,
        oauth_provider_id: providerId,
      });
      
      // Convert to DBUser format for consistency
      user = {
        ...newUser,
        password_hash: null,
        oauth_provider: provider,
        oauth_provider_id: providerId,
      } as DBUser;
    } else if (!user.oauth_provider || !user.oauth_provider_id) {
      // Existing user (email/password) linking OAuth account
      // For now, we'll just log them in with existing account
      // Future: could update the user record to link OAuth provider
      // This allows email/password users to also use OAuth
    }

    // Generate JWT token
    const token = signToken(user.id);

    // Return user without password_hash
    const { password_hash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }
}


