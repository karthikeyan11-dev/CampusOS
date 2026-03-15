const { pool } = require('../src/config/database');

async function migrate() {
  try {
    console.log('🚀 Updating gate_pass_status enum...');
    await pool.query("ALTER TYPE gate_pass_status ADD VALUE IF NOT EXISTS 'exited'");
    console.log('✅ Enum updated successfully');
  } catch (error) {
    if (error.code === '42710') {
      console.log('ℹ️ Value already exists in enum');
    } else {
      console.error('❌ Migration failed:', error.message);
    }
  } finally {
    process.exit();
  }
}

migrate();
