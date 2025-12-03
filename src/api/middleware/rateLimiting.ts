import rateLimit from "express-rate-limit";

/**
 * Rate limiting middleware for POST endpoints
 * Prevents abuse and protects against DDoS
 * 
 * Configuration:
 * - Window: 15 minutes
 * - Max requests: 100 per window per IP
 * - Message: Structured error response
 */
export const postRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests from this IP, please try again later.",
      details: {
        retryAfter: "15 minutes",
      },
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

