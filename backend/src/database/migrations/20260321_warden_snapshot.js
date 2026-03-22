/**
 * Warden Snapshot Migration
 * Date: 2026-03-21
 */

const { pool } = require('../../config/database');

async function runMigration() {
  console.log('🚀 Running Warden Snapshot Migration...');

  try {
    // 1. Add snapshot columns to gate_passes
    console.log('   Adding snapshot columns to gate_passes...');
    await pool.query(`
      ALTER TABLE gate_passes 
      ADD COLUMN IF NOT EXISTS warden_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS warden_mobile VARCHAR(20),
      ADD COLUMN IF NOT EXISTS warden_snapshot_id UUID REFERENCES users(id) ON DELETE SET NULL;
    `);
    console.log('   ✅ Snapshot columns added');

    // 2. Populate existing snapshots (optional but good for consistency)
    await pool.query(`
      UPDATE gate_passes gp
      SET warden_name = u.name,
          warden_mobile = u.phone,
          warden_snapshot_id = u.id
      FROM users u
      WHERE gp.warden_approver_id = u.id
      AND gp.warden_name IS NULL;
    `);
    console.log('   ✅ Existing snapshots backfilled');

    console.log('✅ Warden Snapshot Migration completed successfully!');
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
