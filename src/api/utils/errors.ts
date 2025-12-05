/**
 * Structured error response utilities
 * Provides consistent error formatting across the API
 * Production-safe: Never leaks stack traces or internal details
 */

import { config } from "../../config.js";
import { ZodError } from "zod";

export interface StructuredError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface ErrorResponse {
  error: StructuredError;
}

/**
 * Create a structured error response
 *
 * @param code - Error code (e.g., "INVALID_URL", "NOT_FOUND")
 * @param message - Human-readable error message
 * @param details - Optional additional error details
 * @returns Structured error response object
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, any>
): ErrorResponse {
  return {
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
}

/**
 * Common error codes
 */
export const ErrorCodes = {
  INVALID_URL: "INVALID_URL",
  INVALID_REQUEST: "INVALID_REQUEST",
  NOT_FOUND: "NOT_FOUND",
  FETCH_FAILED: "FETCH_FAILED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  PRODUCT_NOT_FOUND: "PRODUCT_NOT_FOUND",
  VARIANT_NOT_FOUND: "VARIANT_NOT_FOUND",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
} as const;

/**
 * Type for ErrorCodes values
 */
export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Create error response for invalid URL
 */
export function invalidURLError(url: string, reason?: string): ErrorResponse {
  return createErrorResponse(
    ErrorCodes.INVALID_URL,
    reason || "URL must start with http:// or https://",
    { url }
  );
}

/**
 * Create error response for invalid request
 */
export function invalidRequestError(message: string, details?: Record<string, any>): ErrorResponse {
  return createErrorResponse(ErrorCodes.INVALID_REQUEST, message, details);
}

/**
 * Create error response for not found
 */
export function notFoundError(resource: string, id?: string | number): ErrorResponse {
  return createErrorResponse(
    ErrorCodes.NOT_FOUND,
    `${resource} not found`,
    id !== undefined ? { id: String(id) } : undefined
  );
}

/**
 * Create error response for fetch failure
 */
export function fetchFailedError(message: string, details?: Record<string, any>): ErrorResponse {
  return createErrorResponse(ErrorCodes.FETCH_FAILED, message, details);
}

/**
 * Create error response for internal server error
 * In production, stack traces are excluded from the response
 */
export function internalError(message: string, details?: Record<string, any>): ErrorResponse {
  // In production, filter out stack traces and sensitive details
  if (config.isProduction && details) {
    const { stack, ...safeDetails } = details;
    // Also filter out any other potentially sensitive fields
    const filteredDetails: Record<string, any> = {};
    for (const [key, value] of Object.entries(safeDetails)) {
      // Skip sensitive keys
      if (!key.toLowerCase().includes("stack") && 
          !key.toLowerCase().includes("password") &&
          !key.toLowerCase().includes("secret") &&
          !key.toLowerCase().includes("token")) {
        filteredDetails[key] = value;
      }
    }
    return createErrorResponse(
      ErrorCodes.INTERNAL_ERROR, 
      message, 
      Object.keys(filteredDetails).length > 0 ? filteredDetails : undefined
    );
  }
  return createErrorResponse(ErrorCodes.INTERNAL_ERROR, message, details);
}

/**
 * Create error response for rate limit exceeded
 */
export function rateLimitError(retryAfter?: number): ErrorResponse {
  return createErrorResponse(
    ErrorCodes.RATE_LIMIT_EXCEEDED,
    "Rate limit exceeded. Please try again later.",
    retryAfter ? { retryAfter } : undefined
  );
}

/**
 * Create error response for forbidden access
 */
export function forbiddenError(message: string, details?: Record<string, any>): ErrorResponse {
  return createErrorResponse(ErrorCodes.FORBIDDEN, message, details);
}

/**
 * Create error response for product not found
 */
export function productNotFoundError(productId: number): ErrorResponse {
  return createErrorResponse(
    ErrorCodes.PRODUCT_NOT_FOUND,
    "Product not found",
    { product_id: productId }
  );
}

/**
 * Create error response for variant not found
 */
export function variantNotFoundError(variantId: number): ErrorResponse {
  return createErrorResponse(
    ErrorCodes.VARIANT_NOT_FOUND,
    "Variant not found",
    { variant_id: variantId }
  );
}

/**
 * Format an error for API response
 * Handles different error types (Zod, Database, Auth, Generic)
 * Production-safe: Never exposes stack traces or internal details
 */
export function formatError(error: unknown): ErrorResponse {
  // Zod validation errors
  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    return createErrorResponse(
      ErrorCodes.INVALID_REQUEST,
      firstIssue.message || "Validation failed",
      config.isDevelopment ? { errors: error.issues } : undefined
    );
  }

  // Database errors (PostgreSQL)
  if (error && typeof error === "object" && "code" in error) {
    const dbError = error as { code?: string; message?: string; detail?: string };
    
    // Handle specific PostgreSQL error codes
    if (dbError.code === "23505") {
      // Unique constraint violation
      return createErrorResponse(
        ErrorCodes.INVALID_REQUEST,
        "A record with this information already exists",
        config.isDevelopment ? { detail: dbError.detail } : undefined
      );
    }
    if (dbError.code === "23503") {
      // Foreign key constraint violation
      return createErrorResponse(
        ErrorCodes.INVALID_REQUEST,
        "Referenced record does not exist",
        config.isDevelopment ? { detail: dbError.detail } : undefined
      );
    }
    if (dbError.code === "23502") {
      // Not null constraint violation
      return createErrorResponse(
        ErrorCodes.INVALID_REQUEST,
        "Required field is missing",
        config.isDevelopment ? { detail: dbError.detail } : undefined
      );
    }
    
    // Generic database error
    if (dbError.code && dbError.code.startsWith("23")) {
      return createErrorResponse(
        ErrorCodes.INVALID_REQUEST,
        "Database constraint violation",
        config.isDevelopment ? { code: dbError.code, detail: dbError.detail } : undefined
      );
    }
    
    // Connection errors
    if (dbError.code === "ECONNREFUSED" || dbError.code === "ETIMEDOUT") {
      return createErrorResponse(
        ErrorCodes.INTERNAL_ERROR,
        "Database connection failed. Please try again later.",
        undefined
      );
    }
  }

  // Standard Error objects
  if (error instanceof Error) {
    // Authentication-related errors
    if (error.message.includes("Invalid email or password") || 
        error.message.includes("Invalid token") ||
        error.message.includes("Token has expired") ||
        error.message.includes("Authorization")) {
      return createErrorResponse(
        ErrorCodes.UNAUTHORIZED,
        error.message,
        undefined
      );
    }

    // Rate limiting errors
    if (error.message.includes("rate limit") || error.message.includes("Rate limit")) {
      return createErrorResponse(
        ErrorCodes.RATE_LIMIT_EXCEEDED,
        "Rate limit exceeded. Please try again later.",
        undefined
      );
    }

    // Generic error - production-safe message
    return internalError(
      config.isProduction ? "An unexpected error occurred" : error.message,
      config.isDevelopment ? { originalMessage: error.message } : undefined
    );
  }

  // Unknown error type
  return internalError(
    config.isProduction ? "An unexpected error occurred" : String(error),
    config.isDevelopment ? { error: String(error) } : undefined
  );
}

/**
 * Safely extract error message for logging
 * Never includes stack traces in production responses
 */
export function getSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

/**
 * Create error response for payload too large
 */
export function payloadTooLargeError(maxSize: string): ErrorResponse {
  return createErrorResponse(
    ErrorCodes.PAYLOAD_TOO_LARGE,
    `Request payload exceeds maximum size of ${maxSize}`,
    undefined
  );
}

