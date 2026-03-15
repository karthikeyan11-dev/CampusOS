const { pool } = require('../src/config/database');

async function testConnection() {
  console.log('🔍 Testing Database Connection...');
  try {
    const start = Date.now();
    const result = await pool.query('SELECT NOW() as current_time, current_database() as db_name');
    const duration = Date.now() - start;
    
    console.log('✅ Database connected successfully');
    console.log(`📡 Database name: ${result.rows[0].db_name}`);
    console.log(`⏰ Current server time: ${result.rows[0].current_time}`);
    console.log(`⏱️ Query duration: ${duration}ms`);
    
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('Error Details:', error.message);
  } finally {
    await pool.end();
    process.exit();
  }
}

testConnection();
