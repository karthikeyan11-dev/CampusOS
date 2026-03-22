/**
 * Seed Hostels & Rooms
 * Date: 2026-03-21
 */

const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

async function seedHostels() {
  console.log('🌱 Seeding Hostels and Rooms...');

  try {
    const hashedPassword = await bcrypt.hash('password123', 12);

    // 1. Create Wardens
    const wardens = [
      { email: 'warden.mens@campusos.edu', name: 'Dr. John Doe', role: 'warden' },
      { email: 'warden.womens@campusos.edu', name: 'Dr. Jane Smith', role: 'warden' },
      { email: 'deputy.warden1@campusos.edu', name: 'Mr. Alex Brown', role: 'deputy_warden' },
    ];

    const wardenIds = [];
    for (const w of wardens) {
      const res = await pool.query(
        `INSERT INTO users (email, password_hash, role, status, name, phone)
         VALUES ($1, $2, $3, 'approved', $4, '+911234567890')
         ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
         RETURNING id`,
        [w.email, hashedPassword, w.role, w.name]
      );
      wardenIds.push(res.rows[0].id);

      // Create faculty entry for warden
      await pool.query(
        `INSERT INTO faculty (user_id, faculty_id_number, designation)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO UPDATE SET faculty_id_number = EXCLUDED.faculty_id_number, designation = EXCLUDED.designation`,
        [res.rows[0].id, `W-${w.email.split('.')[0]}-${res.rows[0].id.substring(0,4)}`, 'Hostel Warden']
      );
    }
    console.log('  ✅ Wardens seeded');

    // 2. Create Hostels
    const hostels = [
      { name: 'Aryabhata Mens Hostel', warden_id: wardenIds[0] },
      { name: 'Kalpana Chawla Womens Hostel', warden_id: wardenIds[1] },
      { name: 'CV Raman Mens Hostel', warden_id: wardenIds[2] },
    ];

    const hostelIds = [];
    for (const h of hostels) {
      const res = await pool.query(
        `INSERT INTO hostels (name, warden_id)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET warden_id = EXCLUDED.warden_id
         RETURNING id`,
        [h.name, h.warden_id]
      );
      hostelIds.push(res.rows[0].id);
    }
    console.log('  ✅ Hostels seeded');

    // 3. Create Rooms
    for (const hostelId of hostelIds) {
      for (let i = 101; i <= 105; i++) {
        await pool.query(
          `INSERT INTO rooms (hostel_id, room_number, capacity, occupancy)
           VALUES ($1, $2, 4, 0)
           ON CONFLICT (hostel_id, room_number) DO NOTHING`,
          [hostelId, i.toString()]
        );
      }
    }
    console.log('  ✅ Rooms seeded (5 per hostel)');

    console.log('\n🎉 Hostel seeding completed!');
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  seedHostels().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { seedHostels };
