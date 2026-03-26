require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/database');

/**
 * HACKATHON DEMO SEED
 * Creates a complete, realistic campus with all roles pre-populated and ready
 * for live demonstration of every CampusOS feature.
 *
 * Password for ALL demo users: Demo@123456
 *
 * Users Created:
 *   Admin:        admin@campusos.edu (already exists from migrate.js seed)
 *   HOD (CSE):    hod.cse@campusos.edu
 *   Faculty:      mentor.raj@campusos.edu
 *   Warden M:     warden.m@campusos.edu
 *   Warden F:     warden.f@campusos.edu
 *   Security:     security@campusos.edu
 *   Students x3:  student1, student2 (day scholar), student3 (hosteller)
 */

const DEMO_PASSWORD = 'Demo@123456';

async function seedDemo() {
  console.log('\n🌱 [DEMO SEED] Starting CampusOS Hackathon Demo Seed...');

  const hash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // ──────────────────────────────────────────────────────────────
  // 1. GET CSE Department ID
  // ──────────────────────────────────────────────────────────────
  const cseRes = await pool.query("SELECT id FROM departments WHERE code = 'CSE'");
  if (cseRes.rows.length === 0) {
    throw new Error('CSE department not found. Run npm run migrate first.');
  }
  const cseDeptId = cseRes.rows[0].id;

  // ──────────────────────────────────────────────────────────────
  // 2. HOD (department_admin)
  // ──────────────────────────────────────────────────────────────
  const hodRes = await pool.query(
    `INSERT INTO users (email, password_hash, name, phone, role, status, department_id, approved_at)
     VALUES ($1,$2,$3,$4,'department_admin','approved',$5,NOW())
     ON CONFLICT (email) DO UPDATE SET status = 'approved', approved_at = NOW()
     RETURNING id`,
    ['hod.cse@campusos.edu', hash, 'Dr. Rajkumar Mehta', '+919800001111', cseDeptId]
  );
  const hodId = hodRes.rows[0].id;

  await pool.query(
    `INSERT INTO faculty (user_id, faculty_id_number, designation, department_id, faculty_type)
     VALUES ($1, 'FAC-HOD-001', 'Head of Department', $2, 'academic')
     ON CONFLICT (user_id) DO NOTHING`,
    [hodId, cseDeptId]
  );
  await pool.query('UPDATE departments SET hod_id = $1 WHERE id = $2', [hodId, cseDeptId]);
  console.log('  ✅ HOD created: hod.cse@campusos.edu');

  // ──────────────────────────────────────────────────────────────
  // 3. Mentor/Faculty
  // ──────────────────────────────────────────────────────────────
  const facultyRes = await pool.query(
    `INSERT INTO users (email, password_hash, name, phone, role, status, department_id, approved_at)
     VALUES ($1,$2,$3,$4,'faculty','approved',$5,NOW())
     ON CONFLICT (email) DO UPDATE SET status = 'approved', approved_at = NOW()
     RETURNING id`,
    ['mentor.raj@campusos.edu', hash, 'Prof. Anjali Sharma', '+919800002222', cseDeptId]
  );
  const mentorId = facultyRes.rows[0].id;

  await pool.query(
    `INSERT INTO faculty (user_id, faculty_id_number, designation, department_id, faculty_type)
     VALUES ($1, 'FAC-001', 'Assistant Professor', $2, 'academic')
     ON CONFLICT (user_id) DO NOTHING`,
    [mentorId, cseDeptId]
  );
  console.log('  ✅ Faculty/Mentor created: mentor.raj@campusos.edu');

  // ──────────────────────────────────────────────────────────────
  // 4. Class Assignment (so students can auto-map mentor)
  // ──────────────────────────────────────────────────────────────
  await pool.query(
    `INSERT INTO class_assignments (class_name, mentor_id, department_id)
     VALUES ('CSE 2nd Year A', $1, $2)
     ON CONFLICT (class_name) DO UPDATE SET mentor_id = $1`,
    [mentorId, cseDeptId]
  );
  console.log('  ✅ Class assignment mapped: CSE 2nd Year A → Prof. Anjali');

  // ──────────────────────────────────────────────────────────────
  // 5. Wardens
  // ──────────────────────────────────────────────────────────────
  const wardenMRes = await pool.query(
    `INSERT INTO users (email, password_hash, name, phone, role, status, approved_at)
     VALUES ($1,$2,$3,$4,'warden','approved',NOW())
     ON CONFLICT (email) DO UPDATE SET status = 'approved', approved_at = NOW()
     RETURNING id`,
    ['warden.m@campusos.edu', hash, 'Mr. Suresh Pillai', '+919800003333']
  );
  const wardenMId = wardenMRes.rows[0].id;
  await pool.query(
    `INSERT INTO faculty (user_id, faculty_id_number, designation, faculty_type)
     VALUES ($1, 'WARDEN-M-001', 'Hostel Warden (Gents)', 'non_academic')
     ON CONFLICT (user_id) DO NOTHING`,
    [wardenMId]
  );

  const wardenFRes = await pool.query(
    `INSERT INTO users (email, password_hash, name, phone, role, status, approved_at)
     VALUES ($1,$2,$3,$4,'warden','approved',NOW())
     ON CONFLICT (email) DO UPDATE SET status = 'approved', approved_at = NOW()
     RETURNING id`,
    ['warden.f@campusos.edu', hash, 'Mrs. Priya Nair', '+919800004444']
  );
  const wardenFId = wardenFRes.rows[0].id;
  await pool.query(
    `INSERT INTO faculty (user_id, faculty_id_number, designation, faculty_type)
     VALUES ($1, 'WARDEN-F-001', 'Hostel Warden (Ladies)', 'non_academic')
     ON CONFLICT (user_id) DO NOTHING`,
    [wardenFId]
  );
  console.log('  ✅ Wardens created: warden.m@campusos.edu & warden.f@campusos.edu');

  // ──────────────────────────────────────────────────────────────
  // 6. Security Staff
  // ──────────────────────────────────────────────────────────────
  const secRes = await pool.query(
    `INSERT INTO users (email, password_hash, name, phone, role, status, approved_at)
     VALUES ($1,$2,$3,$4,'security_staff','approved',NOW())
     ON CONFLICT (email) DO UPDATE SET status = 'approved', approved_at = NOW()
     RETURNING id`,
    ['security@campusos.edu', hash, 'Ramesh Kumar (Security)', '+919800005555']
  );
  console.log('  ✅ Security staff created: security@campusos.edu');

  // ──────────────────────────────────────────────────────────────
  // 7. Hostels
  // ──────────────────────────────────────────────────────────────
  const hostelMRes = await pool.query(
    `INSERT INTO hostels (name, type, capacity, description, warden_id)
     VALUES ('Vivekananda Block (Gents)', 'gents', 200, 'Main gents hostel block', $1)
     ON CONFLICT DO NOTHING RETURNING id`,
    [wardenMId]
  );
  let hostelMId = hostelMRes.rows[0]?.id;
  if (!hostelMId) {
    const h = await pool.query("SELECT id FROM hostels WHERE name = 'Vivekananda Block (Gents)'");
    hostelMId = h.rows[0]?.id;
  }

  const hostelFRes = await pool.query(
    `INSERT INTO hostels (name, type, capacity, description, warden_id)
     VALUES ('Sarojini Block (Ladies)', 'ladies', 180, 'Main ladies hostel block', $1)
     ON CONFLICT DO NOTHING RETURNING id`,
    [wardenFId]
  );
  let hostelFId = hostelFRes.rows[0]?.id;
  if (!hostelFId) {
    const h = await pool.query("SELECT id FROM hostels WHERE name = 'Sarojini Block (Ladies)'");
    hostelFId = h.rows[0]?.id;
  }
  console.log('  ✅ Hostels created with wardens assigned');

  // ──────────────────────────────────────────────────────────────
  // 8. Get class_id for CSE 2nd Year A
  // ──────────────────────────────────────────────────────────────
  const classRes = await pool.query(
    "SELECT id FROM classes WHERE name = 'CSE 2nd Year A'"
  );
  const classId = classRes.rows[0]?.id || null;

  // ──────────────────────────────────────────────────────────────
  // 9. Students
  // ──────────────────────────────────────────────────────────────
  // Student 1: Day Scholar - approved
  const s1Res = await pool.query(
    `INSERT INTO users (email, password_hash, name, phone, role, status, department_id, approved_at)
     VALUES ($1,$2,$3,$4,'student','approved',$5,NOW())
     ON CONFLICT (email) DO UPDATE SET status = 'approved', approved_at = NOW()
     RETURNING id`,
    ['arjun.kumar@student.campusos.edu', hash, 'Arjun Kumar', '+919900001111', cseDeptId]
  );
  const s1Id = s1Res.rows[0].id;
  await pool.query(
    `INSERT INTO students (user_id, roll_number, class_id, year_of_study, batch, residence_type,
       father_name, father_phone, mother_name, mother_phone, mentor_id, department_id)
     VALUES ($1,'21CS001',$2,'2','2023','day_scholar','Vikram Kumar','+919900001100',
             'Meena Kumar','+919900001102',$3,$4)
     ON CONFLICT (roll_number) DO NOTHING`,
    [s1Id, classId, mentorId, cseDeptId]
  );

  // Student 2: Day Scholar - pending (for approval demo)
  const s2Res = await pool.query(
    `INSERT INTO users (email, password_hash, name, phone, role, status, department_id)
     VALUES ($1,$2,$3,$4,'student','pending',$5)
     ON CONFLICT (email) DO UPDATE SET status = 'pending'
     RETURNING id`,
    ['priya.reddy@student.campusos.edu', hash, 'Priya Reddy', '+919900002222', cseDeptId]
  );
  const s2Id = s2Res.rows[0].id;
  await pool.query(
    `INSERT INTO students (user_id, roll_number, class_id, year_of_study, batch, residence_type,
       father_name, father_phone, mother_name, mother_phone, mentor_id, department_id)
     VALUES ($1,'21CS002',$2,'2','2023','day_scholar','Ravi Reddy','+919900002200',
             'Latha Reddy','+919900002202',$3,$4)
     ON CONFLICT (roll_number) DO NOTHING`,
    [s2Id, classId, mentorId, cseDeptId]
  );

  // Student 3: Hosteller - approved
  const s3Res = await pool.query(
    `INSERT INTO users (email, password_hash, name, phone, role, status, department_id, approved_at)
     VALUES ($1,$2,$3,$4,'student','approved',$5,NOW())
     ON CONFLICT (email) DO UPDATE SET status = 'approved', approved_at = NOW()
     RETURNING id`,
    ['rahul.nair@student.campusos.edu', hash, 'Rahul Nair', '+919900003333', cseDeptId]
  );
  const s3Id = s3Res.rows[0].id;
  await pool.query(
    `INSERT INTO students (user_id, roll_number, class_id, year_of_study, batch, residence_type,
       hostel_id, hostel_block, room_number,
       father_name, father_phone, mother_name, mother_phone, mentor_id, department_id)
     VALUES ($1,'21CS003',$2,'2','2023','hosteller',$3,'Vivekananda Block','104',
             'Suku Nair','+919900003300','Geetha Nair','+919900003302',$4,$5)
     ON CONFLICT (roll_number) DO NOTHING`,
    [s3Id, classId, hostelMId, mentorId, cseDeptId]
  );
  console.log('  ✅ 3 Students created (1 pending approval, 2 approved; 1 hosteller)');

  // ──────────────────────────────────────────────────────────────
  // 10. Sample Gate Pass (pre-approved, for scan demo)
  // ──────────────────────────────────────────────────────────────
  const gpRes = await pool.query(
    `INSERT INTO gate_passes (user_id, pass_type, status, reason, leave_date, out_time, return_date, return_time,
       user_role, faculty_approver_id, faculty_name, faculty_approved_at,
       hod_approver_id, hod_name, hod_approved_at, valid_until)
     VALUES ($1, 'day_scholar', 'approved', 'Medical checkup at Apollo Hospital',
             CURRENT_DATE + 1, '10:00', CURRENT_DATE + 1, '16:00',
             'student', $2, 'Prof. Anjali Sharma', NOW(),
             $3, 'Dr. Rajkumar Mehta', NOW(),
             (CURRENT_DATE + 1)::timestamp + interval '16 hours')
     RETURNING id`,
    [s1Id, mentorId, hodId]
  );
  const gpId = gpRes.rows[0].id;
  await pool.query(
    `INSERT INTO gate_pass_logs (gate_pass_id, actor_id, actor_name, state_from, state_to, remarks)
     VALUES ($1,$2,'Arjun Kumar','none','pending_faculty','Gate pass requested'),
            ($1,$3,'Prof. Anjali Sharma','pending_faculty','mentor_approved','Approved - valid reason'),
            ($1,$4,'Dr. Rajkumar Mehta','mentor_approved','approved','Final approval granted')`,
    [gpId, s1Id, mentorId, hodId]
  );
  console.log('  ✅ Sample pre-approved gate pass created (for QR scan demo)');

  // ──────────────────────────────────────────────────────────────
  // 11. Sample Complaint (with AI classification)
  // ──────────────────────────────────────────────────────────────
  await pool.query(
    `INSERT INTO complaints (title, description, category, priority, status, submitted_by, department_id, ai_category, ai_priority)
     VALUES ('WiFi not working in Block A Lab', 'The WiFi has been disconnected in Computer Lab 1 since Monday. 
              Students unable to access online resources during lab sessions.',
             'infrastructure', 'high', 'open', $1, $2, 'infrastructure', 'high')
     ON CONFLICT DO NOTHING`,
    [s1Id, cseDeptId]
  );
  console.log('  ✅ Sample complaint created');

  // ──────────────────────────────────────────────────────────────
  // 12. Sample Notification (published)
  // ──────────────────────────────────────────────────────────────
  await pool.query(
    `INSERT INTO notifications (title, content, type, status, target_type, posted_by, published_at, approved_at, approved_by)
     VALUES ('Internal Hackathon 2026 — Registration Open',
             'The annual CampusOS Internal Hackathon is now open for registration. Teams of 2-4 members can participate. Theme: AI for Social Good. Last date: April 10, 2026.',
             'event', 'published', 'all', $1, NOW(), NOW(), $1)
     ON CONFLICT DO NOTHING`,
    [hodId]
  );
  console.log('  ✅ Sample notification published');

  // ──────────────────────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────────────────────
  console.log('\n🎉 Demo Seed Complete! All credentials use password: Demo@123456\n');
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│                    DEMO LOGIN CREDENTIALS                       │');
  console.log('├────────────────────┬───────────────────────────┬────────────────┤');
  console.log('│ Role               │ Email                     │ Password       │');
  console.log('├────────────────────┼───────────────────────────┼────────────────┤');
  console.log('│ Super Admin        │ admin@campusos.edu        │ admin123       │');
  console.log('│ HOD (CSE)          │ hod.cse@campusos.edu     │ Demo@123456    │');
  console.log('│ Faculty/Mentor     │ mentor.raj@campusos.edu  │ Demo@123456    │');
  console.log('│ Warden (Gents)     │ warden.m@campusos.edu    │ Demo@123456    │');
  console.log('│ Warden (Ladies)    │ warden.f@campusos.edu    │ Demo@123456    │');
  console.log('│ Security Staff     │ security@campusos.edu    │ Demo@123456    │');
  console.log('│ Student (Approved) │ arjun.kumar@student...   │ Demo@123456    │');
  console.log('│ Student (Pending)  │ priya.reddy@student...   │ Demo@123456    │');
  console.log('│ Student (Hostel)   │ rahul.nair@student...    │ Demo@123456    │');
  console.log('└────────────────────┴───────────────────────────┴────────────────┘');
  console.log('\nDEMO FLOW:');
  console.log('  1. Login as arjun.kumar → Request gate pass');
  console.log('  2. Login as mentor.raj → Approve gate pass');
  console.log('  3. Login as hod.cse → Final approve gate pass (QR generated)');
  console.log('  4. Login as security → Scan QR → Open / Close');
  console.log('  5. Login as admin → Users → Approve priya.reddy');
  console.log('');
}

if (require.main === module) {
  seedDemo()
    .catch(err => { console.error('❌ Demo seed failed:', err); process.exit(1); })
    .finally(() => pool.end());
}

module.exports = { seedDemo };
