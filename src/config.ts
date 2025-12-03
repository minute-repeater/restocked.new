/**
 * Centralized configuration management
 * Reads environment variables and provides typed access to app configuration
 */

/**
 * Application environment
 */
export type AppEnvironment = "development" | "production";

/**
 * Application configuration
 */
export interface AppConfig {
  // Environment
  appEnv: AppEnvironment;
  isDevelopment: boolean;
  isProduction: boolean;

  // URLs
  frontendUrl: string;
  backendUrl: string;

  // Server
  port: number;

  // Database
  databaseUrl: string;

  // Auth
  jwtSecret: string;

  // Email
  resendApiKey: string | null;
  emailFrom: string;
  emailFromName: string;

  // Schedulers
  enableScheduler: boolean;
  enableCheckScheduler: boolean;
  enableEmailScheduler: boolean;
  checkSchedulerIntervalMinutes: number;
  emailDeliveryIntervalMinutes: number;

  // Dev mode flags (only work in development)
  enableDevAdmin: boolean;
  enableDevFastChecks: boolean;

  // Check worker config
  minCheckIntervalMinutes: number;
  maxProductsPerRun: number;
  checkLockTimeoutSeconds: number;

  // App version
  appVersion: string;
}

/**
 * Determine app environment from APP_ENV or NODE_ENV
 */
function getAppEnvironment(): AppEnvironment {
  const appEnv = process.env.APP_ENV?.toLowerCase();
  const nodeEnv = process.env.NODE_ENV?.toLowerCase();

  if (appEnv === "production" || appEnv === "prod") {
    return "production";
  }
  if (appEnv === "development" || appEnv === "dev") {
    return "development";
  }
  if (nodeEnv === "production") {
    return "production";
  }

  // Default to development
  return "development";
}

/**
 * Get app version from package.json or env
 * Uses dynamic import to avoid CommonJS require in ESM
 */
async function getAppVersion(): Promise<string> {
  // Try environment variable first
  if (process.env.APP_VERSION) {
    return process.env.APP_VERSION;
  }

  // Try to read from package.json using fs
  try {
    const fs = await import("fs");
    const path = await import("path");
    const { fileURLToPath } = await import("url");
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const packageJsonPath = path.join(__dirname, "../../package.json");
    const packageJsonContent = fs.readFileSync(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageJsonContent);
    return packageJson.version || "1.0.0";
  } catch {
    // Fallback if package.json not available
    return "1.0.0";
  }
}

/**
 * Load and validate configuration
 * Note: getAppVersion is async, so we'll call it synchronously with a fallback
 */
function loadConfig(): AppConfig {
  const appEnv = getAppEnvironment();
  const isDevelopment = appEnv === "development";
  const isProduction = appEnv === "production";

  // Required environment variables
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is required");
  }

  // URLs
  const frontendUrl = process.env.FRONTEND_URL || (isDevelopment ? "http://localhost:5173" : "");
  const backendUrl = process.env.BACKEND_URL || (isDevelopment ? "http://localhost:3000" : "");

  if (isProduction && !frontendUrl) {
    throw new Error("FRONTEND_URL is required in production");
  }

  // Server
  const port = parseInt(process.env.PORT || "3000", 10);

  // Email
  const resendApiKey = process.env.RESEND_API_KEY || null;
  const emailFrom = process.env.EMAIL_FROM || "notifications@restocked.now";
  const emailFromName = process.env.EMAIL_FROM_NAME || "Restocked";

  // Schedulers
  // In production, enable by default unless explicitly disabled
  // In development, disable by default unless explicitly enabled
  const enableScheduler = isProduction
    ? process.env.ENABLE_SCHEDULER !== "false"
    : process.env.ENABLE_SCHEDULER === "true";

  const enableCheckScheduler = isProduction
    ? process.env.ENABLE_CHECK_SCHEDULER !== "false"
    : process.env.ENABLE_CHECK_SCHEDULER === "true";

  const enableEmailScheduler = isProduction
    ? process.env.ENABLE_EMAIL_SCHEDULER !== "false"
    : process.env.ENABLE_EMAIL_SCHEDULER === "true";

  const checkSchedulerIntervalMinutes = parseInt(
    process.env.CHECK_SCHEDULER_INTERVAL_MINUTES || "30",
    10
  );

  const emailDeliveryIntervalMinutes = parseInt(
    process.env.EMAIL_DELIVERY_INTERVAL_MINUTES || "5",
    10
  );

  // Dev mode flags (only work in development)
  const enableDevAdmin = isDevelopment && process.env.ENABLE_DEV_ADMIN === "true";
  const enableDevFastChecks = isDevelopment && process.env.ENABLE_DEV_FAST_CHECKS === "true";

  // Check worker config
  const minCheckIntervalMinutes = enableDevFastChecks
    ? 0
    : parseInt(process.env.MIN_CHECK_INTERVAL_MINUTES || "30", 10);

  const maxProductsPerRun = parseInt(process.env.MAX_PRODUCTS_PER_RUN || "50", 10);

  const checkLockTimeoutSeconds = enableDevFastChecks
    ? 10
    : parseInt(process.env.CHECK_LOCK_TIMEOUT_SECONDS || "300", 10);

  return {
    appEnv,
    isDevelopment,
    isProduction,
    frontendUrl,
    backendUrl,
    port,
    databaseUrl,
    jwtSecret,
    resendApiKey,
    emailFrom,
    emailFromName,
    enableScheduler,
    enableCheckScheduler,
    enableEmailScheduler,
    checkSchedulerIntervalMinutes,
    emailDeliveryIntervalMinutes,
    enableDevAdmin,
    enableDevFastChecks,
    minCheckIntervalMinutes,
    maxProductsPerRun,
    checkLockTimeoutSeconds,
    appVersion: process.env.APP_VERSION || "1.0.0", // Will be updated on first access if needed
  };
}

/**
 * Get app version (async version for runtime access)
 */
export async function getAppVersionAsync(): Promise<string> {
  if (process.env.APP_VERSION) {
    return process.env.APP_VERSION;
  }
  try {
    const fs = await import("fs");
    const path = await import("path");
    const { fileURLToPath } = await import("url");
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const packageJsonPath = path.join(__dirname, "../../package.json");
    const packageJsonContent = fs.readFileSync(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageJsonContent);
    return packageJson.version || "1.0.0";
  } catch {
    return "1.0.0";
  }
}

/**
 * Global app configuration
 * Loaded once at module initialization
 */
export const config: AppConfig = loadConfig();

/**
 * Validate configuration (useful for startup checks)
 */
export function validateConfig(): void {
  if (config.isProduction) {
    if (!config.frontendUrl) {
      throw new Error("FRONTEND_URL is required in production");
    }
    if (!config.backendUrl) {
      throw new Error("BACKEND_URL is required in production");
    }
  }
}

