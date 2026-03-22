const { pool } = require('../../config/database');

async function runMigration() {
  console.log('🚀 Running Gate Pass Expiry Engine Update...');

  try {
    // 1. Add valid_until column to gate_passes if it doesn't exist
    console.log('   Checking for valid_until column...');
    const colExists = await pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='gate_passes' AND column_name='valid_until'`
    );
    if (colExists.rows.length === 0) {
      await pool.query(`ALTER TABLE gate_passes ADD COLUMN valid_until TIMESTAMP WITH TIME ZONE`);
      console.log('     Added gate_passes.valid_until');
    }

    // 2. Populate valid_until for existing records (based on return_date + return_time)
    console.log('   Populating valid_until for existing records...');
    await pool.query(`
      UPDATE gate_passes 
      SET valid_until = (leave_date::text || ' ' || return_time::text)::timestamp 
      WHERE valid_until IS NULL 
        AND leave_date IS NOT NULL 
        AND return_time IS NOT NULL
    `);
    
    // Fallback for those without return_time (status 'approved' unused)
    await pool.query(`
      UPDATE gate_passes 
      SET valid_until = (leave_date::text || ' ' || out_time::text)::timestamp + interval '4 hours'
      WHERE valid_until IS NULL 
        AND leave_date IS NOT NULL 
        AND out_time IS NOT NULL
    `);

    console.log('✅ Gate Pass Expiry Engine Update completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

if (require.main === module) {
  runMigration().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { runMigration };
