const { pool } = require('../../config/database');

async function runMigration() {
  console.log('🚀 Running IAM Refactor Migration...');

  try {
    // 1. Create Faculty Type Enum if it doesn't exist
    console.log('   Creating faculty_type enum...');
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE faculty_type AS ENUM ('academic', 'non_academic');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Add faculty_type to faculty table
    console.log('   Updating faculty table...');
    const facultyTypeCol = await pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='faculty' AND column_name='faculty_type'`
    );
    if (facultyTypeCol.rows.length === 0) {
      await pool.query(`ALTER TABLE faculty ADD COLUMN faculty_type faculty_type DEFAULT 'academic'`);
      console.log('     Added faculty.faculty_type');
    }

    // 3. Ensure approved_at and approved_by exist in users (they already do, but just in case)
    // No changes needed here based on migrate.js check.

    // 4. Create class_assignments table
    console.log('   Creating class_assignments table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS class_assignments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        class_name VARCHAR(100) NOT NULL UNIQUE,
        mentor_id UUID REFERENCES users(id) ON DELETE SET NULL,
        department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('   ✅ class_assignments table created');

    // 5. Create department_assignments table
    console.log('   Creating department_assignments table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS department_assignments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        dept_name VARCHAR(100) NOT NULL UNIQUE,
        hod_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('   ✅ department_assignments table created');

    // 6. Add triggers for updated_at on new tables
    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_update_class_assignments ON class_assignments;
      CREATE TRIGGER trigger_update_class_assignments
        BEFORE UPDATE ON class_assignments
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS trigger_update_department_assignments ON department_assignments;
      CREATE TRIGGER trigger_update_department_assignments
        BEFORE UPDATE ON department_assignments
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('✅ IAM Refactor Migration completed successfully!');
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
