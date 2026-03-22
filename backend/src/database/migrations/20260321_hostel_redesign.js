/**
 * Hostel Redesign & DB-Level Transition Guard Migration
 * Date: 2026-03-21
 */

const { pool } = require('../../config/database');

async function runMigration() {
  console.log('🚀 Running Hostel Redesign & Transition Guard Migration...');

  try {
    // 1. Redesign hostels table
    console.log('   Updating hostels table schema...');
    await pool.query(`
      ALTER TABLE hostels 
      ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'building',
      ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 100,
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS deputy_warden_id UUID REFERENCES users(id) ON DELETE SET NULL;
    `);
    
    // Ensure warden_id is nullable if it isn't already
    await pool.query(`ALTER TABLE hostels ALTER COLUMN warden_id DROP NOT NULL`);
    console.log('   ✅ hostels table updated');

    // 2. DB-Level Transition Guard (Task 1)
    console.log('   Implementing database-level transition guard...');
    
    // Function to enforce valid state transitions
    await pool.query(`
      CREATE OR REPLACE FUNCTION enforce_gate_pass_status_transition()
      RETURNS TRIGGER AS $$
      DECLARE
        current_status gate_pass_status;
        new_status gate_pass_status;
      BEGIN
        current_status := OLD.status;
        new_status := NEW.status;

        -- If status hasn't changed, allow it (e.g., updating remarks)
        IF current_status = new_status THEN
          RETURN NEW;
        END IF;

        -- Strict transition logic
        IF current_status = 'pending_faculty' AND new_status NOT IN ('mentor_approved', 'rejected') THEN
          RAISE EXCEPTION 'Invalid transition from pending_faculty to %', new_status;
        ELSIF current_status = 'mentor_approved' AND new_status NOT IN ('hod_approved', 'approved', 'rejected') THEN
          RAISE EXCEPTION 'Invalid transition from mentor_approved to %', new_status;
        ELSIF current_status = 'hod_approved' AND new_status NOT IN ('warden_approved', 'approved', 'rejected') THEN
          RAISE EXCEPTION 'Invalid transition from hod_approved to %', new_status;
        ELSIF current_status = 'warden_approved' AND new_status NOT IN ('approved', 'rejected') THEN
          RAISE EXCEPTION 'Invalid transition from warden_approved to %', new_status;
        ELSIF current_status = 'approved' AND new_status NOT IN ('opened', 'expired') THEN
          RAISE EXCEPTION 'Invalid transition from approved to %', new_status;
        ELSIF current_status = 'opened' AND new_status NOT IN ('yet_to_be_closed', 'closed') THEN
          RAISE EXCEPTION 'Invalid transition from opened to %', new_status;
        ELSIF current_status = 'yet_to_be_closed' AND new_status NOT IN ('closed', 'expired') THEN
          RAISE EXCEPTION 'Invalid transition from yet_to_be_closed to %', new_status;
        
        -- Terminal states: closed, expired, rejected
        ELSIF current_status IN ('closed', 'expired', 'rejected') THEN
          RAISE EXCEPTION 'Cannot change status from terminal state %', current_status;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_guard_gate_pass_status ON gate_passes;
      CREATE TRIGGER trigger_guard_gate_pass_status
      BEFORE UPDATE OF status ON gate_passes
      FOR EACH ROW EXECUTE FUNCTION enforce_gate_pass_status_transition();
    `);
    console.log('   ✅ DB-level transition guard implemented');

    // 3. Add year_of_study to students (Task 9)
    console.log('   Updating student profile schema...');
    await pool.query(`
      ALTER TABLE students 
      ADD COLUMN IF NOT EXISTS year_of_study INTEGER DEFAULT 1;
    `);
    console.log('   ✅ Student profile schema updated');

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
