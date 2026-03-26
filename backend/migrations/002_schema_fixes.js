require('dotenv').config();
const { pool } = require('../src/config/database');

/**
 * Migration 002: Schema Fixes
 * Adds all missing columns, tables, and enum values that the controllers require
 * This is fully additive and safe to run on an existing database.
 */
const migrationSQL = `
-- ============================================
-- 1. Fix ENUM TYPES (add missing gate_pass_status values)
-- ============================================

DO $$ BEGIN
  ALTER TYPE gate_pass_status ADD VALUE IF NOT EXISTS 'opened';
EXCEPTION WHEN others THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE gate_pass_status ADD VALUE IF NOT EXISTS 'yet_to_be_closed';
EXCEPTION WHEN others THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE gate_pass_status ADD VALUE IF NOT EXISTS 'closed';
EXCEPTION WHEN others THEN null;
END $$;

-- Add warden type for gate_pass_type enum if not already present
DO $$ BEGIN
  ALTER TYPE gate_pass_type ADD VALUE IF NOT EXISTS 'warden';
EXCEPTION WHEN others THEN null;
END $$;

-- ============================================
-- 2. Fix STUDENTS TABLE (add missing columns)
-- ============================================

ALTER TABLE students 
  ADD COLUMN IF NOT EXISTS mentor_id UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE students 
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_students_mentor ON students(mentor_id);

-- ============================================
-- 3. Fix FACULTY TABLE (add missing columns)
-- ============================================

ALTER TABLE faculty 
  ADD COLUMN IF NOT EXISTS faculty_type VARCHAR(20) DEFAULT 'academic';
  -- 'academic' or 'non_academic'

-- ============================================
-- 4. Fix HOSTELS TABLE (add missing columns)
-- ============================================

ALTER TABLE hostels 
  ADD COLUMN IF NOT EXISTS deputy_warden_id UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE hostels 
  ADD COLUMN IF NOT EXISTS type VARCHAR(50);

ALTER TABLE hostels 
  ADD COLUMN IF NOT EXISTS capacity INTEGER;

ALTER TABLE hostels 
  ADD COLUMN IF NOT EXISTS description TEXT;

CREATE INDEX IF NOT EXISTS idx_hostels_deputy_warden ON hostels(deputy_warden_id);

-- ============================================
-- 5. Fix GATE_PASSES TABLE (add missing columns)
-- ============================================

ALTER TABLE gate_passes 
  ADD COLUMN IF NOT EXISTS hostel_id UUID REFERENCES hostels(id) ON DELETE SET NULL;

ALTER TABLE gate_passes 
  ADD COLUMN IF NOT EXISTS user_role VARCHAR(50);

ALTER TABLE gate_passes 
  ADD COLUMN IF NOT EXISTS valid_until TIMESTAMP WITH TIME ZONE;

-- Snapshot columns for approver names
ALTER TABLE gate_passes 
  ADD COLUMN IF NOT EXISTS faculty_name VARCHAR(100);

ALTER TABLE gate_passes 
  ADD COLUMN IF NOT EXISTS hod_name VARCHAR(100);

ALTER TABLE gate_passes 
  ADD COLUMN IF NOT EXISTS warden_name VARCHAR(100);

ALTER TABLE gate_passes 
  ADD COLUMN IF NOT EXISTS warden_mobile VARCHAR(20);

ALTER TABLE gate_passes 
  ADD COLUMN IF NOT EXISTS warden_snapshot_id UUID;

ALTER TABLE gate_passes 
  ADD COLUMN IF NOT EXISTS admin_name VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_gatepasses_hostel ON gate_passes(hostel_id);
CREATE INDEX IF NOT EXISTS idx_gatepasses_valid_until ON gate_passes(valid_until);

-- ============================================
-- 6. Create GATE_PASS_LOGS table (audit trail)
-- ============================================

CREATE TABLE IF NOT EXISTS gate_pass_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gate_pass_id UUID NOT NULL REFERENCES gate_passes(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_name VARCHAR(100),
  state_from VARCHAR(50),
  state_to VARCHAR(50) NOT NULL,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gp_logs_pass ON gate_pass_logs(gate_pass_id);
CREATE INDEX IF NOT EXISTS idx_gp_logs_actor ON gate_pass_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_gp_logs_created ON gate_pass_logs(created_at DESC);

-- ============================================
-- 7. Create GATE_PASS_ACTIONS table (idempotency)
-- ============================================

CREATE TABLE IF NOT EXISTS gate_pass_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gate_pass_id UUID NOT NULL REFERENCES gate_passes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action_type VARCHAR(20) NOT NULL, -- 'open' or 'close'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(gate_pass_id, action_type) -- Prevents duplicate open/close actions
);

CREATE INDEX IF NOT EXISTS idx_gp_actions_pass ON gate_pass_actions(gate_pass_id);

-- ============================================
-- 8. Create CLASS_ASSIGNMENTS table
-- ============================================

CREATE TABLE IF NOT EXISTS class_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_name VARCHAR(100) NOT NULL UNIQUE,
  mentor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_class_assignments_mentor ON class_assignments(mentor_id);
CREATE INDEX IF NOT EXISTS idx_class_assignments_dept ON class_assignments(department_id);

-- ============================================
-- 9. Create DEPARTMENT_ASSIGNMENTS table
-- ============================================

CREATE TABLE IF NOT EXISTS department_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dept_name VARCHAR(100) NOT NULL UNIQUE,
  hod_id UUID REFERENCES users(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dept_assignments_hod ON department_assignments(hod_id);

-- ============================================
-- 10. Create STAFF_ASSIGNMENTS table (governance hostel mapping)
-- ============================================

CREATE TABLE IF NOT EXISTS staff_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type VARCHAR(20) NOT NULL,   -- 'HOSTEL', 'DEPARTMENT'
  entity_id UUID NOT NULL,
  assignment_type VARCHAR(30) NOT NULL, -- 'WARDEN', 'DEPUTY_WARDEN', 'HOD'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_assignments_user ON staff_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_entity ON staff_assignments(entity_type, entity_id);

-- ============================================
-- 11. Apply updated_at trigger to new tables
-- ============================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'class_assignments', 'department_assignments', 'staff_assignments'
    ])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trigger_update_%I ON %I;
      CREATE TRIGGER trigger_update_%I
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END $$;
`;

async function migrate() {
  console.log('🚀 Running migration 002: Schema Fixes...');
  try {
    await pool.query(migrationSQL);
    console.log('✅ Migration 002 completed successfully!');
    console.log('   Added: gate_pass_status enums (opened, yet_to_be_closed, closed)');
    console.log('   Added: students.mentor_id, students.department_id');
    console.log('   Added: faculty.faculty_type');
    console.log('   Added: hostels.deputy_warden_id, type, capacity, description');
    console.log('   Added: gate_passes.hostel_id, user_role, valid_until, snapshot columns');
    console.log('   Created: gate_pass_logs, gate_pass_actions tables');
    console.log('   Created: class_assignments, department_assignments, staff_assignments tables');
  } catch (error) {
    console.error('❌ Migration 002 failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  migrate().catch(() => process.exit(1));
}

module.exports = { migrate };
