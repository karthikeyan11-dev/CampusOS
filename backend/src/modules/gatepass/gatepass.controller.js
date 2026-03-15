const { pool } = require('../../config/database');
const { ROLES, GATE_PASS_STATUS, GATE_PASS_TYPE } = require('../../config/constants');
const { generateGatePassQR, verifyGatePassQR } = require('../../services/qr.service');
const { getGatePassTimeWindow } = require('./gatepass.service');
const { sendParentSMS, sendLateReturnAlert } = require('../../services/sms.service');
const { sendGatePassEmail } = require('../../services/email.service');

/**
 * POST /gatepass/request
 * 
 * Workflow:
 *   Day Scholar:  Student → Faculty → HOD → approved
 *   Hosteller:    Student → Faculty → HOD → Warden/DeputyWarden → approved
 */
const requestGatePass = async (req, res, next) => {
  try {
    const { reason, leaveDate, outTime, returnDate, returnTime } = req.body;

    // All student requests start at pending_faculty
    let passType = GATE_PASS_TYPE.DAY_SCHOLAR;
    const initialStatus = GATE_PASS_STATUS.PENDING_FACULTY;

    // Determine pass type based on residence
    let wardenId = null;
    if (req.user.role === ROLES.STUDENT) {
      const studentResult = await pool.query(
        'SELECT residence_type, warden_id FROM students WHERE user_id = $1',
        [req.user.id]
      );
      if (studentResult.rows.length > 0) {
        if (studentResult.rows[0].residence_type === 'hosteller') {
          passType = GATE_PASS_TYPE.HOSTELLER;
          wardenId = studentResult.rows[0].warden_id;
        }
      }
    } else if (req.user.role === ROLES.FACULTY) {
      passType = GATE_PASS_TYPE.FACULTY;
    } else if (req.user.role === ROLES.DEPARTMENT_ADMIN) {
      passType = GATE_PASS_TYPE.HOD;
    }

    const result = await pool.query(
      `INSERT INTO gate_passes (user_id, pass_type, status, reason, leave_date, out_time, return_date, return_time, warden_approver_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [req.user.id, passType, initialStatus, reason, leaveDate, outTime, returnDate, returnTime, wardenId]
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
      idx++; conditions.push(`u.department_id = $${idx}`); params.push(req.user.departmentId);
    } else if (req.user.role === ROLES.DEPARTMENT_ADMIN) {
      // HOD sees mentor_approved passes from their department (for HOD approval step)
      idx++; conditions.push(`u.department_id = $${idx}`); params.push(req.user.departmentId);
    } else if (req.user.role === ROLES.WARDEN) {
      // Warden sees hod_approved hosteller passes assigned to them
      idx++; conditions.push(`gp.status = $${idx}`); params.push(GATE_PASS_STATUS.HOD_APPROVED);
      idx++; conditions.push(`gp.pass_type = $${idx}`); params.push(GATE_PASS_TYPE.HOSTELLER);
      idx++; conditions.push(`gp.warden_approver_id = $${idx}`); params.push(req.user.id);
    } else if (req.user.role === ROLES.DEPUTY_WARDEN) {
      // Deputy warden sees hod_approved hosteller passes (fallback for all)
      idx++; conditions.push(`gp.status = $${idx}`); params.push(GATE_PASS_STATUS.HOD_APPROVED);
      idx++; conditions.push(`gp.pass_type = $${idx}`); params.push(GATE_PASS_TYPE.HOSTELLER);
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
 * 
 * Approval chain:
 *   pending_faculty  → (Faculty approves)  → mentor_approved
 *   mentor_approved  → (HOD approves)      → approved (day_scholar) OR hod_approved (hosteller)
 *   hod_approved     → (Warden approves)   → approved (hosteller)
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

    // === REJECTION ===
    if (action === 'reject') {
      let approverField, remarkField;
      if (gp.status === GATE_PASS_STATUS.PENDING_FACULTY) {
        approverField = 'faculty_approver_id';
        remarkField = 'faculty_remarks';
      } else if (gp.status === GATE_PASS_STATUS.MENTOR_APPROVED) {
        approverField = 'hod_approver_id';
        remarkField = 'hod_remarks';
      } else if (gp.status === GATE_PASS_STATUS.HOD_APPROVED) {
        approverField = 'warden_approver_id';
        remarkField = 'warden_remarks';
      } else {
        approverField = 'admin_approver_id';
        remarkField = 'admin_remarks';
      }

      await pool.query(
        `UPDATE gate_passes SET status = 'rejected', 
         ${approverField} = $1, ${remarkField} = $2
         WHERE id = $3`,
        [req.user.id, remarks, id]
      );

      return res.json({ success: true, message: 'Gate pass rejected.' });
    }

    // === APPROVAL LOGIC ===
    let newStatus, updateField, remarkField, timestampField;

    if (gp.status === GATE_PASS_STATUS.PENDING_FACULTY) {
      // Faculty → mentor_approved
      if (req.user.role !== ROLES.FACULTY && req.user.role !== ROLES.SUPER_ADMIN) {
        return res.status(403).json({ success: false, message: 'Only faculty can approve at this stage.' });
      }
      newStatus = GATE_PASS_STATUS.MENTOR_APPROVED;
      updateField = 'faculty_approver_id';
      remarkField = 'faculty_remarks';
      timestampField = 'faculty_approved_at';

    } else if (gp.status === GATE_PASS_STATUS.MENTOR_APPROVED) {
      // HOD → approved (day_scholar) OR hod_approved (hosteller)
      if (req.user.role !== ROLES.DEPARTMENT_ADMIN && req.user.role !== ROLES.SUPER_ADMIN) {
        return res.status(403).json({ success: false, message: 'Only HOD can approve at this stage.' });
      }
      if (gp.pass_type === GATE_PASS_TYPE.HOSTELLER) {
        newStatus = GATE_PASS_STATUS.HOD_APPROVED;
      } else {
        // Day scholar / Faculty / HOD → directly approved
        newStatus = GATE_PASS_STATUS.APPROVED;
      }
      updateField = 'hod_approver_id';
      remarkField = 'hod_remarks';
      timestampField = 'hod_approved_at';

    } else if (gp.status === GATE_PASS_STATUS.HOD_APPROVED) {
      // Warden/Deputy Warden → approved (hosteller only)
      if (req.user.role !== ROLES.WARDEN && req.user.role !== ROLES.DEPUTY_WARDEN && req.user.role !== ROLES.SUPER_ADMIN) {
        return res.status(403).json({ success: false, message: 'Only warden or deputy warden can approve at this stage.' });
      }
      // Warden must be assigned to this student
      if (req.user.role === ROLES.WARDEN && gp.warden_approver_id && gp.warden_approver_id !== req.user.id) {
        return res.status(403).json({ success: false, message: 'This student is not assigned to your hostel.' });
      }
      newStatus = GATE_PASS_STATUS.APPROVED;
      updateField = 'warden_approver_id';
      remarkField = 'warden_remarks';
      timestampField = 'warden_approved_at';

    } else {
      return res.status(400).json({ success: false, message: 'Gate pass cannot be approved in current state.' });
    }

    let qrToken = null;
    let qrDataUrl = null;

    // === QR GENERATION ON FINAL APPROVAL ===
    if (newStatus === GATE_PASS_STATUS.APPROVED) {
      const qrResult = await generateGatePassQR(gp);
      qrToken = qrResult.qrToken;
      qrDataUrl = qrResult.qrDataUrl;

      // QR Rule: Generated at max(out_time - 30 mins, approval_time)
      // Expiry: out_time + 1 hour
      const outDateTime = new Date(`${gp.leave_date}T${gp.out_time}`);
      const qrExpiry = new Date(outDateTime.getTime() + 60 * 60 * 1000);
      const now = new Date();
      const thirtyMinBefore = new Date(outDateTime.getTime() - 30 * 60 * 1000);
      const generationTime = now > thirtyMinBefore ? now : thirtyMinBefore;

      await pool.query(
        `UPDATE gate_passes SET status = $1, ${updateField} = $2, 
         ${remarkField} = $3, ${timestampField} = NOW(),
         qr_token = $4, qr_generated_at = $5, qr_expires_at = $6
         WHERE id = $7`,
        [newStatus, req.user.id, remarks, qrToken, generationTime, qrExpiry, id]
      );

      // Send email notification
      try {
        await sendGatePassEmail(
          gp.user_email, gp.user_name, gp.reason,
          `${gp.leave_date} ${gp.out_time}`,
          gp.return_time ? `${gp.return_date} ${gp.return_time}` : null
        );
      } catch (emailErr) {
        console.error('Email notification failed:', emailErr.message);
      }
    } else {
      await pool.query(
        `UPDATE gate_passes SET status = $1, ${updateField} = $2, 
         ${remarkField} = $3, ${timestampField} = NOW()
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
 * 
 * Security scan rules:
 *   - Early (before out_time - 30min): Return EARLY_WAIT, show details, do NOT modify DB
 *   - Within window (out_time - 30min → out_time + 1hr): Allow exit, status → exited
 *   - After window (after out_time + 1hr): Return expired, disable approval
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

      // Early Scan — show details but DO NOT modify DB
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

      // Expired Scan — disable approval
      if (scanStatus === 'EXPIRED' && gp.status !== GATE_PASS_STATUS.EXITED) {
        return res.json({
          success: true,
          status: 'EXPIRED',
          message: 'This gatepass has expired. Exit window has passed.',
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

      // Valid window — mark exit
      if (canExit && gp.status === GATE_PASS_STATUS.APPROVED) {
        await pool.query(
          `UPDATE gate_passes SET status = 'exited', exit_scanned_at = NOW(), exit_scanned_by = $1 WHERE id = $2`,
          [req.user.id, passId]
        );

        // Send parent SMS
        if (gp.father_phone || gp.mother_phone) {
          const parentPhone = gp.father_phone || gp.mother_phone;
          try {
            await sendParentSMS(
              parentPhone, gp.user_name, gp.department_name,
              new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
              gp.return_time || 'Not specified',
              gp.reason
            );
            await pool.query('UPDATE gate_passes SET parent_sms_sent = true WHERE id = $1', [passId]);
          } catch (smsErr) {
            console.error('Parent SMS failed:', smsErr.message);
          }
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

      // Return scan — mark as returned (stay as 'exited' since 'completed' is removed)
      // We record the return but the status stays 'exited' — the pass is done.
      await pool.query(
        `UPDATE gate_passes SET return_scanned_at = NOW(), return_scanned_by = $1 WHERE id = $2`,
        [req.user.id, passId]
      );

      return res.json({
        success: true,
        message: 'Return recorded. Student is back on campus.',
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
              wa.name as warden_approver_name,
              aa.name as admin_approver_name
       FROM gate_passes gp
       JOIN users u ON gp.user_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN users fa ON gp.faculty_approver_id = fa.id
       LEFT JOIN users ha ON gp.hod_approver_id = ha.id
       LEFT JOIN users wa ON gp.warden_approver_id = wa.id
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
