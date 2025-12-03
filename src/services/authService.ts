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
}

