import { z } from "zod";
import { createErrorResponse, ErrorCodes } from "./errors.js";
import type { ErrorResponse } from "./errors.js";

/**
 * Validation schema for user registration/login
 */
export const authSchema = z.object({
  email: z
    .string()
    .email("Invalid email format")
    .min(1, "Email is required"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be less than 100 characters"),
});

/**
 * Type for validated auth input
 */
export type AuthInput = z.infer<typeof authSchema>;

/**
 * Validate authentication input (email and password)
 *
 * @param data - Object with email and password
 * @returns Validation result with success flag and data/error
 */
export function validateAuthInput(
  data: unknown
): { valid: true; data: AuthInput } | { valid: false; error: ErrorResponse } {
  try {
    const validated = authSchema.parse(data);
    return { valid: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error;
      const firstIssue = zodError.issues[0];
      return {
        valid: false,
        error: createErrorResponse(
          ErrorCodes.INVALID_REQUEST,
          firstIssue.message,
          { errors: zodError.issues }
        ),
      };
    }
    return {
      valid: false,
      error: createErrorResponse(
        ErrorCodes.INVALID_REQUEST,
        "Invalid input format"
      ),
    };
  }
}

