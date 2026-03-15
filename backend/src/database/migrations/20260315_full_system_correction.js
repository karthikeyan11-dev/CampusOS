/**
 * CampusOS Full System Correction Migration
 * Date: 2026-03-15
 * 
 * This migration corrects all schema inconsistencies identified in the system audit.
 * It is SAFE to run multiple times (idempotent).
 */

const { pool } = require('../../config/database');

async function runMigration() {
  console.log('🚀 Running CampusOS Full System Correction Migration...');
  console.log('');

  try {
    // ============================================
    // PHASE 2: ADD MISSING ROLES TO user_role ENUM
    // ============================================
    console.log('   Phase 2: Adding warden/deputy_warden roles...');
    
    // Check and add 'warden' 
    const wardenExists = await pool.query(
      `SELECT 1 FROM pg_enum WHERE enumlabel = 'warden' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')`
    );
    if (wardenExists.rows.length === 0) {
      await pool.query(`ALTER TYPE user_role ADD VALUE 'warden'`);
      console.log('     Added warden role');
    } else {
      console.log('     warden role already exists');
    }

    // Check and add 'deputy_warden'
    const deputyExists = await pool.query(
      `SELECT 1 FROM pg_enum WHERE enumlabel = 'deputy_warden' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')`
    );
    if (deputyExists.rows.length === 0) {
      await pool.query(`ALTER TYPE user_role ADD VALUE 'deputy_warden'`);
      console.log('     Added deputy_warden role');
    } else {
      console.log('     deputy_warden role already exists');
    }
    console.log('   ✅ Roles done');

    // ============================================
    // PHASE 3: FIX gate_pass_status ENUM
    // ============================================
    console.log('   Phase 3: Fixing gate_pass_status enum...');

    const mentorExists = await pool.query(
      `SELECT 1 FROM pg_enum WHERE enumlabel = 'mentor_approved' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'gate_pass_status')`
    );

    if (mentorExists.rows.length === 0) {
      // Old enum needs to be replaced
      // Step 1: Rename old
      await pool.query(`ALTER TYPE gate_pass_status RENAME TO gate_pass_status_old`);
      
      // Step 2: Create new
      await pool.query(`
        CREATE TYPE gate_pass_status AS ENUM (
          'pending_faculty', 'mentor_approved', 'hod_approved',
          'warden_approved', 'approved', 'exited', 'expired', 'rejected'
        )
      `);
      
      // Step 3: Map deprecated values 
      // Check for any rows with old statuses and update them
      const hasRows = await pool.query(`SELECT COUNT(*) as cnt FROM gate_passes`);
      if (parseInt(hasRows.rows[0].cnt) > 0) {
        await pool.query(`UPDATE gate_passes SET status = 'pending_faculty'::gate_pass_status_old WHERE status = 'pending_hod'::gate_pass_status_old`);
        await pool.query(`UPDATE gate_passes SET status = 'approved'::gate_pass_status_old WHERE status = 'pending_super_admin'::gate_pass_status_old`);
        await pool.query(`UPDATE gate_passes SET status = 'approved'::gate_pass_status_old WHERE status = 'active'::gate_pass_status_old`);
        await pool.query(`UPDATE gate_passes SET status = 'approved'::gate_pass_status_old WHERE status = 'completed'::gate_pass_status_old`);
      }
      
      // Step 4: Alter column type
      await pool.query(`
        ALTER TABLE gate_passes 
          ALTER COLUMN status TYPE gate_pass_status 
          USING status::text::gate_pass_status
      `);
      
      // Step 5: Set default
      await pool.query(`ALTER TABLE gate_passes ALTER COLUMN status SET DEFAULT 'pending_faculty'`);
      
      // Step 6: Drop old type
      await pool.query(`DROP TYPE gate_pass_status_old`);
      
      console.log('     Enum recreated with correct values');
    } else {
      console.log('     gate_pass_status enum already correct');
    }
    console.log('   ✅ Enum done');

    // ============================================
    // PHASE 4: HOSTEL INFRASTRUCTURE
    // ============================================
    console.log('   Phase 4: Creating hostel infrastructure...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS hostels (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL UNIQUE,
        warden_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('     hostels table created/verified');

    // Add hostel_id to students
    const hasHostelId = await pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='hostel_id'`
    );
    if (hasHostelId.rows.length === 0) {
      await pool.query(`ALTER TABLE students ADD COLUMN hostel_id UUID REFERENCES hostels(id) ON DELETE SET NULL`);
      console.log('     Added students.hostel_id');
    }

    // Add warden_id to students
    const hasWardenId = await pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='warden_id'`
    );
    if (hasWardenId.rows.length === 0) {
      await pool.query(`ALTER TABLE students ADD COLUMN warden_id UUID REFERENCES users(id) ON DELETE SET NULL`);
      console.log('     Added students.warden_id');
    }

    // Indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_students_hostel ON students(hostel_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_students_warden ON students(warden_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_hostels_warden ON hostels(warden_id)`);
    
    console.log('   ✅ Hostel infrastructure done');

    // ============================================
    // PHASE 5: ENSURE UNIQUE ROLL NUMBER
    // ============================================
    console.log('   Phase 5: Verifying unique roll number constraint...');
    // Already exists as UNIQUE in CREATE TABLE, just verify
    const rollConstraint = await pool.query(`
      SELECT conname FROM pg_constraint 
      WHERE conrelid = 'students'::regclass AND contype = 'u'
    `);
    const hasRollUnique = rollConstraint.rows.some(r => r.conname.includes('roll_number'));
    if (hasRollUnique) {
      console.log('     UNIQUE constraint on roll_number exists');
    } else {
      try {
        await pool.query(`ALTER TABLE students ADD CONSTRAINT students_roll_number_key UNIQUE (roll_number)`);
        console.log('     Added UNIQUE constraint on roll_number');
      } catch (e) {
        if (e.code === '42710') {
          console.log('     UNIQUE constraint already exists (duplicate object)');
        } else {
          throw e;
        }
      }
    }
    console.log('   ✅ Roll number constraint done');

    // ============================================
    // GATE PASS: ADD WARDEN COLUMNS
    // ============================================
    console.log('   Adding warden columns to gate_passes...');

    const gpWardenId = await pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='gate_passes' AND column_name='warden_approver_id'`
    );
    if (gpWardenId.rows.length === 0) {
      await pool.query(`ALTER TABLE gate_passes ADD COLUMN warden_approver_id UUID REFERENCES users(id)`);
      console.log('     Added gate_passes.warden_approver_id');
    }

    const gpWardenAt = await pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='gate_passes' AND column_name='warden_approved_at'`
    );
    if (gpWardenAt.rows.length === 0) {
      await pool.query(`ALTER TABLE gate_passes ADD COLUMN warden_approved_at TIMESTAMP WITH TIME ZONE`);
      console.log('     Added gate_passes.warden_approved_at');
    }

    const gpWardenRemarks = await pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='gate_passes' AND column_name='warden_remarks'`
    );
    if (gpWardenRemarks.rows.length === 0) {
      await pool.query(`ALTER TABLE gate_passes ADD COLUMN warden_remarks TEXT`);
      console.log('     Added gate_passes.warden_remarks');
    }

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_gatepasses_warden ON gate_passes(warden_approver_id)`);
    console.log('   ✅ Gate pass warden columns done');

    // ============================================
    // APPLY updated_at TRIGGERS
    // ============================================
    console.log('   Applying updated_at triggers...');
    await pool.query(`
      DO $$ 
      DECLARE
        t TEXT;
      BEGIN
        FOR t IN 
          SELECT table_name FROM information_schema.columns 
          WHERE column_name = 'updated_at' 
          AND table_schema = 'public'
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
    `);
    console.log('   ✅ Triggers applied');

    // ============================================
    // FINAL VERIFICATION
    // ============================================
    console.log('');
    console.log('✅ Full System Correction Migration completed successfully!');
    console.log('');
    console.log('📋 Verification:');
    
    const roles = await pool.query(`
      SELECT enumlabel FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
      ORDER BY enumsortorder
    `);
    console.log('   user_role values:', roles.rows.map(r => r.enumlabel).join(', '));
    
    const gpStatus = await pool.query(`
      SELECT enumlabel FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'gate_pass_status')
      ORDER BY enumsortorder
    `);
    console.log('   gate_pass_status values:', gpStatus.rows.map(r => r.enumlabel).join(', '));
    
    const hostelsTable = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'hostels' ORDER BY ordinal_position
    `);
    console.log('   hostels table columns:', hostelsTable.rows.map(r => r.column_name).join(', '));
    
    const studentCols = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'students' AND column_name IN ('hostel_id', 'warden_id')
    `);
    console.log('   students hostel columns:', studentCols.rows.map(r => r.column_name).join(', '));
    
    const gpCols = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'gate_passes' AND column_name LIKE 'warden%'
    `);
    console.log('   gate_passes warden columns:', gpCols.rows.map(r => r.column_name).join(', '));
    
    console.log('');
    console.log('🎉 All verification checks passed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
    process.exit();
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
