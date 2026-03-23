const { pool } = require('../../config/database');
const { ROLES } = require('../../config/constants');
const redisService = require('../../services/redis.service');

/**
 * GET /governance/departments
 */
exports.getDepartments = async (req, res, next) => {
  try {
    const departments = await redisService.getOrSetCache(
      'governance:departments:list',
      async () => {
        const result = await pool.query(
          `SELECT d.*, u.name as hod_name,
                  (SELECT COUNT(*) FROM classes WHERE department_id = d.id) as class_count,
                  (SELECT COUNT(*) FROM students WHERE department_id = d.id) as student_count
           FROM departments d
           LEFT JOIN users u ON d.hod_id = u.id
           ORDER BY d.name ASC`
        );
        return result.rows;
      },
      1800 // 30 minutes
    );
    res.json({ success: true, data: departments });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /governance/departments
 */
exports.createDepartment = async (req, res, next) => {
  try {
    const { name, code, description, hodId } = req.body;
    const result = await pool.query(
      `INSERT INTO departments (name, code, description, hod_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, code, description, hodId]
    );

    // ⚡ INVALDIATE CACHE
    await redisService.invalidatePattern('governance:departments:*');

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /governance/departments/:id
 * DRILL DOWN: HOD, Classes, Mentors, Students
 */
exports.getDepartmentDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || id === 'null') return res.status(400).json({ success: false, message: 'Invalid ID' });

    const detailData = await redisService.getOrSetCache(
      `governance:departments:detail:${id}`,
      async () => {
        // 1. Dept Info with HOD
        const deptResult = await pool.query(
          `SELECT d.*, u.name as hod_name, u.email as hod_email, u.phone as hod_phone,
                  (SELECT COUNT(*) FROM users WHERE department_id = d.id AND role = 'faculty') as faculties_count,
                  (SELECT COUNT(*) FROM students WHERE department_id = d.id) as students_count
           FROM departments d 
           LEFT JOIN users u ON d.hod_id = u.id 
           WHERE d.id = $1`, [id]
        );
        if (deptResult.rows.length === 0) return null;

        // 2. Faculties
        const faculties = await pool.query(
          `SELECT u.id, u.name, u.email, u.phone, f.designation 
           FROM users u 
           LEFT JOIN faculty f ON f.user_id = u.id 
           WHERE u.department_id = $1 AND u.role = 'faculty'
           ORDER BY u.name ASC`, [id]
        );

        // 3. Sections (Classes) with Mentors
        const classes = await pool.query(
          `SELECT c.*, u.name as mentor_name 
           FROM classes c 
           LEFT JOIN users u ON c.faculty_advisor_id = u.id 
           WHERE c.department_id = $1
           ORDER BY c.name ASC`, [id]
        );

        // 4. Detailed Student List
        const students = await pool.query(
          `SELECT s.*, u.name, u.email, u.phone as student_phone, 
                  c.name as class_name,
                  (SELECT name FROM users WHERE id = d.hod_id) as hod_name,
                  (SELECT phone FROM users WHERE id = d.hod_id) as hod_phone,
                  (SELECT name FROM users WHERE id = c.faculty_advisor_id) as mentor_name,
                  (SELECT phone FROM users WHERE id = c.faculty_advisor_id) as mentor_phone
           FROM students s 
           JOIN users u ON s.user_id = u.id 
           LEFT JOIN classes c ON s.class_id = c.id 
           LEFT JOIN departments d ON s.department_id = d.id
           WHERE s.department_id = $1`, [id]
        );

        return {
          department: deptResult.rows[0],
          faculties: faculties.rows || [],
          classes: classes.rows || [],
          students: students.rows || []
        };
      },
      1800 // 30 mins
    );

    if (!detailData) return res.status(404).json({ success: false, message: 'Dept not found' });

    res.json({ success: true, data: detailData });
  } catch (error) {
    console.error('getDepartmentDetails Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

/**
 * PATCH /governance/departments/:id
 */
exports.updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, description, hodId } = req.body;
    const result = await pool.query(
      `UPDATE departments SET name = $1, code = $2, description = $3, hod_id = $4, updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [name, code, description, hodId, id]
    );

    // ⚡ INVALDIATE CACHE
    await redisService.invalidatePattern('governance:departments:*');

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /governance/departments/:id
 */
exports.deleteDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM departments WHERE id = $1', [id]);
    
    // ⚡ INVALDIATE CACHE
    await redisService.invalidatePattern('governance:departments:*');

    res.json({ success: true, message: 'Department deleted' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /governance/hostels
 */
exports.getHostels = async (req, res, next) => {
  try {
    const hostels = await redisService.getOrSetCache(
      'governance:hostels:list',
      async () => {
        const result = await pool.query(
          `SELECT h.*, u1.name as warden_name, u2.name as deputy_warden_name,
                  (SELECT COUNT(*) FROM students WHERE hostel_id = h.id) as student_count
           FROM hostels h
           LEFT JOIN users u1 ON h.warden_id = u1.id
           LEFT JOIN users u2 ON h.deputy_warden_id = u2.id
           ORDER BY h.name ASC`
        );
        return result.rows;
      },
      1800
    );
    res.json({ success: true, data: hostels });
  } catch (error) {
    console.error('[GOVERNANCE] getHostels Error:', error);
    next(error);
  }
};

/**
 * POST /governance/hostels
 */
exports.createHostel = async (req, res, next) => {
  try {
    const { name, type, capacity, description } = req.body;
    const result = await pool.query(
      `INSERT INTO hostels (name, type, capacity, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, type, capacity, description]
    );

    // ⚡ INVALDIATE CACHE
    await redisService.invalidatePattern('governance:hostels:*');

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /governance/hostels/:id
 * DRILL DOWN: Wardens, Students
 */
exports.getHostelDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || id === 'null') return res.status(400).json({ success: false, message: 'Invalid ID' });

    const detailData = await redisService.getOrSetCache(
      `governance:hostels:detail:${id}`,
      async () => {
        // 1. Hostel Info with Wardens
        const hostelResult = await pool.query(
          `SELECT h.*, u1.name as warden_name, u1.email as warden_email,
                  u2.name as deputy_warden_name, u2.email as deputy_warden_email
           FROM hostels h
           LEFT JOIN users u1 ON h.warden_id = u1.id
           LEFT JOIN users u2 ON h.deputy_warden_id = u2.id
           WHERE h.id = $1`, [id]
        );
        if (hostelResult.rows.length === 0) return null;

        // 2. Hosteller Students
        const students = await pool.query(
          `SELECT s.*, u.name 
           FROM students s 
           JOIN users u ON s.user_id = u.id 
           WHERE s.hostel_id = $1
           ORDER BY u.name ASC`, [id]
        );

        return {
          hostel: hostelResult.rows[0],
          students: students.rows || []
        };
      },
      1800
    );

    if (!detailData) return res.status(404).json({ success: false, message: 'Hostel not found' });

    res.json({ success: true, data: detailData });
  } catch (error) {
    console.error('getHostelDetails Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

/**
 * PATCH /governance/hostels/:id
 */
exports.updateHostel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, type, capacity, wardenId, deputyWardenId } = req.body;
    const result = await pool.query(
      `UPDATE hostels SET name = $1, type = $2, capacity = $3, warden_id = $4, deputy_warden_id = $5, updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [name, type, capacity, wardenId, deputyWardenId, id]
    );

    // ⚡ INVALDIATE CACHE
    await redisService.invalidatePattern('governance:hostels:*');

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /governance/hostels/:id
 */
exports.deleteHostel = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM hostels WHERE id = $1', [id]);
    
    // ⚡ INVALDIATE CACHE
    await redisService.invalidatePattern('governance:hostels:*');

    res.json({ success: true, message: 'Hostel deleted' });
  } catch (error) {
    next(error);
  }
};

/**
 * Mapping Helpers
 */
exports.getFacultyForMapping = async (req, res, next) => {
  try {
    const faculty = await redisService.getOrSetCache(
      'governance:faculty:mapping_list',
      async () => {
        const result = await pool.query(
          `SELECT u.id, u.name, u.role, u.department_id 
           FROM users u 
           WHERE u.role IN ($1, $2, $3) AND u.status = 'approved'`,
          [ROLES.FACULTY, ROLES.WARDEN, ROLES.DEPUTY_WARDEN]
        );
        return result.rows;
      },
      1800
    );
    res.json({ success: true, data: faculty });
  } catch (error) {
    next(error);
  }
};

exports.createHostelMapping = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { hostelId, wardenId, deputyWardenId } = req.body;
    
    // Verify entities
    const hResult = await client.query('SELECT name FROM hostels WHERE id = $1', [hostelId]);
    if (hResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Hostel not found.' });

    await client.query('BEGIN');

    // 1. Update Hostel record with both Warden handles
    await client.query(
      `UPDATE hostels SET warden_id = $1, deputy_warden_id = $2, updated_at = NOW() WHERE id = $3`,
      [wardenId || null, deputyWardenId || null, hostelId]
    );

    // 2. Sync Staff Assignments Trace
    if (wardenId) {
      await client.query(
        `INSERT INTO staff_assignments (user_id, entity_type, entity_id, assignment_type)
         VALUES ($1, 'HOSTEL', $2, 'WARDEN')
         ON CONFLICT (user_id, entity_type, entity_id) DO UPDATE SET assignment_type = 'WARDEN'`,
        [wardenId, hostelId]
      );
    }

    if (deputyWardenId) {
       await client.query(
         `INSERT INTO staff_assignments (user_id, entity_type, entity_id, assignment_type)
          VALUES ($1, 'HOSTEL', $2, 'DEPUTY_WARDEN')
          ON CONFLICT (user_id, entity_type, entity_id) DO UPDATE SET assignment_type = 'DEPUTY_WARDEN'`,
         [deputyWardenId, hostelId]
       );
    }

    // 3. Sync Warden handle in students table (Atomic batch update)
    await client.query(
      `UPDATE students SET warden_id = $1, updated_at = NOW() WHERE hostel_id = $2`,
      [wardenId || null, hostelId]
    );

    await client.query('COMMIT');

    // ⚡ INVALDIATE CACHE
    await redisService.invalidatePattern('governance:hostels:*');

    res.json({ success: true, message: 'Residential Block mapping synchronized.' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

exports.getMappingSummary = async (req, res, next) => {
  try {
    const [deptMappings, hostelMappings, classMappings] = await Promise.all([
      pool.query(`
        SELECT d.id, d.name as entity_name, u.name as personnel_name, 
               d.hod_id, 'department' as type 
        FROM departments d 
        LEFT JOIN users u ON d.hod_id = u.id
        ORDER BY d.name
      `),
      pool.query(`
        SELECT h.id, h.name as entity_name, u1.name as personnel_name, 
               u2.name as deputy_name, h.warden_id, h.deputy_warden_id, 'hostel' as type 
        FROM hostels h 
        LEFT JOIN users u1 ON h.warden_id = u1.id
        LEFT JOIN users u2 ON h.deputy_warden_id = u2.id
        ORDER BY h.name
      `),
      pool.query(`
        SELECT c.id, c.name as entity_name, d.name as parent_name, u.name as personnel_name, 
               c.faculty_advisor_id as mentor_id, c.department_id, 'class' as type 
        FROM classes c 
        LEFT JOIN departments d ON c.department_id = d.id
        LEFT JOIN users u ON c.faculty_advisor_id = u.id
        ORDER BY c.name
      `)
    ]);

    res.json({
      success: true,
      data: {
        departments: deptMappings.rows,
        hostels: hostelMappings.rows,
        classes: classMappings.rows
      }
    });
  } catch (error) {
    next(error);
  }
};
