const { pool } = require('../../config/database');

async function runMigration() {
  console.log('🚀 Running Faculty Gatepass & Audit Logs Migration...');

  try {
    // 1. Ensure department_id exists in faculty table
    console.log('   Checking department_id in faculty table...');
    const facultyDeptCol = await pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='faculty' AND column_name='department_id'`
    );
    if (facultyDeptCol.rows.length === 0) {
      await pool.query(`ALTER TABLE faculty ADD COLUMN department_id UUID REFERENCES departments(id) ON DELETE SET NULL`);
      console.log('     Added faculty.department_id');
      
      // Sync from users table initially
      await pool.query(`
        UPDATE faculty f
        SET department_id = u.department_id
        FROM users u
        WHERE f.user_id = u.id AND u.department_id IS NOT NULL;
      `);
      console.log('     Synced department_id from users table');
    }

    // 2. Add waiting to gate_pass_status enum
    console.log('   Updating gate_pass_status enum...');
    const waitingExists = await pool.query(
      `SELECT 1 FROM pg_enum WHERE enumlabel = 'waiting' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'gate_pass_status')`
    );
    if (waitingExists.rows.length === 0) {
      await pool.query(`ALTER TYPE gate_pass_status ADD VALUE 'waiting' BEFORE 'pending_faculty'`);
      console.log('     Added waiting status to enum');
    }

    // 3. Add user_role discriminator to gate_passes 
    console.log('   Updating gate_passes table...');
    const gpUserRole = await pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='gate_passes' AND column_name='user_role'`
    );
    if (gpUserRole.rows.length === 0) {
      await pool.query(`ALTER TABLE gate_passes ADD COLUMN user_role user_role`);
      console.log('     Added gate_passes.user_role');
      
      // Populate existing rows
      await pool.query(`
        UPDATE gate_passes gp
        SET user_role = u.role
        FROM users u
        WHERE gp.user_id = u.id;
      `);
      console.log('     Populated user_role for existing records');
    }

    // 4. Create gate_pass_logs table
    console.log('   Creating gate_pass_logs table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gate_pass_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        gate_pass_id UUID REFERENCES gate_passes(id) ON DELETE CASCADE,
        actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
        state_from VARCHAR(50), 
        state_to VARCHAR(50),
        remarks TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_gate_pass_logs_gp ON gate_pass_logs(gate_pass_id)`);
    console.log('   ✅ gate_pass_logs table created');

    console.log('✅ Faculty Gatepass Migration completed successfully!');
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
