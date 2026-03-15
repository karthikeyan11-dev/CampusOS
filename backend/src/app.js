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

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

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
    message: config.nodeEnv === 'production'
      ? 'Internal server error.'
      : err.message,
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║                                          ║
  ║   🏫 CampusOS API Server                ║
  ║                                          ║
  ║   Port:        ${PORT}                      ║
  ║   Environment: ${config.nodeEnv.padEnd(20)} ║
  ║   Frontend:    ${config.frontendUrl.padEnd(20)} ║
  ║                                          ║
  ╚══════════════════════════════════════════╝
  `);

  // Start background scheduler for automated jobs
  const { startScheduler } = require('./services/scheduler.service');
  startScheduler();
});

module.exports = app;
