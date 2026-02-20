import cron from 'node-cron';
import express from 'express';
import { createLogger } from '@restocked/shared/logger';
import { runStockCheck } from './jobs/stockChecker.js';
import { config } from './config.js';

const log = createLogger('worker');
const HEALTH_PORT = 3001;

// ── Health tracking (in-memory) ────────────────────────────────────────────
interface HealthState {
  startedAt: Date;
  lastCheckStartedAt: Date | null;
  lastCheckCompletedAt: Date | null;
  lastCheckDurationMs: number | null;
  productsChecked: number;
  checksSucceeded: number;
  checksFailed: number;
  recentFailures: Array<{ url: string; error: string; timestamp: string }>;
  isRunning: boolean;
}

const health: HealthState = {
  startedAt: new Date(),
  lastCheckStartedAt: null,
  lastCheckCompletedAt: null,
  lastCheckDurationMs: null,
  productsChecked: 0,
  checksSucceeded: 0,
  checksFailed: 0,
  recentFailures: [],
  isRunning: false,
};

// Track current running job for graceful shutdown
let currentJob: Promise<void> | null = null;
let isShuttingDown = false;

// ── Wrapped stock check with health tracking ───────────────────────────────
async function runTrackedStockCheck(): Promise<void> {
  if (isShuttingDown) return;

  health.isRunning = true;
  health.lastCheckStartedAt = new Date();
  const start = Date.now();

  try {
    await runStockCheck();
    health.checksSucceeded++;
  } catch (err) {
    health.checksFailed++;
    log.error({ err }, 'Stock check failed');
  } finally {
    health.isRunning = false;
    health.lastCheckCompletedAt = new Date();
    health.lastCheckDurationMs = Date.now() - start;
  }
}

// ── Health endpoint ────────────────────────────────────────────────────────
const healthApp = express();

healthApp.get('/health', (_req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - health.startedAt.getTime()) / 1000);
  res.json({
    status: isShuttingDown ? 'shutting_down' : (health.isRunning ? 'checking' : 'healthy'),
    startedAt: health.startedAt.toISOString(),
    uptimeSeconds,
    lastCheckAt: health.lastCheckCompletedAt?.toISOString() ?? null,
    lastCheckDurationMs: health.lastCheckDurationMs,
    checksSucceeded: health.checksSucceeded,
    checksFailed: health.checksFailed,
    isRunning: health.isRunning,
  });
});

healthApp.get('/health/failures', (_req, res) => {
  res.json({ failures: health.recentFailures });
});

healthApp.listen(HEALTH_PORT, () => {
  log.info({ port: HEALTH_PORT }, 'Worker health endpoint started');
});

// ── Start worker ───────────────────────────────────────────────────────────
log.info({ env: config.env }, 'Worker starting');

// Run stock check every 5 minutes
// This is the minimum interval - actual checks respect per-user plan limits
cron.schedule('*/5 * * * *', async () => {
  log.info('Cron triggered: running stock check');
  currentJob = runTrackedStockCheck();
  await currentJob;
  currentJob = null;
});

// Also run immediately on startup
log.info('Running initial stock check...');
currentJob = runTrackedStockCheck();
currentJob.then(() => {
  currentJob = null;
  log.info('Initial stock check complete, scheduled every 5 minutes');
});

// ── Graceful shutdown ──────────────────────────────────────────────────────
async function shutdown(signal: string) {
  log.info({ signal }, 'Shutdown signal received');
  isShuttingDown = true;

  if (currentJob) {
    log.info('Waiting for in-flight stock check to complete...');
    await currentJob;
    log.info('In-flight job completed');
  }

  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
