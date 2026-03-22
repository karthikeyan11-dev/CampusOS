/**
 * Room Occupancy Trigger Migration
 * Date: 2026-03-21
 */

const { pool } = require('../../config/database');

async function runMigration() {
  console.log('🚀 Setting up Room Occupancy triggers...');

  try {
    const triggerSQL = `
      -- Function to update occupancy
      CREATE OR REPLACE FUNCTION update_room_occupancy()
      RETURNS TRIGGER AS $$
      BEGIN
        -- If room_id changed, decrement old and increment new
        IF (TG_OP = 'UPDATE') THEN
          IF (OLD.room_id IS NOT NULL AND (NEW.room_id IS NULL OR NEW.room_id <> OLD.room_id)) THEN
            UPDATE rooms SET occupancy = occupancy - 1 WHERE id = OLD.room_id;
          END IF;
          IF (NEW.room_id IS NOT NULL AND (OLD.room_id IS NULL OR NEW.room_id <> OLD.room_id)) THEN
            UPDATE rooms SET occupancy = occupancy + 1 WHERE id = NEW.room_id;
          END IF;
        
        -- On Insert
        ELSIF (TG_OP = 'INSERT') THEN
          IF (NEW.room_id IS NOT NULL) THEN
            UPDATE rooms SET occupancy = occupancy + 1 WHERE id = NEW.room_id;
          END IF;
          
        -- On Delete
        ELSIF (TG_OP = 'DELETE') THEN
          IF (OLD.room_id IS NOT NULL) THEN
            UPDATE rooms SET occupancy = occupancy - 1 WHERE id = OLD.room_id;
          END IF;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Apply trigger to students table
      DROP TRIGGER IF EXISTS trigger_update_occupancy ON students;
      CREATE TRIGGER trigger_update_occupancy
      AFTER INSERT OR UPDATE OR DELETE ON students
      FOR EACH ROW EXECUTE FUNCTION update_room_occupancy();
    `;

    await pool.query(triggerSQL);
    console.log('   ✅ Trigger created successfully');
    
    // Recalculate initial occupancy for all rooms
    await pool.query(`
      UPDATE rooms r
      SET occupancy = (SELECT COUNT(*) FROM students s WHERE s.room_id = r.id);
    `);
    console.log('   ✅ Initial occupancy recalculated');

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

if (require.main === module) {
  runMigration().then(() => process.exit(0)).catch((err) => {
    process.exit(1);
  });
}

module.exports = { runMigration };
