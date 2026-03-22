/**
 * CampusOS System Hardening & Idempotency Migration
 * Date: 2026-03-21
 * Description: Adds gate_pass_actions log, state machine constraints, and performance indexes.
 */

const { pool } = require('../../config/database');

async function runMigration() {
  console.log('🚀 Running System Hardening & Idempotency Migration...');

  try {
    // 1. Create gate_pass_actions table for strict idempotency
    console.log('   Creating gate_pass_actions table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gate_pass_actions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        gate_pass_id UUID NOT NULL REFERENCES gate_passes(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id), -- Who performed it (Security Staff)
        action_type VARCHAR(20) NOT NULL, -- 'open' or 'close'
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        -- Force absolute physical idempotency:
        -- One 'open' action and one 'close' action per gate pass.
        UNIQUE(gate_pass_id, action_type)
      )
    `);
    console.log('   ✅ gate_pass_actions table created');

    // 2. Add performance indexes for status-based queries and scheduler
    console.log('   Adding performance indexes...');
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_gate_passes_status_active ON gate_passes(status) WHERE status IN ('approved', 'opened', 'yet_to_be_closed')`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_gate_passes_scan_time ON gate_passes(exit_scanned_at, return_scanned_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_gate_pass_actions_gp_id ON gate_pass_actions(gate_pass_id)`);
    console.log('   ✅ Indexes added');

    // 3. Add CHECK constraints for Gate Pass state logic (Double-Layer Protection)
    console.log('   Adding state machine check constraints...');
    // This ensures no manual SQL can ever put a pass into an impossible state.
    // Note: We use a check on exit/return scan timestamps based on status.
    await pool.query(`
      ALTER TABLE gate_passes 
      DROP CONSTRAINT IF EXISTS ck_gate_pass_state_validity;
      
      ALTER TABLE gate_passes
      ADD CONSTRAINT ck_gate_pass_state_validity
      CHECK (
        (status = 'opened' AND exit_scanned_at IS NOT NULL) OR
        (status = 'yet_to_be_closed' AND exit_scanned_at IS NOT NULL) OR
        (status = 'closed' AND exit_scanned_at IS NOT NULL AND return_scanned_at IS NOT NULL) OR
        (status NOT IN ('opened', 'yet_to_be_closed', 'closed'))
      );
    `);
    console.log('   ✅ State machine constraints enforced');

    // 4. Room Capacity Hardening: Ensure occupancy never exceeds capacity
    console.log('   Enforcing room capacity constraints...');
    await pool.query(`
      ALTER TABLE rooms
      DROP CONSTRAINT IF EXISTS ck_room_capacity;
      
      ALTER TABLE rooms
      ADD CONSTRAINT ck_room_capacity
      CHECK (occupancy <= capacity);
    `);
    console.log('   ✅ Room capacity constraints enforced');

    console.log('✅ System Hardening Migration completed successfully!');
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
