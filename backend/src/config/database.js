const { Pool } = require('pg');
const config = require('./env');

const pool = new Pool({
  connectionString: config.db.connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased timeout to 10s
  ssl: config.db.connectionString ? {
    rejectUnauthorized: false
  } : false
});

pool.on('connect', (client) => {
  console.log('📦 Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err.message);
  // Do NOT exit process on transient errors, let the next query try to reconnect
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
