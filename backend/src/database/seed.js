const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { ROLES, USER_STATUS } = require('../config/constants');

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Create default Super Admin
    const hashedPassword = await bcrypt.hash('admin123', 12);

    // Insert departments
    const departments = [
      { name: 'Computer Science and Engineering', code: 'CSE' },
      { name: 'Electronics and Communication', code: 'ECE' },
      { name: 'Mechanical Engineering', code: 'MECH' },
      { name: 'Civil Engineering', code: 'CIVIL' },
      { name: 'Information Technology', code: 'IT' },
    ];

    for (const dept of departments) {
      await pool.query(
        `INSERT INTO departments (name, code, description) 
         VALUES ($1, $2, $3) ON CONFLICT (code) DO NOTHING`,
        [dept.name, dept.code, `Department of ${dept.name}`]
      );
    }
    console.log('  ✅ Departments seeded');

    // Create Super Admin user
    await pool.query(
      `INSERT INTO users (email, password_hash, role, status, name, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO NOTHING`,
      [
        'admin@campusos.edu',
        hashedPassword,
        ROLES.SUPER_ADMIN,
        USER_STATUS.APPROVED,
        'System Administrator',
        '+919876543210',
      ]
    );
    console.log('  ✅ Super Admin created (admin@campusos.edu / admin123)');

    // Create sample resources
    const cse = await pool.query("SELECT id FROM departments WHERE code = 'CSE'");
    if (cse.rows.length > 0) {
      const deptId = cse.rows[0].id;

      const resources = [
        { name: 'Main Seminar Hall', type: 'seminar_hall', location: 'Block A, Ground Floor', capacity: 200 },
        { name: 'Mini Auditorium', type: 'seminar_hall', location: 'Block B, 1st Floor', capacity: 100 },
        { name: 'Computer Lab 1', type: 'lab', location: 'Block A, 2nd Floor', capacity: 60 },
        { name: 'Computer Lab 2', type: 'lab', location: 'Block A, 3rd Floor', capacity: 60 },
        { name: 'Projector Unit A', type: 'projector', location: 'Admin Office', capacity: null },
        { name: 'Projector Unit B', type: 'projector', location: 'Admin Office', capacity: null },
      ];

      for (const res of resources) {
        await pool.query(
          `INSERT INTO resources (name, type, location, capacity, department_id)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT DO NOTHING`,
          [res.name, res.type, res.location, res.capacity, deptId]
        );
      }
      console.log('  ✅ Resources seeded');

      // Create sample classes
      const classes = [
        { name: 'CSE 2nd Year A', batch: '2024', semester: 3, section: 'A' },
        { name: 'CSE 2nd Year B', batch: '2024', semester: 3, section: 'B' },
        { name: 'CSE 3rd Year A', batch: '2023', semester: 5, section: 'A' },
        { name: 'CSE 4th Year A', batch: '2022', semester: 7, section: 'A' },
      ];

      for (const cls of classes) {
        await pool.query(
          `INSERT INTO classes (name, department_id, batch, semester, section)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (name, department_id, batch, section) DO NOTHING`,
          [cls.name, deptId, cls.batch, cls.semester, cls.section]
        );
      }
      console.log('  ✅ Classes seeded');
    }

    console.log('\n🎉 Database seeding completed!');
    console.log('\n📋 Default Login Credentials:');
    console.log('   Email: admin@campusos.edu');
    console.log('   Password: admin123');

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    throw error;
  } finally {
    const client = await pool.connect();
    client.release();
  }
}

if (require.main === module) {
  seed().catch(() => process.exit(1));
}

module.exports = { seed };
