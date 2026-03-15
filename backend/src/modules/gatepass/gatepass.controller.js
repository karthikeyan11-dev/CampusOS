const { pool } = require('../../config/database');
const { ROLES, GATE_PASS_STATUS, GATE_PASS_TYPE } = require('../../config/constants');
const { generateGatePassQR, verifyGatePassQR } = require('../../services/qr.service');
const { getGatePassTimeWindow } = require('./gatepass.service');
const { sendParentSMS, sendLateReturnAlert } = require('../../services/sms.service');
const { sendGatePassEmail } = require('../../services/email.service');

/**
 * POST /gatepass/request
 */
const requestGatePass = async (req, res, next) => {
  try {
    const { reason, leaveDate, outTime, returnDate, returnTime } = req.body;

    // Determine pass type
    let passType = GATE_PASS_TYPE.DAY_SCHOLAR;
    let initialStatus = GATE_PASS_STATUS.PENDING_FACULTY;

    if (req.user.role === ROLES.STUDENT) {
      // Check if hosteller
      const studentResult = await pool.query(
        'SELECT residence_type FROM students WHERE user_id = $1',
        [req.user.id]
      );
      if (studentResult.rows.length > 0 && studentResult.rows[0].residence_type === 'hosteller') {
        passType = GATE_PASS_TYPE.HOSTELLER;
      }
    } else if (req.user.role === ROLES.FACULTY) {
      passType = GATE_PASS_TYPE.FACULTY;
      initialStatus = GATE_PASS_STATUS.PENDING_HOD;
    } else if (req.user.role === ROLES.DEPARTMENT_ADMIN) {
      passType = GATE_PASS_TYPE.HOD;
      initialStatus = GATE_PASS_STATUS.PENDING_SUPER_ADMIN;
    }

    const result = await pool.query(
      `INSERT INTO gate_passes (user_id, pass_type, status, reason, leave_date, out_time, return_date, return_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user.id, passType, initialStatus, reason, leaveDate, outTime, returnDate, returnTime]
    );

    res.status(201).json({
      success: true,
      message: 'Gate pass request submitted.',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /gatepass
 */
const getGatePasses = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let conditions = [];
    let params = [];
    let idx = 0;

    // Role-based filtering
    if (req.user.role === ROLES.STUDENT) {
      idx++; conditions.push(`gp.user_id = $${idx}`); params.push(req.user.id);
    } else if (req.user.role === ROLES.FACULTY) {
      // Faculty sees pending_faculty passes from their department
      idx++; conditions.push(`gp.status = $${idx}`); params.push(GATE_PASS_STATUS.PENDING_FACULTY);
      // Also join to check department
      idx++; conditions.push(`u.department_id = $${idx}`); params.push(req.user.departmentId);
    } else if (req.user.role === ROLES.DEPARTMENT_ADMIN) {
      idx++; conditions.push(`u.department_id = $${idx}`); params.push(req.user.departmentId);
    } else if (req.user.role === ROLES.SECURITY_STAFF) {
      conditions.push(`gp.status IN ('approved', 'exited')`);
    }

    if (status && req.user.role !== ROLES.FACULTY) {
      idx++; conditions.push(`gp.status = $${idx}`); params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT gp.*, u.name as user_name, u.email as user_email,
             d.name as department_name, d.code as department_code,
             s.roll_number, s.residence_type,
             s.father_phone, s.mother_phone
      FROM gate_passes gp
      JOIN users u ON gp.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN students s ON s.user_id = u.id
      ${whereClause}
      ORDER BY gp.created_at DESC
      LIMIT $${idx + 1} OFFSET $${idx + 2}
    `;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    // Filter QR visibility for students
    const processedRows = result.rows.map(row => {
      const { canShowQR } = getGatePassTimeWindow(row);
      if (req.user.role === ROLES.STUDENT && !canShowQR) {
        const { qr_token, ...rest } = row;
        return rest;
      }
      return row;
    });

    res.json({
      success: true,
      data: processedRows,
      pagination: { page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /gatepass/:id/approve
 */
const approveGatePass = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, remarks } = req.body; // 'approve' or 'reject'

    // Fetch current gate pass
    const gpResult = await pool.query(
      `SELECT gp.*, u.name as user_name, u.email as user_email, 
              s.father_phone, s.mother_phone, d.name as department_name
       FROM gate_passes gp
       JOIN users u ON gp.user_id = u.id
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE gp.id = $1`,
      [id]
    );

    if (gpResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Gate pass not found.' });
    }

    const gp = gpResult.rows[0];

    if (action === 'reject') {
      await pool.query(
        `UPDATE gate_passes SET status = 'rejected', 
         ${gp.status === 'pending_faculty' ? 'faculty_approver_id' : gp.status === 'pending_hod' ? 'hod_approver_id' : 'admin_approver_id'} = $1,
         ${gp.status === 'pending_faculty' ? 'faculty_remarks' : gp.status === 'pending_hod' ? 'hod_remarks' : 'admin_remarks'} = $2
         WHERE id = $3`,
        [req.user.id, remarks, id]
      );

      return res.json({ success: true, message: 'Gate pass rejected.' });
    }

    // Approval logic based on current status
    let newStatus, updateField, remarkField;

    if (gp.status === GATE_PASS_STATUS.PENDING_FACULTY) {
      newStatus = GATE_PASS_STATUS.PENDING_HOD;
      updateField = 'faculty_approver_id';
      remarkField = 'faculty_remarks';
    } else if (gp.status === GATE_PASS_STATUS.PENDING_HOD) {
      newStatus = GATE_PASS_STATUS.APPROVED;
      updateField = 'hod_approver_id';
      remarkField = 'hod_remarks';
    } else if (gp.status === GATE_PASS_STATUS.PENDING_SUPER_ADMIN) {
      newStatus = GATE_PASS_STATUS.APPROVED;
      updateField = 'admin_approver_id';
      remarkField = 'admin_remarks';
    } else {
      return res.status(400).json({ success: false, message: 'Gate pass cannot be approved in current state.' });
    }

    let qrToken = null;
    let qrDataUrl = null;

    // If fully approved, generate QR
    if (newStatus === GATE_PASS_STATUS.APPROVED) {
      const qrResult = await generateGatePassQR(gp);
      qrToken = qrResult.qrToken;
      qrDataUrl = qrResult.qrDataUrl;

      // Calculate QR expiry: out_time + 1 hour
      const outDateTime = new Date(`${gp.leave_date}T${gp.out_time}`);
      const qrExpiry = new Date(outDateTime.getTime() + 60 * 60 * 1000);

      await pool.query(
        `UPDATE gate_passes SET status = $1, ${updateField} = $2, 
         ${remarkField} = $3, ${updateField.replace('_id', '_at')} = NOW(),
         qr_token = $4, qr_generated_at = NOW(), qr_expires_at = $5
         WHERE id = $6`,
        [newStatus, req.user.id, remarks, qrToken, qrExpiry, id]
      );

      // Send email notification
      await sendGatePassEmail(
        gp.user_email, gp.user_name, gp.reason,
        `${gp.leave_date} ${gp.out_time}`,
        gp.return_time ? `${gp.return_date} ${gp.return_time}` : null
      );
    } else {
      await pool.query(
        `UPDATE gate_passes SET status = $1, ${updateField} = $2, 
         ${remarkField} = $3, ${updateField.replace('_id', '_at')} = NOW()
         WHERE id = $4`,
        [newStatus, req.user.id, remarks, id]
      );
    }

    res.json({
      success: true,
      message: newStatus === GATE_PASS_STATUS.APPROVED
        ? 'Gate pass approved. QR code generated.'
        : 'Gate pass forwarded for next approval.',
      data: { status: newStatus, qrDataUrl },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /gatepass/scan
 */
const scanGatePass = async (req, res, next) => {
  try {
    const { qrToken, scanType } = req.body; // scanType: 'exit' or 'return'

    // Verify QR token
    const verification = verifyGatePassQR(qrToken);
    if (!verification.valid) {
      return res.status(400).json({ success: false, message: verification.error });
    }

    const { passId } = verification.data;

    // Fetch gate pass with user details
    const gpResult = await pool.query(
      `SELECT gp.*, u.name as user_name, u.email, u.phone,
              d.name as department_name, d.code as department_code,
              s.roll_number, s.residence_type, s.father_phone, s.mother_phone
       FROM gate_passes gp
       JOIN users u ON gp.user_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN students s ON s.user_id = u.id
       WHERE gp.id = $1`,
      [passId]
    );

    if (gpResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Gate pass not found.' });
    }

    const gp = gpResult.rows[0];

    if (scanType === 'exit') {
      const { scanStatus, validStartTime, canExit } = getGatePassTimeWindow(gp);

      if (gp.status !== GATE_PASS_STATUS.APPROVED && gp.status !== GATE_PASS_STATUS.EXITED) {
        return res.status(400).json({ success: false, message: `Gate pass is ${gp.status}, not approved.` });
      }

      // Early Scan
      if (scanStatus === 'EARLY') {
        const waitTime = validStartTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        return res.json({
          success: true,
          status: 'EARLY_WAIT',
          message: `This gatepass can be opened at or after ${waitTime}. Please wait.`,
          data: {
            studentName: gp.user_name,
            department: gp.department_name,
            outTime: gp.out_time,
            returnTime: gp.return_time,
            reason: gp.reason,
            status: gp.status
          }
        });
      }

      // Expired Scan
      if (scanStatus === 'EXPIRED' && gp.status !== GATE_PASS_STATUS.EXITED) {
        return res.json({
          success: true,
          status: 'EXPIRED',
          message: 'This gatepass has expired.',
          data: {
            studentName: gp.user_name,
            department: gp.department_name,
            outTime: gp.out_time,
            returnTime: gp.return_time,
            reason: gp.reason,
            status: 'EXPIRED'
          }
        });
      }

      // Mark exit if within window
      if (canExit && gp.status === GATE_PASS_STATUS.APPROVED) {
        await pool.query(
          `UPDATE gate_passes SET status = 'exited', exit_scanned_at = NOW(), exit_scanned_by = $1 WHERE id = $2`,
          [req.user.id, passId]
        );

        // Send parent SMS
        if (gp.father_phone || gp.mother_phone) {
          const parentPhone = gp.father_phone || gp.mother_phone;
          await sendParentSMS(
            parentPhone, gp.user_name, gp.department_name,
            new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            gp.return_time || 'Not specified',
            gp.reason
          );
          await pool.query('UPDATE gate_passes SET parent_sms_sent = true WHERE id = $1', [passId]);
        }

        return res.json({
          success: true,
          status: 'EXITED',
          message: 'Exit recorded.',
          data: {
            studentName: gp.user_name,
            rollNumber: gp.roll_number,
            department: gp.department_name,
            reason: gp.reason,
            returnTime: gp.return_time,
            returnDate: gp.return_date,
          },
        });
      }
      
      // If already exited
      if (gp.status === GATE_PASS_STATUS.EXITED) {
        return res.json({
          success: true,
          status: 'ALREADY_EXITED',
          message: 'Student has already exited campus.',
          data: { studentName: gp.user_name, exitTime: gp.exit_scanned_at }
        });
      }

    } else if (scanType === 'return') {
      if (gp.status !== GATE_PASS_STATUS.EXITED) {
        return res.status(400).json({ success: false, message: 'Gate pass is not in exited state.' });
      }

      await pool.query(
        `UPDATE gate_passes SET status = 'completed', return_scanned_at = NOW(), return_scanned_by = $1 WHERE id = $2`,
        [req.user.id, passId]
      );

      return res.json({
        success: true,
        message: 'Return recorded. Gate pass completed.',
        data: { studentName: gp.user_name, department: gp.department_name },
      });
    }

    res.status(400).json({ success: false, message: 'Invalid scan type.' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /gatepass/:id
 */
const getGatePassById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT gp.*, u.name as user_name, d.name as department_name,
              s.roll_number, s.residence_type,
              fa.name as faculty_approver_name,
              ha.name as hod_approver_name,
              aa.name as admin_approver_name
       FROM gate_passes gp
       JOIN users u ON gp.user_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN users fa ON gp.faculty_approver_id = fa.id
       LEFT JOIN users ha ON gp.hod_approver_id = ha.id
       LEFT JOIN users aa ON gp.admin_approver_id = aa.id
       WHERE gp.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Gate pass not found.' });
    }

    const gp = result.rows[0];
    const { canShowQR } = getGatePassTimeWindow(gp);

    if (req.user.role === ROLES.STUDENT && !canShowQR) {
      gp.qr_token = null; // Redact token
    }

    res.json({ success: true, data: gp });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requestGatePass,
  getGatePasses,
  approveGatePass,
  scanGatePass,
  getGatePassById,
};
