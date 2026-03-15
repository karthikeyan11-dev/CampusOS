const { pool } = require('../config/database');

async function checkColumns() {
  try {
    const resNotif = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'notifications'");
    const resUsers = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
    
    console.log('Notifications columns:', resNotif.rows.map(r => r.column_name).join(', '));
    console.log('Users columns:', resUsers.rows.map(r => r.column_name).join(', '));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkColumns();
