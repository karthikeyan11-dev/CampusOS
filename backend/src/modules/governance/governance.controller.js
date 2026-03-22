const { pool } = require('../../config/database');
const { ROLES } = require('../../config/constants');

/**
 * GET /governance/departments
 */
exports.getDepartments = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT d.*, u.name as hod_name,
              (SELECT COUNT(*) FROM classes WHERE department_id = d.id) as class_count,
              (SELECT COUNT(*) FROM students WHERE department_id = d.id) as student_count
       FROM departments d
       LEFT JOIN users u ON d.hod_id = u.id
       ORDER BY d.name ASC`
    );
    res.json({ success: true, data: result.rows });
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

    // 1. Dept Info with HOD
    const deptResult = await pool.query(
      `SELECT d.*, u.name as hod_name, u.email as hod_email 
       FROM departments d 
       LEFT JOIN users u ON d.hod_id = u.id 
       WHERE d.id = $1`, [id]
    );
    if (deptResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Dept not found' });

    // 2. Sections (Classes) with Mentors
    const classes = await pool.query(
      `SELECT c.*, u.name as mentor_name 
       FROM classes c 
       LEFT JOIN users u ON c.mentor_id = u.id 
       WHERE c.department_id = $1
       ORDER BY c.name ASC`, [id]
    );

    // 3. Students
    const students = await pool.query(
      `SELECT s.*, u.name, c.name as class_name 
       FROM students s 
       JOIN users u ON s.user_id = u.id 
       LEFT JOIN classes c ON s.class_id = c.id 
       WHERE s.department_id = $1`, [id]
    );

    res.json({
      success: true,
      data: {
        department: deptResult.rows[0],
        classes: classes.rows || [],
        students: students.rows || []
      }
    });
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
    const result = await pool.query(
      `SELECT h.*, u1.name as warden_name, u2.name as deputy_warden_name,
              (SELECT COUNT(*) FROM students WHERE hostel_id = h.id) as student_count
       FROM hostels h
       LEFT JOIN users u1 ON h.warden_id = u1.id
       LEFT JOIN users u2 ON h.deputy_warden_id = u2.id
       ORDER BY h.name ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
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

    // 1. Hostel Info with Wardens
    const hostelResult = await pool.query(
      `SELECT h.*, u1.name as warden_name, u1.email as warden_email,
              u2.name as deputy_warden_name, u2.email as deputy_warden_email
       FROM hostels h
       LEFT JOIN users u1 ON h.warden_id = u1.id
       LEFT JOIN users u2 ON h.deputy_warden_id = u2.id
       WHERE h.id = $1`, [id]
    );
    if (hostelResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Hostel not found' });

    // 2. Hosteller Students
    const students = await pool.query(
      `SELECT s.*, u.name 
       FROM students s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.hostel_id = $1
       ORDER BY u.name ASC`, [id]
    );

    res.json({
      success: true,
      data: {
        hostel: hostelResult.rows[0],
        students: students.rows || []
      }
    });
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
    const faculty = await pool.query(
      `SELECT u.id, u.name, u.role, u.department_id 
       FROM users u 
       WHERE u.role IN ($1, $2, $3) AND u.status = 'approved'`,
      [ROLES.FACULTY, ROLES.WARDEN, ROLES.DEPUTY_WARDEN]
    );
    res.json({ success: true, data: faculty.rows });
  } catch (error) {
    next(error);
  }
};

exports.createHostelMapping = async (req, res, next) => {
  try {
    const { hostelId, wardenId } = req.body;
    
    // Verify entities
    const hResult = await pool.query('SELECT name FROM hostels WHERE id = $1', [hostelId]);
    if (hResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Hostel not found.' });

    const wResult = await pool.query('SELECT name, role FROM users WHERE id = $1', [wardenId]);
    if (wResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Warden not found.' });

    // Update Hostel record with the primary Warden
    await pool.query(
      `UPDATE hostels SET warden_id = $1, updated_at = NOW() WHERE id = $2`,
      [wardenId, hostelId]
    );

    // Also sync the user's primary association in staff_assignments (optional but good for hierarchy)
    await pool.query(
      `INSERT INTO staff_assignments (user_id, entity_type, entity_id, assignment_type)
       VALUES ($1, 'HOSTEL', $2, 'WARDEN')
       ON CONFLICT (user_id, entity_type, entity_id) DO UPDATE SET assignment_type = 'WARDEN'`,
      [wardenId, hostelId]
    );

    res.json({ success: true, message: 'Hostel-Warden mapping updated successfully.' });
  } catch (error) {
    next(error);
  }
};
