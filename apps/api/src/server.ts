import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createLogger } from '@restocked/shared/logger';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import trackingRoutes from './routes/tracking.routes.js';

const log = createLogger('api');
const app = express();

// Security middleware
app.use(helmet());

// CORS
const allowedOrigins = [config.frontendUrl];
if (config.env === 'development') {
  allowedOrigins.push('http://localhost:5173');
}
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later' },
});

app.use(globalLimiter);

// Body parsing
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth/register', authLimiter);
app.use('/auth/login', authLimiter);
app.use('/auth/forgot-password', authLimiter);
app.use('/auth/reset-password', authLimiter);
app.use('/auth/google', authLimiter);
app.use('/auth', authRoutes);
app.use('/tracking', trackingRoutes);

// Error handling
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  log.info({ port: config.port, env: config.env }, 'API server started');
});
