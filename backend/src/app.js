require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const config = require('./config/env');

// Import routes
const authRoutes = require('./modules/auth/auth.routes');
const notificationRoutes = require('./modules/notifications/notifications.routes');
const complaintRoutes = require('./modules/complaints/complaints.routes');
const gatepassRoutes = require('./modules/gatepass/gatepass.routes');
const resourceRoutes = require('./modules/resources/resources.routes');
const lostfoundRoutes = require('./modules/lostfound/lostfound.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const departmentRoutes = require('./modules/departments/departments.routes');

const app = express();

// Correlation ID for tracing
const { v4: uuidv4 } = require('uuid');
app.use((req, res, next) => {
  req.id = req.headers['x-correlation-id'] || uuidv4();
  res.setHeader('x-correlation-id', req.id);
  console.log(`[${req.method}] ${req.url}`);
  next();
});

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 🚩 PHASE 10: Mandatory Redis Rate Limiter
const redisRateLimiter = require('./middleware/rate-limiter.middleware');

const apiLimiter = redisRateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Institutional API rate limit exceeded. Layer stabilized.'
});

const authLimiter = redisRateLimiter({
  windowMs: 15 * 60 * 1000, 
  max: 10,
  message: 'Too many auth attempts. Identity Hub locked for 15 minutes.'
});

const gatepassLimiter = redisRateLimiter({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: 'Gatepass scanning burst detected. Throttling active.'
});

app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/gatepass/scan', gatepassLimiter);
app.use('/api/gatepass/open', gatepassLimiter);
app.use('/api/gatepass/close', gatepassLimiter);

// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ============================================
// API ROUTES
// ============================================

app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/gatepass', gatepassRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/lostfound', lostfoundRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/hostels', require('./modules/hostel/hostel.routes'));
app.use('/api/governance', require('./modules/governance/governance.routes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'CampusOS API is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  console.error(err.stack);

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 10MB.',
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected file field.',
    });
  }

  // PostgreSQL errors
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry. This record already exists.',
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced record not found.',
    });
  }

  res.status(err.status || 500).json({
    success: false,
    error_code: err.code || 'INTERNAL_ERROR',
    message: config.nodeEnv === 'production'
      ? 'Internal server error.'
      : err.message,
    details: config.nodeEnv === 'development' ? err.stack : undefined
  });
});

// ============================================
// START SERVER (PHASE 10 VALIDATION)
// ============================================

const PORT = config.port;

const startServer = async () => {
  try {
    console.log('\n🚀 Starting CampusOS API Server (Development Mode)...');
    
    // 🚩 PHASE 10: Mandatory Redis Synchronization
    const { initRedis } = require('./services/redis.service');
    await initRedis();
    
    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════╗
║                                          ║
║   🏫 CampusOS API Server                ║
║                                          ║
║   Port:        ${PORT}                      ║
║   Environment: ${config.nodeEnv.padEnd(20)} ║
║   Frontend:    ${config.frontendUrl.padEnd(20)} ║
║   Redis:       Connected (Mandatory)      ║
║                                          ║
╚══════════════════════════════════════════╝
      `);

      // Start Scheduler
      const { startScheduler } = require('./services/scheduler.service');
      startScheduler();
    });
  } catch (err) {
    console.error('🛑 [FATAL] Server initialization failed:', err.message);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;
