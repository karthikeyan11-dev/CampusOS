const { pool } = require('../../config/database');

/**
 * GET /governance/lookup/departments
 */
exports.lookupDepartments = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT id, name FROM departments ORDER BY name ASC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /governance/lookup/hostels
 */
exports.lookupHostels = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT id, name FROM hostels ORDER BY name ASC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};
