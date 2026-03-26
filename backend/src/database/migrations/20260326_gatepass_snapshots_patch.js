const { pool } = require('../../config/database');

async function runMigration() {
  console.log('🚀 Running Gatepass Snapshot Columns Patch...');

  try {
    // 1. Add missing snapshot columns to gate_passes table
    // These are required by the controller logic in approveGatePass to store immutable names
    console.log('   Adding faculty_name, hod_name, admin_name columns to gate_passes...');
    await pool.query(`
      ALTER TABLE gate_passes 
      ADD COLUMN IF NOT EXISTS faculty_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS hod_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS admin_name VARCHAR(100);
    `);
    console.log('   ✅ Snapshot columns added successfully');

    // 2. Backfill from existing user relations for consistency
    console.log('   Backfilling existing snapshot names...');
    await pool.query(`
      UPDATE gate_passes gp
      SET faculty_name = u.name
      FROM users u
      WHERE gp.faculty_approver_id = u.id AND gp.faculty_name IS NULL;
      
      UPDATE gate_passes gp
      SET hod_name = u.name
      FROM users u
      WHERE gp.hod_approver_id = u.id AND gp.hod_name IS NULL;
      
      UPDATE gate_passes gp
      SET admin_name = u.name
      FROM users u
      WHERE gp.admin_approver_id = u.id AND gp.admin_name IS NULL;
    `);
    console.log('   ✅ Backfill completed');

    console.log('✅ Gatepass Snapshot Patch completed successfully!');
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
