require('dotenv').config();

const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  db: {
    connectionString: process.env.DATABASE_URL,
  },
  
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    qrSecret: process.env.JWT_QR_SECRET,
  },
  
  groq: {
    apiKey: process.env.GROQ_API_KEY,
  },
  
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'CampusOS <noreply@campusos.edu>',
  },
  
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },
  
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  },
  
  redis: {
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  },
};

// ============================================
// ENV VALIDATION (PHASE 1)
// ============================================
const validateEnv = () => {
  const isProd = config.nodeEnv === 'production';
  const errors = [];

  // 1. Database
  if (!config.db.connectionString) errors.push('DATABASE_URL is missing.');

  // 2. JWT (Phase 2 Hardening)
  if (!config.jwt.accessSecret) errors.push('JWT_ACCESS_SECRET is missing.');
  else if (isProd && config.jwt.accessSecret.length < 32) errors.push('JWT_ACCESS_SECRET must be at least 32 characters in production.');

  if (!config.jwt.refreshSecret) errors.push('JWT_REFRESH_SECRET is missing.');
  else if (config.jwt.refreshSecret === config.jwt.accessSecret) errors.push('JWT_REFRESH_SECRET must be different from JWT_ACCESS_SECRET.');

  if (!config.jwt.qrSecret) errors.push('JWT_QR_SECRET is missing.');

  // 3. Redis (Upstash Mandatory)
  if (!config.redis.url) errors.push('UPSTASH_REDIS_REST_URL is missing.');
  if (!config.redis.token) errors.push('UPSTASH_REDIS_REST_TOKEN is missing.');

  // 4. SMTP (Phase 3)
  if (!config.smtp.host) errors.push('SMTP_HOST is missing.');
  if (!config.smtp.user) errors.push('SMTP_USER is missing.');
  if (!config.smtp.pass) errors.push('SMTP_PASS is missing.');

  // 4. Twilio (Phase 4)
  if (!config.twilio.accountSid) errors.push('TWILIO_ACCOUNT_SID is missing.');
  if (!config.twilio.authToken) errors.push('TWILIO_AUTH_TOKEN is missing.');
  if (!config.twilio.phoneNumber) errors.push('TWILIO_PHONE_NUMBER is missing.');

  // 5. AI (Phase 6)
  if (!config.groq.apiKey) errors.push('GROQ_API_KEY is missing.');

  if (errors.length > 0) {
    console.error('\n❌ CONFIGURATION ERROR:');
    errors.forEach(err => console.error(`  - ${err}`));
    console.error('\nPlease update your .env file and restart the server.\n');
    if (isProd) process.exit(1);
    else console.warn('⚠️ Server running with configuration warnings in development mode.');
  } else {
    console.log('✅ Environment configuration validated.');
  }
};

validateEnv();

module.exports = config;
