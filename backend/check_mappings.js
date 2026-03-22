const { pool } = require('./src/config/database');

async function check() {
  try {
    const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'students'");
    console.log('STUDENTS_COLUMNS:', cols.rows.map(r => r.column_name).join(', '));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
