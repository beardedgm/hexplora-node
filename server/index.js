import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import {
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_GENERAL,
  RATE_LIMIT_MAX_AUTH,
  RATE_LIMIT_MAX_MAP_WRITE,
  RATE_LIMIT_MAP_WRITE_WINDOW_MS,
  BODY_SIZE_LIMIT,
} from './config/constants.js';
import authRoutes from './routes/auth.js';
import mapRoutes from './routes/maps.js';
import patreonRoutes from './routes/patreon.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Trust first proxy (Render) — required for rate limiting to see real client IPs
app.set('trust proxy', 1);

// Connect to MongoDB
connectDB();

// --- Security Middleware ---

// Security headers (X-Frame-Options, HSTS, CSP, X-Content-Type-Options, etc.)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://www.googletagmanager.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://www.google-analytics.com"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://fonts.gstatic.com", "https://fonts.googleapis.com"],
      connectSrc: ["'self'", "https://www.google-analytics.com", "https://www.googletagmanager.com"],
    },
  },
}));

// CORS — lock to our frontend origin only (was wide-open before)
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// Body parsers
app.use(express.json({ limit: BODY_SIZE_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_SIZE_LIMIT }));

// Strip MongoDB operators ($, .) from request body/query/params — prevents NoSQL injection
app.use(mongoSanitize());

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_GENERAL,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api', generalLimiter);

// Strict auth rate limiter
const authLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_AUTH,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Map write rate limiter (POST/PUT/DELETE)
const mapWriteLimiter = rateLimit({
  windowMs: RATE_LIMIT_MAP_WRITE_WINDOW_MS,
  max: RATE_LIMIT_MAX_MAP_WRITE,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many map operations, please try again shortly' },
  skip: (req) => req.method === 'GET',
});
app.use('/api/maps', mapWriteLimiter);

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/maps', mapRoutes);
app.use('/api/patreon', patreonRoutes);

// Serve Vite-built static files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));

  // SPA fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`HexPlora server running on port ${PORT}`);
});
