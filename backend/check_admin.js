const { pool } = require('./src/config/database');
const bcrypt = require('bcryptjs');

const checkAdmin = async () => {
  try {
    console.log('🔍 Checking for super admin in users table...');
    const res = await pool.query('SELECT id, email, password_hash, role, status FROM users WHERE email = $1', ['admin@campusos.edu']);
    
    if (res.rows.length === 0) {
      console.log('❌ ERROR: Super admin (admin@campusos.edu) DOES NOT exist in database.');
      return;
    }

    const admin = res.rows[0];
    console.log(`✅ FOUND: ${admin.email} (Role: ${admin.role}, Status: ${admin.status})`);
    
    const isMatch = await bcrypt.compare('admin123', admin.password_hash);
    console.log(`🔑 Password 'admin123' Match: ${isMatch ? '✅ YES' : '❌ NO'}`);

  } catch (err) {
    console.error(`❌ DB Connection ERROR: ${err.message}`);
  } finally {
    await pool.end();
  }
};

checkAdmin();
