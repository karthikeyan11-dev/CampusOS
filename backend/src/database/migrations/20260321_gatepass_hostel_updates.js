/**
 * Gate Pass & Hostel System Updates Migration
 * Date: 2026-03-21
 */

const { pool } = require('../../config/database');

async function runMigration() {
  console.log('🚀 Running Gate Pass & Hostel System Updates Migration (V2)...');

  try {
    // 1. Update gate_pass_status ENUM
    console.log('   Updating gate_pass_status enum...');
    
    // Step 1: Temporarily change column to text
    await pool.query(`ALTER TABLE gate_passes ALTER COLUMN status DROP DEFAULT`);
    await pool.query(`ALTER TABLE gate_passes ALTER COLUMN status TYPE TEXT USING status::text`);
    
    // Step 2: Drop and recreate enum
    await pool.query(`DROP TYPE IF EXISTS gate_pass_status`);
    await pool.query(`
      CREATE TYPE gate_pass_status AS ENUM (
        'pending_faculty', 
        'mentor_approved', 
        'hod_approved', 
        'warden_approved', 
        'approved', 
        'opened', 
        'yet_to_be_closed', 
        'closed', 
        'expired',
        'rejected'
      )
    `);
    
    // Step 3: Map existing values
    // exited -> opened
    await pool.query(`UPDATE gate_passes SET status = 'opened' WHERE status = 'exited'`);
    
    // Step 4: Change column back to enum
    await pool.query(`
      ALTER TABLE gate_passes 
      ALTER COLUMN status TYPE gate_pass_status 
      USING status::gate_pass_status
    `);
    
    // Step 5: Set default
    await pool.query(`ALTER TABLE gate_passes ALTER COLUMN status SET DEFAULT 'pending_faculty'`);
    
    // Also drop gate_pass_status_old if it exists from previous attempt
    await pool.query(`DROP TYPE IF EXISTS gate_pass_status_old`);
    
    console.log('   ✅ gate_pass_status enum updated');

    // 2. Create rooms table for scalability
    console.log('   Creating rooms table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
        room_number VARCHAR(20) NOT NULL,
        capacity INTEGER DEFAULT 4,
        occupancy INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'available',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(hostel_id, room_number)
      )
    `);
    console.log('   ✅ rooms table created');

    // 3. Add room_id to students
    const hasRoomId = await pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='room_id'`
    );
    if (hasRoomId.rows.length === 0) {
      await pool.query(`ALTER TABLE students ADD COLUMN room_id UUID REFERENCES rooms(id) ON DELETE SET NULL`);
      console.log('     Added students.room_id');
    }

    // 4. Update students table - ensure mentor_id exists (faculty advisor)
    const hasMentorId = await pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='mentor_id'`
    );
    if (hasMentorId.rows.length === 0) {
      await pool.query(`ALTER TABLE students ADD COLUMN mentor_id UUID REFERENCES users(id) ON DELETE SET NULL`);
      console.log('     Added students.mentor_id');
    }

    // 5. Add hostel_id to gate_passes if needed (for quicker reference)
    const hasGpHostelId = await pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='gate_passes' AND column_name='hostel_id'`
    );
    if (hasGpHostelId.rows.length === 0) {
      await pool.query(`ALTER TABLE gate_passes ADD COLUMN hostel_id UUID REFERENCES hostels(id) ON DELETE SET NULL`);
      console.log('     Added gate_passes.hostel_id');
    }

    console.log('✅ Migration V2 completed successfully!');
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
