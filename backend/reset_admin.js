const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function resetAdmin() {
  try {
    const passwordHash = await bcrypt.hash('admin123', 12);
    await pool.query(
      "UPDATE users SET password_hash = $1, status = 'approved' WHERE email = 'admin@campusos.edu'",
      [passwordHash]
    );
    console.log('✅ Admin password reset to: admin123');
  } catch (err) {
    console.error('❌ Reset error:', err.message);
  } finally {
    process.exit();
  }
}

resetAdmin();
