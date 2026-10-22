import './env';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { initSocketServer, setIO, SocketIOServer } from './socket/socketServer';
import { initRoutes } from './routes';
import { stripeWebhookHandler } from './routes/billingWebhook';
import { bootstrapCommunity } from './services/communityBootstrap';
import { corsOriginDelegate } from './utils/corsOrigins';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 4000;

// Trust reverse proxy only when deployed behind one.
if (process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression({ level: 6, threshold: 1024 }));

// Credentialed requests are limited to configured/canonical frontend origins.
app.use(cors({
  origin: corsOriginDelegate,
  credentials: true,
}));
app.use(rateLimit({
  windowMs: 60_000,
  limit: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Stripe retries can burst; its webhook authenticates via signature instead.
  skip: (req) => req.path === '/health' || req.path === '/api/billing/webhook',
}));

// Stripe webhook needs the raw body for signature verification, so it must be
// mounted before express.json() consumes the stream.
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('combined'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Metrics endpoint
const serverStartedAt = new Date().toISOString();
app.get('/metrics', (req, res) => {
  res.json({
    startedAt: serverStartedAt,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    activeConnections: io?.engine?.clientsCount || 0,
  });
});

// Initialize routes
initRoutes(app);

// Initialize Socket.io
const io: SocketIOServer = initSocketServer(httpServer);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Initialize global Socket.io instance
setIO(io);

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io server initialized`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

  // Idempotent seed of global channels + achievement catalog.
  void bootstrapCommunity();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { io };
