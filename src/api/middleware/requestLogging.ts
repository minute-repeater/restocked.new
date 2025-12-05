import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";

/**
 * Request logging middleware
 * Logs all incoming requests with method, path, userId (if authenticated), and response time
 */
export function requestLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();
  const userId = (req as any).user?.id;

  // Log request
  logger.info({
    method: req.method,
    path: req.path,
    userId: userId || undefined,
    ip: req.ip,
  }, "Incoming request");

  // Log response when finished
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    
    logger[logLevel]({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: userId || undefined,
    }, "Request completed");
  });

  next();
}


