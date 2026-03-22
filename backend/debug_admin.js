const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkAdmin() {
  try {
    const res = await pool.query("SELECT id, email, role, status FROM users WHERE email = 'admin@campusos.edu'");
    console.log('Admin User Info:', res.rows);
    if (res.rows.length === 0) {
      console.log('❌ Admin user NOT found in database.');
    } else {
      console.log('✅ Admin user found.');
    }
  } catch (err) {
    console.error('❌ Database error:', err.message);
  } finally {
    process.exit();
  }
}

checkAdmin();
