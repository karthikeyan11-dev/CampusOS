const { pool } = require('../../config/database');
const { ROLES } = require('../../config/constants');

/**
 * POST /hostels
 * Admin only: Create a new hostel building or floor
 */
const createHostel = async (req, res, next) => {
  try {
    const { name, type, capacity, description } = req.body;

    const result = await pool.query(
      `INSERT INTO hostels (name, type, capacity, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, type || 'building', capacity || 100, description]
    );

    res.status(201).json({
      success: true,
      message: 'Hostel created successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /hostels/:id/assign
 * Admin only: Assign warden and deputy warden
 */
const assignWardens = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { wardenId, deputyWardenId } = req.body;

    // Validate warden roles
    if (wardenId) {
      const wRes = await pool.query('SELECT role FROM users WHERE id = $1', [wardenId]);
      if (wRes.rows.length === 0 || wRes.rows[0].role !== ROLES.WARDEN) {
        return res.status(400).json({ success: false, message: 'Invalid Warden ID. User must have Warden role.' });
      }
    }

    if (deputyWardenId) {
      const dRes = await pool.query('SELECT role FROM users WHERE id = $1', [deputyWardenId]);
      if (dRes.rows.length === 0 || dRes.rows[0].role !== ROLES.DEPUTY_WARDEN) {
        return res.status(400).json({ success: false, message: 'Invalid Deputy Warden ID. User must have Deputy Warden role.' });
      }
    }

    const result = await pool.query(
      `UPDATE hostels 
       SET warden_id = COALESCE($1, warden_id), 
           deputy_warden_id = COALESCE($2, deputy_warden_id)
       WHERE id = $3 RETURNING *`,
      [wardenId, deputyWardenId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Hostel not found.' });
    }

    // TASK 3 (Phase 2/3): Propagate warden changes to students only (Snapshot Model policy)
    if (wardenId) {
      // 1. Update students for future passes
      await pool.query('UPDATE students SET warden_id = $1 WHERE hostel_id = $2', [wardenId, id]);
      
      // NOTE: Existing gate passes are NOT modified so they keep their snapshots or old approvers.
    }

    res.json({
      success: true,
      message: 'Wardens reassigned. New student mappings updated. Existing passes untouched (Snapshots preserved).',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /hostels
 */
const getHostels = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT h.*, 
             u1.name as warden_name, u1.phone as warden_phone,
             u2.name as deputy_warden_name, u2.phone as deputy_warden_phone
      FROM hostels h
      LEFT JOIN users u1 ON h.warden_id = u1.id
      LEFT JOIN users u2 ON h.deputy_warden_id = u2.id
      ORDER BY h.name ASC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createHostel,
  assignWardens,
  getHostels,
};
