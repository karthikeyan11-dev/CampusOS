const { Pool } = require('pg');
const config = require('./env');

const pool = new Pool({
  connectionString: config.db.connectionString,
  // Only use detailed params if connectionString is missing
  ...(!config.db.connectionString && {
    host: config.db.host,
    port: config.db.port,
    database: config.db.name,
    user: config.db.user,
    password: config.db.password,
  }),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // Increased for remote connections
  // Enable SSL Support for Supabase/Neon/Railway
  ssl: config.db.connectionString ? {
    rejectUnauthorized: false
  } : false
});

pool.on('connect', () => {
  console.log('📦 Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

// Helper for transactional queries
const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { pool, withTransaction };
