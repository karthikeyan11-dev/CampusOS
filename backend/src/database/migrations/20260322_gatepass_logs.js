const { pool } = require('../../config/database');

async function runMigration() {
  console.log('🚀 Creating Gatepass Audit Logs infrastructure...');

  try {
    // 1. Create gatepass_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gatepass_logs (
        id SERIAL PRIMARY KEY,
        gatepass_id UUID REFERENCES gate_passes(id) ON DELETE CASCADE,
        actor_id UUID REFERENCES users(id),
        status_from VARCHAR(50),
        status_to VARCHAR(50),
        remarks TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('     Created/Verified gatepass_logs table');

    // 2. Add indices for performant auditing
    await pool.query('CREATE INDEX IF NOT EXISTS idx_gatepass_logs_id ON gatepass_logs(gatepass_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_gatepass_logs_actor ON gatepass_logs(actor_id)');
    
    console.log('✅ Gatepass Audit Logs setup completed successfully!');
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
