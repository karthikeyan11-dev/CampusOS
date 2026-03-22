const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../../config/database');
const config = require('../../config/env');
const { ROLES, USER_STATUS } = require('../../config/constants');
const { sendApprovalEmail } = require('../../services/email.service');
const { verifyIDCard } = require('../../services/ai.service');
const redisService = require('../../services/redis.service');

/**
 * Generate JWT tokens
 */
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiry }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiry }
  );

  return { accessToken, refreshToken };
};

/**
 * POST /auth/register
 */
const register = async (req, res, next) => {
  try {
    const {
      email, password, name, phone, role, departmentId,
      rollNumber, classId, batch, residenceType, hostelBlock, roomNumber,
      fatherName, fatherPhone, motherName, motherPhone,
      facultyIdNumber, designation, wardenId, hostelId, mentorId,
    } = req.body;

    // Enforce initial registration roles
    const REGISTRATION_ROLES = [ROLES.STUDENT, ROLES.FACULTY, ROLES.SECURITY_STAFF];
    if (!REGISTRATION_ROLES.includes(role)) {
      return res.status(403).json({ success: false, message: 'Invalid role for initial registration. Request admin promotion after approval.' });
    }

    // Check if email already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    // Check duplicate roll number for students
    if (role === ROLES.STUDENT && rollNumber) {
      const existingRoll = await pool.query('SELECT id FROM students WHERE roll_number = $1', [rollNumber]);
      if (existingRoll.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Roll Number already registered.' });
      }
    }

    // Check duplicate faculty ID
    if ((role === ROLES.FACULTY || role === ROLES.DEPARTMENT_ADMIN) && facultyIdNumber) {
      const existingFaculty = await pool.query('SELECT id FROM faculty WHERE faculty_id_number = $1', [facultyIdNumber]);
      if (existingFaculty.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Faculty ID already registered.' });
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Determine initial status
    let status = USER_STATUS.PENDING;
    if (role === ROLES.SUPER_ADMIN) {
      return res.status(403).json({ success: false, message: 'Super Admin cannot be registered via API.' });
    }

    // Create user
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, role, status, name, phone, department_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email, name, role, status, created_at`,
      [email, passwordHash, role, status, name, phone, departmentId]
    );

    const user = userResult.rows[0];

    // Create role-specific record
    if (role === ROLES.STUDENT) {
      // Step 2: Automated Relationship Mapping (The "Class-First" Logic)
      // Lookup Mentor and Department/HOD based on class name
      let mappedMentorId = null;
      let mappedDeptId = departmentId;

      if (req.body.className) {
        const classRes = await pool.query(
          `SELECT mentor_id, department_id FROM class_assignments WHERE class_name = $1`,
          [req.body.className]
        );
        if (classRes.rows.length > 0) {
          mappedMentorId = classRes.rows[0].mentor_id;
          mappedDeptId = classRes.rows[0].department_id;
          
          // Update user's department if missing
          const targetDeptResult = await pool.query('SELECT id FROM departments WHERE id = $1', [mappedDeptId]);
          if (targetDeptResult.rows.length > 0) {
              await pool.query('UPDATE users SET department_id = $1 WHERE id = $2', [mappedDeptId, user.id]);
          }
        }
      }

      // TASK 8.4: Auto-map Warden from Hostel for consistency
      let assignedWarden = wardenId;
      if (hostelId) {
        const hRes = await pool.query('SELECT warden_id FROM hostels WHERE id = $1', [hostelId]);
        if (hRes.rows.length > 0) assignedWarden = hRes.rows[0].warden_id;
      }

      await pool.query(
        `INSERT INTO students (user_id, roll_number, class_id, batch, residence_type, hostel_block, room_number,
         father_name, father_phone, mother_name, mother_phone, warden_id, hostel_id, mentor_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [user.id, rollNumber, classId, batch, residenceType || 'day_scholar', hostelBlock, roomNumber,
         fatherName, fatherPhone, motherName, motherPhone, assignedWarden, hostelId, mappedMentorId || mentorId]
      );
    } else if (role === ROLES.FACULTY || role === ROLES.DEPARTMENT_ADMIN || role === ROLES.WARDEN || role === ROLES.DEPUTY_WARDEN) {
      // Set initial faculty_type based on designation if provided
      const isAcademic = ['mentor', 'hod'].includes(designation?.toLowerCase());
      const facultyType = isAcademic ? 'academic' : 'non_academic';

      await pool.query(
        `INSERT INTO faculty (user_id, faculty_id_number, designation, faculty_type)
         VALUES ($1, $2, $3, $4)`,
        [user.id, facultyIdNumber, designation, facultyType]
      );
    }

    // Handle file uploads (ID card) & AI Verification
    if (req.file) {
      const idCardUrl = `/uploads/id-cards/${req.file.filename}`;
      
      // Update DB with URL first
      if (role === ROLES.STUDENT) {
        await pool.query('UPDATE students SET id_card_url = $1 WHERE user_id = $2', [idCardUrl, user.id]);
      } else {
        await pool.query('UPDATE faculty SET id_card_url = $1 WHERE user_id = $2', [idCardUrl, user.id]);
      }

      // AI ID Verification (Phase 3)
      const fullUrl = `${req.protocol}://${req.get('host')}${idCardUrl}`;
      const aiData = await verifyIDCard(fullUrl);
      
      if (aiData) {
        const nameMatch = aiData.name && aiData.name.toLowerCase().includes(name.toLowerCase().split(' ')[0]);
        const rollMatch = role !== ROLES.STUDENT || (aiData.rollNumber && aiData.rollNumber.includes(rollNumber));
        const confidenceScore = aiData.confidenceScore || 0;

        const isVerified = nameMatch && rollMatch && confidenceScore >= 0.8;

        // Save AI results for admin review
        const table = role === ROLES.STUDENT ? 'students' : 'faculty';
        await pool.query(
          `UPDATE ${table} SET ai_verified = $1, ai_remarks = $2 WHERE user_id = $3`,
          [isVerified, `Score: ${confidenceScore}, NameMatch: ${nameMatch}, RollMatch: ${rollMatch}`, user.id]
        );

        if (!isVerified && confidenceScore < 0.5) {
          // Only hard-reject if confidence is extremely low or absolute mismatch
          await pool.query('DELETE FROM users WHERE id = $1', [user.id]);
          return res.status(400).json({ 
            success: false, 
            error_code: 'VERIFICATION_FAILED',
            message: 'ID card clear mismatch or poor quality. Please upload a clear image.',
            extracted: aiData 
          });
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Registration submitted. Awaiting approval.',
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    console.log(`[AUTH] Login attempt: ${email}`);

    // Find user
    const result = await pool.query(
      `SELECT u.*, d.name as department_name, d.code as department_code
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      console.warn(`[AUTH] Login failed: User ${email} not found.`);
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = result.rows[0];
    console.log(`[AUTH] User found: ${user.email}, Role: ${user.role}, Status: ${user.status}`);

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      console.warn(`[AUTH] Login failed: Password mismatch for ${email}.`);
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    console.log(`[AUTH] Password verified for ${email}.`);

    // Check account status
    if (user.status !== USER_STATUS.APPROVED) {
      console.warn(`[AUTH] Login failed: Account status is ${user.status} for ${email}.`);
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status}. ${user.status === 'pending' ? 'Awaiting admin approval.' : 'Contact administrator.'}`,
        status: user.status,
      });
    }

    // Generate tokens
    console.log(`[AUTH] Generating tokens for ${email}...`);
    const { accessToken, refreshToken } = generateTokens(user);
    console.log(`[AUTH] Tokens generated successfully.`);

    // Save refresh token and update last login
    console.log(`[AUTH] Updating session for ${email}...`);
    await pool.query(
      'UPDATE users SET refresh_token = $1, last_login = NOW() WHERE id = $2',
      [refreshToken, user.id]
    );

    // Fetch role-specific data
    let roleData = {};
    if (user.role === ROLES.STUDENT) {
      const studentResult = await pool.query(
        `SELECT s.*, c.name as class_name FROM students s
         LEFT JOIN classes c ON s.class_id = c.id
         WHERE s.user_id = $1`,
        [user.id]
      );
      if (studentResult.rows.length > 0) roleData = studentResult.rows[0];
    } else if ([ROLES.FACULTY, ROLES.DEPARTMENT_ADMIN, ROLES.WARDEN, ROLES.DEPUTY_WARDEN].includes(user.role)) {
      const facultyResult = await pool.query(
        'SELECT * FROM faculty WHERE user_id = $1',
        [user.id]
      );
      if (facultyResult.rows.length > 0) roleData = facultyResult.rows[0];
    }
    console.log(`[AUTH] Login complete for ${email}. Sending response.`);

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone,
          avatarUrl: user.avatar_url,
          department: user.department_name ? {
            id: user.department_id,
            name: user.department_name,
            code: user.department_code,
          } : null,
          ...roleData,
        },
      },
    });
  } catch (error) {
    console.error(`[AUTH] Login ERROR for ${req.body.email}:`, error.message);
    next(error);
  }
};

/**
 * POST /auth/refresh
 */
const refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);

    // Check if token matches stored token
    const result = await pool.query(
      'SELECT id, email, role, refresh_token FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0 || result.rows[0].refresh_token !== refreshToken) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }

    const user = result.rows[0];
    const tokens = generateTokens(user);

    // Update refresh token
    await pool.query('UPDATE users SET refresh_token = $1 WHERE id = $2', [tokens.refreshToken, user.id]);

    res.json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Refresh token expired. Please login again.' });
    }
    next(error);
  }
};

/**
 * POST /auth/logout
 */
const logout = async (req, res, next) => {
  try {
    await pool.query('UPDATE users SET refresh_token = NULL WHERE id = $1', [req.user.id]);
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /auth/me
 */
const getProfile = async (req, res, next) => {
  try {
    let roleData = {};
    const result = await pool.query(
      `SELECT u.id, u.email, u.name, u.role, u.phone, u.avatar_url, u.status, u.department_id,
              d.name as department_name, d.code as department_code
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = result.rows[0];

    // IF STUDENT: Fetch full details (Mentor, HOD, Warden)
    if (user.role === ROLES.STUDENT) {
      const studentFullRes = await pool.query(`
        SELECT s.*, 
               c.name as class_name,
               m.name as mentor_name, m.phone as mentor_phone,
               hod.name as hod_name, hod.phone as hod_phone,
               h.name as hostel_name,
               w.name as warden_name, w.phone as warden_phone, w.id as warden_id
        FROM students s
        LEFT JOIN classes c ON s.class_id = c.id
        LEFT JOIN users m ON s.mentor_id = m.id
        LEFT JOIN users u_orig ON s.user_id = u_orig.id
        LEFT JOIN departments dep ON u_orig.department_id = dep.id
        LEFT JOIN users hod ON dep.hod_id = hod.id
        LEFT JOIN hostels h ON s.hostel_id = h.id
        LEFT JOIN users w ON h.warden_id = w.id
        WHERE s.user_id = $1
      `, [user.id]);
      
      if (studentFullRes.rows.length > 0) {
        const s = studentFullRes.rows[0];
        roleData = {
          student: {
            roll_number: s.roll_number,
            year_of_study: s.year_of_study,
            residence_type: s.residence_type,
            parents: {
              father: { name: s.father_name, phone: s.father_phone },
              mother: { name: s.mother_name, phone: s.mother_phone }
            },
            academic: {
              mentor: { name: s.mentor_name, phone: s.mentor_phone },
              hod: { name: s.hod_name, phone: s.hod_phone }
            },
            hostel: s.residence_type === 'hosteller' ? {
              name: s.hostel_name,
              warden: { name: s.warden_name, phone: s.warden_phone }
            } : null
          }
        };
      }
    } else if ([ROLES.FACULTY, ROLES.DEPARTMENT_ADMIN, ROLES.WARDEN, ROLES.DEPUTY_WARDEN].includes(user.role)) {
      const r = await pool.query('SELECT * FROM faculty WHERE user_id = $1', [user.id]);
      if (r.rows.length > 0) roleData = { faculty: r.rows[0] };
    }

    res.json({
      success: true,
      data: {
        ...user,
        department: user.department_name ? {
          id: user.department_id,
          name: user.department_name,
          code: user.department_code,
        } : null,
        ...roleData,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /auth/users/:id/approve
 */
const approveUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    // Check target user role
    const targetUserRes = await pool.query('SELECT role, department_id FROM users WHERE id = $1', [id]);
    if (targetUserRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const targetUser = targetUserRes.rows[0];

    // RBAC refinement for approval
    if (req.user.role !== ROLES.SUPER_ADMIN) {
      // Faculty and HOD can only approve students
      if (targetUser.role !== ROLES.STUDENT) {
        return res.status(403).json({ success: false, message: 'You only have permission to approve students.' });
      }
      // Must be from the same department
      if (targetUser.department_id !== req.user.department_id) {
        return res.status(403).json({ success: false, message: 'You can only approve users from your own department.' });
      }
    }

    const result = await pool.query(
      `UPDATE users SET status = $1, approved_by = $2, approved_at = NOW()
       WHERE id = $3 AND status = 'pending'
       RETURNING id, email, name, role, status`,
      [status, req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User already processed.' });
    }

    const user = result.rows[0];

    // Send approval email
    await sendApprovalEmail(user.email, user.name, status);

    res.json({
      success: true,
      message: `User ${status} successfully.`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /auth/users/pending
 */
const getPendingUsers = async (req, res, next) => {
  try {
    let query = `
      SELECT u.id, u.email, u.name, u.role, u.phone, u.status, u.created_at,
             d.name as department_name, s.roll_number, f.designation
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN students s ON u.id = s.user_id
      LEFT JOIN faculty f ON u.id = f.user_id
      WHERE u.status = 'pending'
    `;
    const params = [];

    // HOD/Faculty can only see students from their department
    if (req.user.role === ROLES.DEPARTMENT_ADMIN || req.user.role === ROLES.FACULTY) {
      query += ` AND u.department_id = $1 AND u.role = '${ROLES.STUDENT}'`;
      params.push(req.user.departmentId);
    }

    query += ' ORDER BY u.created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /auth/users/:id/promote (Admin)
 */
const promoteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, designation } = req.body;

    // Promotion logic: Designation determines faculty_type
    if (designation) {
      const isAcademic = ['mentor', 'hod'].includes(designation.toLowerCase());
      const facultyType = isAcademic ? 'academic' : 'non_academic';

      // Check if faculty record exists, if not create one
      const facultyExists = await pool.query('SELECT 1 FROM faculty WHERE user_id = $1', [id]);
      if (facultyExists.rows.length === 0) {
        // We need a faculty_id_number, using short ID or email prefix for now if missing
        await pool.query(
          `INSERT INTO faculty (user_id, faculty_id_number, designation, faculty_type) 
           VALUES ($1, $2, $3, $4)`,
          [id, `FAC-${id.substring(0, 8)}`, designation, facultyType]
        );
      } else {
        await pool.query(
          `UPDATE faculty SET designation = $1, faculty_type = $2 WHERE user_id = $3`,
          [designation, facultyType, id]
        );
      }
    }

    if (role) {
      const result = await pool.query(
        `UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, role, name`,
        [role, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });
      return res.json({ success: true, message: 'User role updated.', data: result.rows[0] });
    }

    // Invalidate analytics and profile cache
    await redisService.invalidatePattern('analytics:*');

    res.json({ success: true, message: 'Faculty designation updated.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/assignments/class
 */
const updateClassAssignment = async (req, res, next) => {
  try {
    const { className, mentorId, departmentId } = req.body;
    
    // Verify entities
    const deptCheck = await pool.query('SELECT name FROM departments WHERE id = $1', [departmentId]);
    if (deptCheck.rows.length === 0) return res.status(404).json({ success: false, message: 'Department not found.' });

    const result = await pool.query(
      `INSERT INTO class_assignments (class_name, mentor_id, department_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (class_name) DO UPDATE 
       SET mentor_id = EXCLUDED.mentor_id, department_id = EXCLUDED.department_id, updated_at = NOW()
       RETURNING *`,
      [className, mentorId, departmentId]
    );

    // Sync mentor's department membership
    await pool.query('UPDATE users SET department_id = $1 WHERE id = $2', [departmentId, mentorId]);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/assignments/department
 */
const updateDepartmentAssignment = async (req, res, next) => {
  try {
    const { departmentId, hodId } = req.body;
    
    // Verify department
    const deptCheck = await pool.query('SELECT name FROM departments WHERE id = $1', [departmentId]);
    if (deptCheck.rows.length === 0) return res.status(404).json({ success: false, message: 'Department not found.' });
    const deptName = deptCheck.rows[0].name;

    const result = await pool.query(
      `INSERT INTO department_assignments (dept_name, hod_id, department_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (dept_name) DO UPDATE 
       SET hod_id = EXCLUDED.hod_id, department_id = EXCLUDED.department_id, updated_at = NOW()
       RETURNING *`,
      [deptName, hodId, departmentId]
    );

    // Sync HOD's department membership and designation
    await pool.query('UPDATE users SET department_id = $1 WHERE id = $2', [departmentId, hodId]);
    await pool.query('UPDATE departments SET hod_id = $1 WHERE id = $2', [hodId, departmentId]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /auth/users
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { role } = req.query;
    let query = `
      SELECT u.id, u.email, u.name, u.role, u.status, u.created_at, u.approved_at,
             d.name as department_name, d.code as department_code,
             s.roll_number, f.designation, f.faculty_type
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN students s ON u.id = s.user_id
      LEFT JOIN faculty f ON u.id = f.user_id
      WHERE u.status = 'approved'
    `;
    const params = [];
    if (role && role !== 'all') {
      query += ` AND u.role = $1`;
      params.push(role);
    }
    query += ` ORDER BY u.name ASC`;

    const result = await pool.query(query, params);
    res.json({ success: true, message: 'Identities retrieved.', data: result.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /auth/faculty/mapping
 */
const getFacultyMapping = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, f.designation, f.faculty_type, d.name as department_name
      FROM users u
      JOIN faculty f ON u.id = f.user_id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.status = 'approved' AND u.role IN ('faculty', 'department_admin', 'warden', 'deputy_warden')
      ORDER BY u.name ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  getProfile,
  approveUser,
  getPendingUsers,
  promoteUser,
  updateClassAssignment,
  updateDepartmentAssignment,
  getAllUsers,
  getFacultyMapping
};
