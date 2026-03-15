const { pool, withTransaction } = require('../../config/database');
const { ROLES, BOOKING_STATUS } = require('../../config/constants');
const { generateBookingQR } = require('../../services/qr.service');

/**
 * GET /resources
 */
const getResources = async (req, res, next) => {
  try {
    const { type, departmentId } = req.query;
    let conditions = ['r.is_active = true'];
    let params = [];
    let idx = 0;

    if (type) { idx++; conditions.push(`r.type = $${idx}`); params.push(type); }
    if (departmentId) { idx++; conditions.push(`r.department_id = $${idx}`); params.push(departmentId); }

    const result = await pool.query(
      `SELECT r.*, d.name as department_name
       FROM resources r
       LEFT JOIN departments d ON r.department_id = d.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY r.name`,
      params
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /resources
 */
const createResource = async (req, res, next) => {
  try {
    const { name, type, location, capacity, departmentId, description, amenities } = req.body;

    const result = await pool.query(
      `INSERT INTO resources (name, type, location, capacity, department_id, description, amenities)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, type, location, capacity, departmentId, description, amenities]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /resources/book
 */
const bookResource = async (req, res, next) => {
  try {
    const { resourceId, title, purpose, startTime, endTime, notes } = req.body;

    // Use transaction for race condition prevention
    const booking = await withTransaction(async (client) => {
      // Check for conflicting bookings using SELECT FOR UPDATE
      const conflict = await client.query(
        `SELECT id FROM bookings 
         WHERE resource_id = $1 
         AND status IN ('approved', 'pending')
         AND tstzrange(start_time, end_time) && tstzrange($2::timestamptz, $3::timestamptz)
         FOR UPDATE`,
        [resourceId, startTime, endTime]
      );

      if (conflict.rows.length > 0) {
        throw new Error('Time slot is already booked or has a pending request.');
      }

      const result = await client.query(
        `INSERT INTO bookings (resource_id, booked_by, title, purpose, start_time, end_time, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [resourceId, req.user.id, title, purpose, startTime, endTime, notes]
      );

      return result.rows[0];
    });

    res.status(201).json({
      success: true,
      message: 'Booking request submitted.',
      data: booking,
    });
  } catch (error) {
    if (error.message.includes('already booked')) {
      return res.status(409).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * GET /resources/:resourceId/availability
 */
const getAvailability = async (req, res, next) => {
  try {
    const { resourceId } = req.params;
    const { date } = req.query; // YYYY-MM-DD

    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;

    const bookings = await pool.query(
      `SELECT b.id, b.title, b.start_time, b.end_time, b.status, u.name as booked_by_name
       FROM bookings b
       JOIN users u ON b.booked_by = u.id
       WHERE b.resource_id = $1 
       AND b.status IN ('approved', 'pending')
       AND b.start_time >= $2 AND b.end_time <= $3
       ORDER BY b.start_time`,
      [resourceId, startOfDay, endOfDay]
    );

    res.json({ success: true, data: bookings.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /resources/bookings/:id/approve
 */
const approveBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    const newStatus = action === 'approve' ? BOOKING_STATUS.APPROVED : BOOKING_STATUS.REJECTED;

    let qrToken = null;
    if (newStatus === BOOKING_STATUS.APPROVED) {
      const booking = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
      if (booking.rows.length > 0) {
        const qrResult = await generateBookingQR(booking.rows[0]);
        qrToken = qrResult.token;
      }
    }

    const result = await pool.query(
      `UPDATE bookings SET status = $1, approved_by = $2, approved_at = NOW(), qr_token = $3
       WHERE id = $4 AND status = 'pending' RETURNING *`,
      [newStatus, req.user.id, qrToken, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found or already processed.' });
    }

    res.json({
      success: true,
      message: `Booking ${action}d.`,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /resources/bookings
 */
const getBookings = async (req, res, next) => {
  try {
    const { status, resourceId, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let conditions = [];
    let params = [];
    let idx = 0;

    if (req.user.role === ROLES.FACULTY) {
      idx++; conditions.push(`b.booked_by = $${idx}`); params.push(req.user.id);
    }

    if (status) { idx++; conditions.push(`b.status = $${idx}`); params.push(status); }
    if (resourceId) { idx++; conditions.push(`b.resource_id = $${idx}`); params.push(resourceId); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT b.*, r.name as resource_name, r.location as resource_location,
              u.name as booked_by_name, ap.name as approved_by_name
       FROM bookings b
       JOIN resources r ON b.resource_id = r.id
       JOIN users u ON b.booked_by = u.id
       LEFT JOIN users ap ON b.approved_by = ap.id
       ${whereClause}
       ORDER BY b.start_time DESC
       LIMIT $${idx + 1} OFFSET $${idx + 2}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getResources,
  createResource,
  bookResource,
  getAvailability,
  approveBooking,
  getBookings,
};
