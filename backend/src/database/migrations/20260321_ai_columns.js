/**
 * AI Verification Columns Migration
 * Date: 2026-03-21
 */

const { pool } = require('../../config/database');

async function runMigration() {
  console.log('🚀 Adding AI Verification columns...');

  try {
    const tables = ['students', 'faculty'];
    for (const table of tables) {
      await pool.query(`
        ALTER TABLE ${table} 
        ADD COLUMN IF NOT EXISTS ai_verified BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS ai_remarks TEXT;
      `);
      console.log(`   ✅ Columns added to ${table}`);
    }
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

if (require.main === module) {
  runMigration().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { runMigration };
