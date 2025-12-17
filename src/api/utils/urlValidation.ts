/**
 * URL validation utilities
 * Ensures URLs are safe and valid HTTP/HTTPS URLs
 */

export interface URLValidationResult {
  valid: boolean;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

/**
 * Validate that a URL is a valid HTTP or HTTPS URL
 * Rejects file://, javascript:, data:, and other non-HTTP schemes
 *
 * @param url - URL string to validate
 * @returns Validation result with error details if invalid
 */
export function validateURL(url: string): URLValidationResult {
  if (!url || typeof url !== "string") {
    return {
      valid: false,
      error: {
        code: "INVALID_URL",
        message: "URL is required and must be a string",
        details: { url: url || null },
      },
    };
  }

  const trimmed = url.trim();

  if (trimmed.length === 0) {
    return {
      valid: false,
      error: {
        code: "INVALID_URL",
        message: "URL cannot be empty",
        details: { url: trimmed },
      },
    };
  }

  // Check for dangerous schemes
  const dangerousSchemes = [
    "file://",
    "javascript:",
    "data:",
    "intent://",
    "mailto:",
    "tel:",
  ];

  const lowerUrl = trimmed.toLowerCase();
  for (const scheme of dangerousSchemes) {
    if (lowerUrl.startsWith(scheme)) {
      return {
        valid: false,
        error: {
          code: "INVALID_URL",
          message: `URL scheme '${scheme}' is not allowed. Only HTTP and HTTPS URLs are permitted.`,
          details: { url: trimmed, scheme },
        },
      };
    }
  }

  // Must start with http:// or https://
  if (!lowerUrl.startsWith("http://") && !lowerUrl.startsWith("https://")) {
    return {
      valid: false,
      error: {
        code: "INVALID_URL",
        message: "URL must start with http:// or https://",
        details: { url: trimmed },
      },
    };
  }

  // Try to parse as URL to validate format
  try {
    const parsed = new URL(trimmed);
    // Additional validation: ensure hostname exists
    if (!parsed.hostname || parsed.hostname.length === 0) {
      return {
        valid: false,
        error: {
          code: "INVALID_URL",
          message: "URL must have a valid hostname",
          details: { url: trimmed },
        },
      };
    }
  } catch (error) {
    return {
      valid: false,
      error: {
        code: "INVALID_URL",
        message: "URL format is invalid",
        details: { url: trimmed, parseError: error instanceof Error ? error.message : "Unknown error" },
      },
    };
  }

  return { valid: true };
}








