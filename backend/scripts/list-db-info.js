const { pool } = require('../src/config/database');

async function listTables() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('Tables in public schema:');
    res.rows.forEach(row => console.log(` - ${row.table_name}`));
    
    const enums = await pool.query(`
      SELECT typname FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      GROUP BY typname
    `);
    console.log('\nEnums found:');
    enums.rows.forEach(row => console.log(` - ${row.typname}`));

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

listTables();
