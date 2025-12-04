/**
 * Structured error response utilities
 * Provides consistent error formatting across the API
 */

import { config } from "../../config.js";

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
} as const;

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
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, message, Object.keys(safeDetails).length > 0 ? safeDetails : undefined);
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

