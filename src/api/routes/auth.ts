import { Router, type Request, type Response } from "express";
import { AuthService } from "../../services/authService.js";
import { validateAuthInput } from "../utils/validation.js";
import {
  invalidRequestError,
  internalError,
  createErrorResponse,
  ErrorCodes,
} from "../utils/errors.js";
import { postRateLimiter } from "../middleware/rateLimiting.js";

const router = Router();

// Initialize auth service
const authService = new AuthService();

/**
 * POST /auth/register
 * Register a new user
 * Body: { email, password }
 * Returns: { user, token }
 */
router.post("/register", postRateLimiter, async (req: Request, res: Response) => {
  try {
    // Validate input
    const validation = validateAuthInput(req.body);
    if (!validation.valid) {
      return res.status(400).json(validation.error);
    }

    const { email, password } = validation.data;

    // Register user
    try {
      const result = await authService.registerUser(email, password);

      res.status(201).json({
        user: result.user,
        token: result.token,
      });
    } catch (error: any) {
      // Handle duplicate email
      if (error.message === "Email already registered") {
        return res.status(409).json(
          createErrorResponse(
            ErrorCodes.INVALID_REQUEST,
            "Email already registered"
          )
        );
      }
      throw error;
    }
  } catch (error: any) {
    console.error("Error in POST /auth/register:", error);
    res.status(500).json(internalError(error.message, { stack: error.stack }));
  }
});

/**
 * POST /auth/login
 * Login an existing user
 * Body: { email, password }
 * Returns: { user, token }
 */
router.post("/login", postRateLimiter, async (req: Request, res: Response) => {
  try {
    // Validate input
    const validation = validateAuthInput(req.body);
    if (!validation.valid) {
      return res.status(400).json(validation.error);
    }

    const { email, password } = validation.data;

    // Login user
    try {
      const result = await authService.loginUser(email, password);

      res.status(200).json({
        user: result.user,
        token: result.token,
      });
    } catch (error: any) {
      // Handle invalid credentials
      if (
        error.message === "Invalid email or password" ||
        error.message.includes("Invalid email or password")
      ) {
        return res.status(401).json(
          createErrorResponse(
            ErrorCodes.UNAUTHORIZED,
            "Invalid email or password"
          )
        );
      }
      throw error;
    }
  } catch (error: any) {
    console.error("Error in POST /auth/login:", error);
    res.status(500).json(internalError(error.message, { stack: error.stack }));
  }
});

export { router as authRoutes };

