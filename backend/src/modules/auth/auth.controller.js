const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../../config/database');
const config = require('../../config/env');
const { ROLES, USER_STATUS } = require('../../config/constants');
const { sendApprovalEmail } = require('../../services/email.service');

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
      facultyIdNumber, designation,
    } = req.body;

    // Check if email already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    // Check duplicate roll number for students
    if (role === ROLES.STUDENT && rollNumber) {
      const existingRoll = await pool.query('SELECT id FROM students WHERE roll_number = $1', [rollNumber]);
      if (existingRoll.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Roll number already registered.' });
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
      await pool.query(
        `INSERT INTO students (user_id, roll_number, class_id, batch, residence_type, hostel_block, room_number,
         father_name, father_phone, mother_name, mother_phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [user.id, rollNumber, classId, batch, residenceType || 'day_scholar', hostelBlock, roomNumber,
         fatherName, fatherPhone, motherName, motherPhone]
      );
    } else if (role === ROLES.FACULTY || role === ROLES.DEPARTMENT_ADMIN) {
      await pool.query(
        `INSERT INTO faculty (user_id, faculty_id_number, designation)
         VALUES ($1, $2, $3)`,
        [user.id, facultyIdNumber, designation]
      );
    }

    // Handle file uploads (ID card)
    if (req.file) {
      const idCardUrl = `/uploads/id-cards/${req.file.filename}`;
      if (role === ROLES.STUDENT) {
        await pool.query('UPDATE students SET id_card_url = $1 WHERE user_id = $2', [idCardUrl, user.id]);
      } else if (role === ROLES.FACULTY || role === ROLES.DEPARTMENT_ADMIN) {
        await pool.query('UPDATE faculty SET id_card_url = $1 WHERE user_id = $2', [idCardUrl, user.id]);
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

    // Find user
    const result = await pool.query(
      `SELECT u.*, d.name as department_name, d.code as department_code
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Check account status
    if (user.status !== USER_STATUS.APPROVED) {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status}. ${user.status === 'pending' ? 'Awaiting admin approval.' : 'Contact administrator.'}`,
        status: user.status,
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Save refresh token and update last login
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
    } else if (user.role === ROLES.FACULTY || user.role === ROLES.DEPARTMENT_ADMIN) {
      const facultyResult = await pool.query(
        'SELECT * FROM faculty WHERE user_id = $1',
        [user.id]
      );
      if (facultyResult.rows.length > 0) roleData = facultyResult.rows[0];
    }

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

    // Fetch role-specific data
    let roleData = {};
    if (user.role === ROLES.STUDENT) {
      const r = await pool.query(
        `SELECT s.*, c.name as class_name FROM students s
         LEFT JOIN classes c ON s.class_id = c.id WHERE s.user_id = $1`,
        [user.id]
      );
      if (r.rows.length > 0) roleData = { student: r.rows[0] };
    } else if (user.role === ROLES.FACULTY || user.role === ROLES.DEPARTMENT_ADMIN) {
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
             d.name as department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.status = 'pending'
    `;
    const params = [];

    // HOD/Faculty can only see students from their department
    if (req.user.role === ROLES.DEPARTMENT_ADMIN || req.user.role === ROLES.FACULTY) {
      query += ' AND u.department_id = $1';
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

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  getProfile,
  approveUser,
  getPendingUsers,
};
