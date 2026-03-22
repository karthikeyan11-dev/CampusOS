/**
 * Final Hardening Migration - Indexes & Audit Logs
 * Date: 2026-03-21
 */

const { pool } = require('../../config/database');

async function runMigration() {
  console.log('🚀 Running Final Hardening Migration...');

  try {
    // 1. Performance Indexes
    console.log('   Adding performance indexes...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_students_roll_number ON students(roll_number);
      CREATE INDEX IF NOT EXISTS idx_gate_passes_status ON gate_passes(status);
      CREATE INDEX IF NOT EXISTS idx_gate_passes_user_id ON gate_passes(user_id);
      CREATE INDEX IF NOT EXISTS idx_gate_passes_hostel_id ON gate_passes(hostel_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);
    console.log('   ✅ Performance indexes added');

    // 2. Clear scan cache (optional but good for consistency after migration)
    // Handled in backend.

    console.log('✅ Final Hardening Migration completed successfully!');
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
