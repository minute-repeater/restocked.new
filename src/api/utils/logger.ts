import pino from "pino";
import { config } from "../../config.js";

/**
 * Configured Pino logger instance
 * 
 * Production: JSON logs (Railway-compatible)
 * Development: Pretty-printed logs with colors
 */
const logger = pino({
  level: process.env.LOG_LEVEL || (config.isProduction ? "info" : "debug"),
  
  // Base bindings (added to all log entries)
  base: {
    service: "restocked-api",
    environment: config.appEnv,
    version: process.env.APP_VERSION || "unknown",
  },

  // Transport configuration
  transport: config.isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss.l",
          ignore: "pid,hostname",
          singleLine: false,
        },
      }
    : undefined, // Production uses default JSON output

  // Redact sensitive fields
  redact: {
    paths: [
      "password",
      "hashed_password",
      "token",
      "jwt",
      "secret",
      "api_key",
      "apiKey",
      "authorization",
      "Authorization",
      "cookie",
      "req.headers.authorization",
      "req.body.password",
      "req.body.token",
    ],
    remove: true, // Remove redacted fields entirely
  },

  // Formatters
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },

  // Timestamp format
  timestamp: pino.stdTimeFunctions.isoTime,
});

export { logger };



