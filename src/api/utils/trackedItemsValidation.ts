import { z } from "zod";
import { createErrorResponse, ErrorCodes } from "./errors.js";
import type { ErrorResponse } from "./errors.js";

/**
 * Validation schema for creating a tracked item
 */
export const createTrackedItemSchema = z.object({
  product_id: z
    .number()
    .int("Product ID must be an integer")
    .positive("Product ID must be positive"),
  variant_id: z
    .number()
    .int("Variant ID must be an integer")
    .positive("Variant ID must be positive")
    .nullable()
    .optional(),
  url: z
    .string()
    .url("URL must be a valid URL")
    .optional(),
});

/**
 * Type for validated tracked item input
 */
export type CreateTrackedItemInput = z.infer<typeof createTrackedItemSchema>;

/**
 * Validate tracked item creation input
 *
 * @param data - Object with product_id, optional variant_id, optional url
 * @returns Validation result with success flag and data/error
 */
export function validateCreateTrackedItem(
  data: unknown
): { valid: true; data: CreateTrackedItemInput } | { valid: false; error: ErrorResponse } {
  try {
    const validated = createTrackedItemSchema.parse(data);
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




