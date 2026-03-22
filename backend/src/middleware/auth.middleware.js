const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { pool } = require('../config/database');
const { USER_STATUS } = require('../config/constants');

/**
 * Authentication middleware — verifies JWT access token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error_code: 'UNAUTHORIZED',
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, config.jwt.accessSecret);

    // Fetch user from database to ensure they still exist and are active
    const result = await pool.query(
      'SELECT id, email, name, role, status, department_id FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error_code: 'USER_NOT_FOUND',
        message: 'User session invalid.',
      });
    }

    const user = result.rows[0];

    if (user.status !== USER_STATUS.APPROVED) {
      return res.status(403).json({
        success: false,
        error_code: 'ACCOUNT_PENDING',
        message: `Account is ${user.status}. Contact administrator.`,
      });
    }

    // Attach user to request object
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      departmentId: user.department_id,
      approvedAt: user.approved_at,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error_code: 'TOKEN_EXPIRED',
        message: 'Token expired. Please refresh.',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error_code: 'INVALID_TOKEN',
        message: 'Invalid token signature.',
      });
    }

    next(error);
  }
};

/**
 * Optional authentication — attaches user if token present, continues if not
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.jwt.accessSecret);

      const result = await pool.query(
        'SELECT id, email, name, role, status, department_id FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length > 0 && result.rows[0].status === USER_STATUS.APPROVED) {
        req.user = {
          id: result.rows[0].id,
          email: result.rows[0].email,
          name: result.rows[0].name,
          role: result.rows[0].role,
          departmentId: result.rows[0].department_id,
        };
      }
    }

    next();
  } catch {
    // Token invalid — continue without auth
    next();
  }
};

module.exports = { authenticate, optionalAuth };
