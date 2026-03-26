const { pool } = require('../../config/database');
const { ROLES, GATE_PASS_STATUS, GATE_PASS_TYPE } = require('../../config/constants');
const { verifyGatePassQR, generateGatePassQR } = require('../../services/qr.service');
const { getGatePassTimeWindow } = require('./gatepass.service');
const { sendParentSMS } = require('../../services/sms.service');
const notificationService = require('../../services/notification.service');
const redisService = require('../../services/redis.service');

// Database Retry with Exponential Backoff
const withDBRetry = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      // 40P01: deadlock, 40001: serialization_failure
      if (error.code === '40P01' || error.code === '40001') { 
        if (i === maxRetries - 1) throw error;
        const delay = Math.pow(2, i) * 100 + Math.random() * 50; // Exponential backoff + jitter
        console.warn(`♻️ DB Conflict: Retrying (${i+1}/${maxRetries}) after ${delay.toFixed(1)}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
};

// Observability Audit Logger (Console + DB)
const logTransitionToDB = async (passId, actorId, fromStatus, toStatus, remarks = '', actorName = 'System') => {
  try {
    await pool.query(
      `INSERT INTO gate_pass_logs (gate_pass_id, actor_id, state_from, state_to, remarks, actor_name)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [passId, actorId, fromStatus, toStatus, remarks, actorName]
    );
    console.log(`[AUDIT] GatePass ${passId}: ${fromStatus} -> ${toStatus} by ${actorName}`);
  } catch (error) {
    console.error('❌ Failed to log transition to DB:', error.message);
  }
};

// Idempotency: Redis-backed state machine for scan/action locks
const checkIdempotency = async (key, ttlMs = 2000) => {
  try {
    const client = await redisService.getRedisClient();
    const lockKey = `idempotency:gp:${key}`;
    const result = await client.set(lockKey, 'locked', { nx: true, px: ttlMs });
    return result === 'OK';
  } catch (err) {
    console.warn('[REDIS] Idempotency check failed:', err.message);
    return true; // Allow operation if Redis is unavailable
  }
};

// Cache Invalidator — now uses Redis
const invalidateScanCache = async (passId) => {
  try {
    const client = await redisService.getRedisClient();
    await client.del(`gatepass:scan:${passId}`);
    await client.del(`analytics:dashboard`); // Also invalidate global dashboard cache
  } catch (err) {
    console.warn('[REDIS] Cache invalidation failed:', err.message);
  }
};

// Centralized State Transition Engine
const ALLOWED_TRANSITIONS = {
  [GATE_PASS_STATUS.PENDING_FACULTY]: [GATE_PASS_STATUS.MENTOR_APPROVED, GATE_PASS_STATUS.REJECTED],
  [GATE_PASS_STATUS.MENTOR_APPROVED]: [GATE_PASS_STATUS.HOD_APPROVED, GATE_PASS_STATUS.APPROVED, GATE_PASS_STATUS.REJECTED],
  [GATE_PASS_STATUS.HOD_APPROVED]: [GATE_PASS_STATUS.WARDEN_APPROVED, GATE_PASS_STATUS.APPROVED, GATE_PASS_STATUS.REJECTED],
  [GATE_PASS_STATUS.WARDEN_APPROVED]: [GATE_PASS_STATUS.APPROVED, GATE_PASS_STATUS.REJECTED],
  [GATE_PASS_STATUS.APPROVED]: [GATE_PASS_STATUS.OPENED, GATE_PASS_STATUS.EXPIRED],
  [GATE_PASS_STATUS.OPENED]: [GATE_PASS_STATUS.YET_TO_BE_CLOSED, GATE_PASS_STATUS.CLOSED],
  [GATE_PASS_STATUS.YET_TO_BE_CLOSED]: [GATE_PASS_STATUS.CLOSED, GATE_PASS_STATUS.EXPIRED],
  'waiting': ['hod_approved', 'approved', 'rejected'],
  'hod_approved': ['approved', 'rejected']
};

const validateTransition = (current, next) => {
  const allowed = ALLOWED_TRANSITIONS[current] || [];
  return allowed.includes(next);
};

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
    let initialStatus = GATE_PASS_STATUS.PENDING_FACULTY;

    // Determine pass type based on residence
    let wardenId = null;
    let mentorId = null;
    let hostelId = null;
    if (req.user.role === ROLES.STUDENT) {
      const studentResult = await pool.query(
        'SELECT residence_type, warden_id, mentor_id, hostel_id FROM students WHERE user_id = $1',
        [req.user.id]
      );
      if (studentResult.rows.length > 0) {
        if (studentResult.rows[0].residence_type === 'hosteller') {
          passType = GATE_PASS_TYPE.HOSTELLER;
          wardenId = studentResult.rows[0].warden_id;
          hostelId = studentResult.rows[0].hostel_id;
        }
        mentorId = studentResult.rows[0].mentor_id;
      }
    } else if (req.user.role === ROLES.FACULTY) {
      passType = GATE_PASS_TYPE.FACULTY;
      initialStatus = 'waiting'; // Forward to HOD
    } else if (req.user.role === ROLES.DEPARTMENT_ADMIN) {
      passType = GATE_PASS_TYPE.HOD;
      initialStatus = 'waiting'; // Forward to Admin
    } else if (req.user.role === ROLES.WARDEN || req.user.role === ROLES.DEPUTY_WARDEN) {
      passType = 'warden';
      initialStatus = 'waiting'; // Forward to Admin
    }

    const validUntil = returnDate && returnTime 
      ? `${leaveDate} ${returnTime}`
      : `${leaveDate} ${outTime}`; // Standard window for day pass

    const result = await pool.query(
      `INSERT INTO gate_passes (user_id, pass_type, status, reason, leave_date, out_time, return_date, return_time, warden_approver_id, faculty_approver_id, hostel_id, user_role, valid_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [req.user.id, passType, initialStatus, reason, leaveDate, outTime, returnDate, returnTime, wardenId, mentorId, hostelId, req.user.role, validUntil]
    );

    await logTransitionToDB(result.rows[0].id, req.user.id, 'none', initialStatus, 'Initial request', req.user.name);

    return res.status(201).json({
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
    const { status, page = 1, limit = 50, passType } = req.query;
    const offset = (page - 1) * limit;

    let conditions = [];
    let params = [];
    let idx = 0;

    // Role-based visibility
    if (req.user.role === ROLES.STUDENT) {
      idx++; conditions.push(`gp.user_id = $${idx}`); params.push(req.user.id);
    } else if (req.user.role === ROLES.FACULTY) {
      // Faculty sees: 1. Their own passes, 2. Student passes they need to approve
      idx++; 
      conditions.push(`(gp.user_id = $${idx} OR (gp.status = 'pending_faculty' AND (gp.faculty_approver_id = $${idx} OR gp.faculty_approver_id IS NULL)))`);
      params.push(req.user.id);
    } else if (req.user.role === ROLES.DEPARTMENT_ADMIN) {
      // HOD sees passes from their department that need HOD approval
      idx++; 
      conditions.push(`(gp.user_id = $${idx} OR u.department_id = $${idx})`);
      params.push(req.user.departmentId);
    } else if (req.user.role === ROLES.WARDEN || req.user.role === ROLES.DEPUTY_WARDEN) {
      idx++; 
      conditions.push(`(gp.user_id = $${idx} OR (gp.status = 'hod_approved' AND gp.pass_type = 'hosteller'))`);
      params.push(req.user.id);
    } else if (req.user.role === ROLES.SECURITY_STAFF) {
       conditions.push(`gp.status IN ('approved', 'opened', 'yet_to_be_closed')`);
    }

    if (passType) {
      idx++; conditions.push(`gp.pass_type = $${idx}`); params.push(passType);
    }

    if (status && req.user.role === ROLES.SUPER_ADMIN) {
      idx++; conditions.push(`gp.status = $${idx}`); params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT gp.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
             d.name as department_name, d.code as department_code,
             s.roll_number, s.residence_type,
             s.father_name, s.father_phone, s.mother_name, s.mother_phone,
             fa.name as faculty_approver_name,
             ha.name as hod_approver_name,
             wa.name as warden_approver_name,
             aa.name as admin_approver_name,
             es.name as exit_scanned_by_name,
             rs.name as return_scanned_by_name
      FROM gate_passes gp
      JOIN users u ON gp.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN students s ON s.user_id = u.id
      LEFT JOIN users fa ON gp.faculty_approver_id = fa.id
      LEFT JOIN users ha ON gp.hod_approver_id = ha.id
      LEFT JOIN users wa ON gp.warden_approver_id = wa.id
      LEFT JOIN users aa ON gp.admin_approver_id = aa.id
      LEFT JOIN users es ON gp.exit_scanned_by = es.id
      LEFT JOIN users rs ON gp.return_scanned_by = rs.id
      ${whereClause}
      ORDER BY gp.created_at DESC
      LIMIT $${idx + 1} OFFSET $${idx + 2}
    `;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    // Snapshot Resolution: Prefer immutable snapshots over live joins
    const processedRows = result.rows.map(row => {
      // Prioritize captured names (Snapshots)
      row.faculty_approver_name = row.faculty_name || row.faculty_approver_name;
      row.hod_approver_name = row.hod_name || row.hod_approver_name;
      row.warden_approver_name = row.warden_name || row.warden_approver_name;
      row.admin_approver_name = row.admin_name || row.admin_approver_name;

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
      } else if (gp.status === 'waiting') {
        // Staff at initial nodal stage
        if (gp.pass_type === GATE_PASS_TYPE.FACULTY) {
          approverField = 'hod_approver_id';
          remarkField = 'hod_remarks';
        } else {
          approverField = 'admin_approver_id';
          remarkField = 'admin_remarks';
        }
      } else if (gp.status === GATE_PASS_STATUS.HOD_APPROVED) {
        // Differentiation: Warden stage for Hostellers, Admin stage for Faculty/Staff
        if (gp.pass_type === GATE_PASS_TYPE.HOSTELLER) {
          approverField = 'warden_approver_id';
          remarkField = 'warden_remarks';
        } else {
          approverField = 'admin_approver_id';
          remarkField = 'admin_remarks';
        }
      } else {
        approverField = 'admin_approver_id';
        remarkField = 'admin_remarks';
      }

      const result = await pool.query(
        `UPDATE gate_passes SET status = 'rejected', 
         ${approverField} = $1, ${remarkField} = $2
         WHERE id = $3 RETURNING *`,
        [req.user.id, remarks, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Pass not found.' });
      
      const gpRec = result.rows[0];
      await logTransitionToDB(id, req.user.id, gp.status, GATE_PASS_STATUS.REJECTED, remarks, req.user.name);
      
      // Auto-Notify Student
      await notificationService.notifyGatePassUpdate({ ...gpRec, status: GATE_PASS_STATUS.REJECTED }, req.user.name);

      return res.json({ success: true, message: 'Gate pass rejected and student notified.' });
    }

    // === APPROVAL LOGIC ===
    let newStatus, updateField, remarkField, timestampField;

    if (gp.status === GATE_PASS_STATUS.PENDING_FACULTY) {
      if (req.user.role !== ROLES.FACULTY && req.user.role !== ROLES.SUPER_ADMIN) {
        return res.status(403).json({ success: false, message: 'Only faculty can approve at this stage.' });
      }
      newStatus = GATE_PASS_STATUS.MENTOR_APPROVED;
      updateField = 'faculty_approver_id';
      remarkField = 'faculty_remarks';
      timestampField = 'faculty_approved_at';
    } else if (gp.status === GATE_PASS_STATUS.MENTOR_APPROVED) {
      if (req.user.role !== ROLES.DEPARTMENT_ADMIN && req.user.role !== ROLES.SUPER_ADMIN) {
        return res.status(403).json({ success: false, message: 'Only HOD can approve at this stage.' });
      }
      // Branching: Hostellers and Faculty go to Admin/Warden pool (HOD_APPROVED)
      // Day scholars go directly to APPROVED
      newStatus = (gp.pass_type === GATE_PASS_TYPE.HOSTELLER || gp.pass_type === GATE_PASS_TYPE.FACULTY) 
                  ? GATE_PASS_STATUS.HOD_APPROVED 
                  : GATE_PASS_STATUS.APPROVED;

      updateField = 'hod_approver_id';
      remarkField = 'hod_remarks';
      timestampField = 'hod_approved_at';
    } else if (gp.status === GATE_PASS_STATUS.HOD_APPROVED) {
      if (gp.pass_type === GATE_PASS_TYPE.HOSTELLER) {
          if (req.user.role !== ROLES.WARDEN && req.user.role !== ROLES.DEPUTY_WARDEN && req.user.role !== ROLES.SUPER_ADMIN) {
              return res.status(403).json({ success: false, message: 'Only warden can approve for hostellers.' });
          }
      } else {
          // Faculty, HOD, Warden mobility requires Admin Node approval
          if (req.user.role !== ROLES.SUPER_ADMIN) {
              return res.status(403).json({ success: false, message: 'This staff pass requires Super Admin clearance.' });
          }
      }
      
      // Strict Warden-Hostel check (Task 5.4)
      if (req.user.role === ROLES.WARDEN && gp.hostel_id && gp.pass_type === GATE_PASS_TYPE.HOSTELLER) {
        const hostelRes = await pool.query('SELECT id FROM hostels WHERE warden_id = $1 AND id = $2', [req.user.id, gp.hostel_id]);
        if (hostelRes.rows.length === 0) {
          return res.status(403).json({ success: false, message: 'You can only approve students from your assigned hostel.' });
        }
      }

      newStatus = GATE_PASS_STATUS.APPROVED;
      if (gp.pass_type === GATE_PASS_TYPE.HOSTELLER) {
        updateField = 'warden_approver_id';
        remarkField = 'warden_remarks';
        timestampField = 'warden_approved_at';
      } else {
        updateField = 'admin_approver_id';
        remarkField = 'admin_remarks';
        timestampField = 'admin_approved_at';
      }
    } else if (gp.status === 'waiting') {
      if (gp.pass_type === GATE_PASS_TYPE.FACULTY) {
        if (req.user.role !== ROLES.DEPARTMENT_ADMIN && req.user.role !== ROLES.SUPER_ADMIN) {
          return res.status(403).json({ success: false, message: 'Only HOD or Admin can approve staff passes.' });
        }
        newStatus = GATE_PASS_STATUS.HOD_APPROVED; // Forward to Admin
        updateField = 'hod_approver_id';
        remarkField = 'hod_remarks';
        timestampField = 'hod_approved_at';
      } else if (gp.pass_type === GATE_PASS_TYPE.HOD || gp.pass_type === 'warden') {
        if (req.user.role !== ROLES.SUPER_ADMIN) {
          return res.status(403).json({ success: false, message: 'Admin approval required for Management mobility.' });
        }
        newStatus = GATE_PASS_STATUS.APPROVED;
        updateField = 'admin_approver_id';
        remarkField = 'admin_remarks';
        timestampField = 'admin_approved_at';
      }
    }

    // Capture Snapshot Name for the current approver
    let nameToSnapshot = req.user.name || 'Staff-In-Charge';
    let nameUpdateField = null;
    if (updateField === 'faculty_approver_id') nameUpdateField = 'faculty_name';
    else if (updateField === 'hod_approver_id') nameUpdateField = 'hod_name';
    else if (updateField === 'warden_approver_id') nameUpdateField = 'warden_name';
    else if (updateField === 'admin_approver_id') nameUpdateField = 'admin_name';

    // Validation: Exact role and state match
    if (!newStatus || !validateTransition(gp.status, newStatus)) {
      return res.status(400).json({ 
        success: false, 
        error_code: 'INVALID_TRANSITION',
        message: `Cannot move from ${gp.status} to ${newStatus}` 
      });
    }

    let qrToken = null;
    let qrDataUrl = null;

    // === QR GENERATION ON FINAL APPROVAL ===
    if (newStatus === GATE_PASS_STATUS.APPROVED) {
      const qrResult = await generateGatePassQR(gp);
      qrToken = qrResult.qrToken;
      qrDataUrl = qrResult.qrDataUrl;

      const outDateTime = new Date(`${gp.leave_date}T${gp.out_time}`);
      const qrExpiry = new Date(outDateTime.getTime() + 60 * 60 * 1000);
      const now = new Date();
      const thirtyMinBefore = new Date(outDateTime.getTime() - 30 * 60 * 1000);
      const generationTime = now > thirtyMinBefore ? now : thirtyMinBefore;

      // Snapshot Model (Task 5.3): Fetch Warden Details for Snapshot IF Hosteller
      let snapWardenName = null;
      let snapWardenMobile = null;
      let snapWardenId = null;

      if (gp.residence_type === 'hosteller') {
        const wardenRes = await pool.query('SELECT name, phone FROM users WHERE id = $1', [req.user.id]);
        if (wardenRes.rows[0]) {
          snapWardenName = wardenRes.rows[0].name;
          snapWardenMobile = wardenRes.rows[0].phone;
          snapWardenId = req.user.id;
        }
      }

      // ATOMIC CONDITIONAL UPDATE with SNAPSHOT
      const updateResult = await pool.query(
        `UPDATE gate_passes SET status = $1, ${updateField} = $2, 
         ${remarkField} = $3, ${timestampField} = NOW(),
         qr_token = $4, qr_generated_at = $5, qr_expires_at = $6,
         warden_name = COALESCE($7, warden_name), 
         warden_mobile = $8, warden_snapshot_id = $9,
         ${nameUpdateField} = $10
         WHERE id = $11 AND status = $12 RETURNING id`,
        [newStatus, req.user.id, remarks, qrToken, generationTime, qrExpiry, 
         snapWardenName || nameToSnapshot, snapWardenMobile, snapWardenId, nameToSnapshot, id, gp.status]
      );

      if (updateResult.rows.length > 0) {
        await logTransitionToDB(id, req.user.id, gp.status, newStatus, remarks, req.user.name);
        
        // Universal notification (App + Email)
        await notificationService.notifyGatePassUpdate({ ...gp, status: newStatus }, req.user.name);
      } else {
        return res.status(409).json({ success: false, message: 'Status already updated.' });
      }
    } else {
      // INTERMEDIATE APPROVAL or NON-FINAL
      const updateResult = await pool.query(
        `UPDATE gate_passes SET status = $1, ${updateField} = $2, 
         ${remarkField} = $3, ${timestampField} = NOW(),
         ${nameUpdateField} = $4
         WHERE id = $5 AND status = $6 RETURNING id`,
        [newStatus, req.user.id, remarks, nameToSnapshot, id, gp.status]
      );

      if (updateResult.rows.length > 0) {
        await logTransitionToDB(id, req.user.id, gp.status, newStatus, remarks, req.user.name);
      } else {
        return res.status(409).json({ success: false, message: 'Status already updated.' });
      }
    }

    res.json({
      success: true,
      message: newStatus === GATE_PASS_STATUS.APPROVED
        ? 'Gate pass approved.'
        : 'Gate pass forwarded.',
      data: { status: newStatus, qrDataUrl },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /gatepass/scan
 * 
 * Security scan ONLY fetches and displays data.
 * It does NOT change state.
 */
const scanGatePass = async (req, res, next) => {
  try {
    const { qrToken } = req.body;

    // Distributed Cache hit? (Task 1 Phase 2)
    const verification = verifyGatePassQR(qrToken);
    if (!verification.valid) {
      return res.status(400).json({ success: false, message: verification.error });
    }
    const { passId } = verification.data;

    // ⚡ IDEMPOTENCY: Check if this token was scanned in the last 2 seconds
    const isNewScan = await checkIdempotency(qrToken, 2000);
    if (!isNewScan) {
      console.log(`[REDIS] DUPLICATE: Scan ignored for token: ${qrToken.substring(0, 10)}...`);
    }

    const cached = await redisService.getCachedScan(passId);
    if (cached) {
      console.log(`[REDIS] HIT: Scan: ${passId}`);
      return res.json({ success: true, data: cached, _cached: true });
    }

    console.log(`[REDIS] MISS: Scan: ${passId}. Syncing from PostgreSQL...`);

    // TASK 2 (Phase 1): Stampede Protection
    // If not in cache, acquire a short-lived lock to repopulate
    const acquired = await redisService.getStampedeLock(passId);
    if (!acquired) {
      // Small wait and retry once for the cache
      await new Promise(r => setTimeout(r, 100));
      const retryCached = await redisService.getCachedScan(passId);
      if (retryCached) return res.json({ success: true, data: retryCached, _cached: true });
    }

    // Fetch gate pass with full details: Student, Academic Contacts, Hostel Details
    const gpResult = await pool.query(
      `SELECT gp.*, 
              u.name as user_name, u.email as user_email, u.phone as student_phone, u.avatar_url,
              d.name as department_name, d.code as department_code,
              s.roll_number, s.residence_type, s.father_phone, s.mother_phone,
              m.name as mentor_name, m.phone as mentor_phone,
              hod.name as hod_name, hod.phone as hod_phone,
              h.name as hostel_name,
              w.name as warden_name, w.phone as warden_phone, w.id as warden_id
       FROM gate_passes gp
       JOIN users u ON gp.user_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN users m ON s.mentor_id = m.id
       LEFT JOIN users hod ON d.hod_id = hod.id
       LEFT JOIN hostels h ON s.hostel_id = h.id
       LEFT JOIN users w ON h.warden_id = w.id
       WHERE gp.id = $1`,
      [passId]
    );

    if (gpResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Gate pass not found.' });
    }

    const gp = gpResult.rows[0];
    const { scanStatus, validStartTime, canExit } = getGatePassTimeWindow(gp);

    // Prepare response with detailed info for the Security Dashboard
    const responseData = {
      success: true,
      data: {
        pass: {
          id: gp.id,
          type: gp.pass_type,
          status: gp.status,
          reason: gp.reason,
          leaveDate: gp.leave_date,
          outTime: gp.out_time,
          returnDate: gp.return_date,
          returnTime: gp.return_time,
          expiryTime: gp.qr_expires_at,
          scanStatus,
          canOpen: canExit && gp.status === GATE_PASS_STATUS.APPROVED,
          isHosteller: gp.residence_type === 'hosteller'
        },
        student: {
          name: gp.user_name,
          rollNumber: gp.roll_number,
          department: gp.department_name,
          phone: gp.student_phone,
          residenceType: gp.residence_type
        },
        contacts: {
          mentor: { name: gp.mentor_name, phone: gp.mentor_phone },
          hod: { name: gp.hod_name, phone: gp.hod_phone },
          parents: { father: gp.father_phone, mother: gp.mother_phone }
        },
        hostel: gp.residence_type === 'hosteller' ? {
          name: gp.hostel_name,
          wardenName: gp.warden_name,
          wardenPhone: gp.warden_phone,
          wardenId: gp.warden_id
        } : null
      }
    };

    // Store in Redis (Task 1 Phase 2)
    await redisService.cacheScan(passId, responseData.data, 3);

    res.json(responseData);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /gatepass/open
 * 
 * Manual action by Security Staff to record exit.
 * Transitions: approved → opened → (hosteller) yet_to_be_closed
 */
const openGatePass = async (req, res, next) => {
  return withDBRetry(async () => {
    const client = await pool.connect();
    try {
      const { passId } = req.body;

      // ⚡ REDIS IDEMPOTENCY CHECK
      const isActionSafe = await checkIdempotency(`action:open:${passId}`, 5000);
      if (!isActionSafe) {
        return res.json({ success: true, message: 'Process already in flight. Please wait.' });
      }

      await client.query('BEGIN');

      // 1. Transaction-safe check & lock
    const gpResult = await client.query(
      `SELECT gp.*, s.residence_type, u.name as user_name, d.name as department_name, 
              s.father_phone, s.mother_phone
       FROM gate_passes gp
       JOIN users u ON gp.user_id = u.id
       JOIN students s ON s.user_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE gp.id = $1 FOR UPDATE`,
      [passId]
    );

    if (gpResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error_code: 'NOT_FOUND', message: 'Gate pass not found.' });
    }

    const gp = gpResult.rows[0];

    // 2. Strict state and time window check
    if (gp.status !== GATE_PASS_STATUS.APPROVED) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        error_code: 'ALREADY_PROCESSED',
        message: `Pass is already ${gp.status}.` 
      });
    }

    const { canExit, scanStatus } = getGatePassTimeWindow(gp);
    if (!canExit) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Exit window is ${scanStatus}.` });
    }

    // 3. IDEMPOTENT LOGGING (Physical Layer)
    try {
      await client.query(
        `INSERT INTO gate_pass_actions (gate_pass_id, user_id, action_type) VALUES ($1, $2, 'open')`,
        [passId, req.user.id]
      );
    } catch (e) {
      if (e.code === '23505') { // Unique violation
        await client.query('ROLLBACK');
        return res.json({ success: true, message: 'Exit already recorded.' });
      }
      throw e;
    }

    // 4. Atomic Transition
    const nextStatus = gp.residence_type === 'hosteller' ? GATE_PASS_STATUS.YET_TO_BE_CLOSED : GATE_PASS_STATUS.OPENED;
    
      await client.query(
        `UPDATE gate_passes SET status = $1, exit_scanned_at = NOW(), exit_scanned_by = $2 
         WHERE id = $3 AND status = 'approved'`,
        [nextStatus, req.user.id, passId]
      );

      // 3. Side-Effect Idempotency: Incrementally recorded in gate_pass_actions
      // If we reach here, it means we committed or are about to.
      // SMS is triggered only if this specific 'open' action was recorded successfully.
      
      await client.query('COMMIT');
      await invalidateScanCache(passId); // Clear Redis on action
      await logTransitionToDB(passId, req.user.id, gp.status, nextStatus, 'Gate Opened', req.user.name);

    // parent SMS (Async) - Idempotent because we check action entry previously
    if (gp.father_phone || gp.mother_phone) {
      const parentPhone = gp.father_phone || gp.mother_phone;
      sendParentSMS(
        parentPhone, gp.user_name, gp.department_name,
        new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        gp.return_time || 'Not specified',
        gp.reason
      ).catch(err => console.error('SMS Alert Failed:', err.message));
    }

    res.json({ success: true, message: 'Exit recorded successfully.', data: { new_status: nextStatus } });

  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});
};

/**
 * POST /gatepass/close
 * 
 * Manual action by Security Staff to record return.
 * Transitions: (opened | yet_to_be_closed) → closed
 */
const closeGatePass = async (req, res, next) => {
  return withDBRetry(async () => {
    const client = await pool.connect();
    try {
      const { passId } = req.body;

      // ⚡ REDIS IDEMPOTENCY CHECK
      const isActionSafe = await checkIdempotency(`action:close:${passId}`, 5000);
      if (!isActionSafe) {
        return res.json({ success: true, message: 'Process already in flight. Please wait.' });
      }

      await client.query('BEGIN');

    const gpResult = await client.query(
      `SELECT * FROM gate_passes WHERE id = $1 FOR UPDATE`,
      [passId]
    );

    if (gpResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Gate pass not found.' });
    }

    const gp = gpResult.rows[0];

    if (![GATE_PASS_STATUS.OPENED, GATE_PASS_STATUS.YET_TO_BE_CLOSED].includes(gp.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Pass is ${gp.status}. Cannot close.` });
    }

    // Idempotent Action Log
    try {
      await client.query(
        `INSERT INTO gate_pass_actions (gate_pass_id, user_id, action_type) VALUES ($1, $2, 'close')`,
        [passId, req.user.id]
      );
    } catch (e) {
      if (e.code === '23505') {
        await client.query('ROLLBACK');
        return res.json({ success: true, message: 'Return already recorded.' });
      }
      throw e;
    }

    // Atomic Update
      await client.query(
        `UPDATE gate_passes SET status = 'closed', return_scanned_at = NOW(), return_scanned_by = $1 
         WHERE id = $2 AND status IN ('opened', 'yet_to_be_closed')`,
        [req.user.id, passId]
      );

       await client.query('COMMIT');
       await invalidateScanCache(passId); // TASK 2: Clear Redis on action
       await logTransitionToDB(passId, req.user.id, gp.status, 'closed', 'Gate Closed');
     res.json({ success: true, message: 'Return recorded. Gate pass closed.', data: { new_status: 'closed' } });

  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});
};


/**
 * GET /gatepass/:id
 */
const getGatePassById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT gp.*, u.name as user_name, u.email as user_email, u.department_id,
              d.name as department_name, d.code as department_code,
              s.roll_number, s.residence_type,
              fa.name as faculty_approver_name,
              ha.name as hod_approver_name,
              wa.name as warden_approver_name,
              aa.name as admin_approver_name,
              es.name as exit_scanned_by_name,
              rs.name as return_scanned_by_name
       FROM gate_passes gp
       JOIN users u ON gp.user_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN users fa ON gp.faculty_approver_id = fa.id
       LEFT JOIN users ha ON gp.hod_approver_id = ha.id
       LEFT JOIN users wa ON gp.warden_approver_id = wa.id
       LEFT JOIN users aa ON gp.admin_approver_id = aa.id
       LEFT JOIN users es ON gp.exit_scanned_by = es.id
       LEFT JOIN users rs ON gp.return_scanned_by = rs.id
       WHERE gp.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Gate pass not found.' });
    }

    const gp = result.rows[0];

    // RBAC: Students can ONLY see their own passes.
    if (req.user.role === ROLES.STUDENT && gp.user_id !== req.user.id) {
       return res.status(403).json({ success: false, message: 'Access denied: You can only view your own gate passes.' });
    }

    const { canShowQR } = getGatePassTimeWindow(gp);

    if (req.user.role === ROLES.STUDENT && !canShowQR) {
      gp.qr_token = null; // Redact token
    }

    // Generate Timeline from DB logs
    const logsRes = await pool.query(
      `SELECT l.* FROM gate_pass_logs l 
       WHERE l.gate_pass_id = $1 
       ORDER BY l.created_at ASC`,
      [id]
    );

    const timeline = logsRes.rows.map(l => ({
      action: l.remarks || l.state_to?.replace(/_/g, ' '),
      actor: l.actor_name, // Snapshot name from logs
      timestamp: l.created_at,
      remarks: l.remarks
    }));
    
    gp.timeline = timeline;

    // Snapshot Resolution: Prefer immutable snapshots over live joins
    gp.faculty_approver_name = gp.faculty_name || gp.faculty_approver_name;
    gp.hod_approver_name = gp.hod_name || gp.hod_approver_name;
    gp.warden_approver_name = gp.warden_name || gp.warden_approver_name;
    gp.admin_approver_name = gp.admin_name || gp.admin_approver_name;

    res.json({ success: true, data: gp });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /gatepass/faculty
 * Request Faculty/Staff Gatepass
 */
const requestFacultyGatePass = async (req, res, next) => {
  try {
    const { reason, leaveDate, outTime, returnDate, returnTime } = req.body;
    
    // Faculty requests start at 'waiting'
    const initialStatus = 'waiting';
    const passType = GATE_PASS_TYPE.FACULTY;

    const validUntil = returnDate && returnTime 
      ? `${leaveDate} ${returnTime}`
      : `${leaveDate} ${outTime}`; // Self-expiring after outTime if return not specified

    const result = await pool.query(
      `INSERT INTO gate_passes (user_id, pass_type, status, reason, leave_date, out_time, return_date, return_time, user_role, valid_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [req.user.id, passType, initialStatus, reason, leaveDate, outTime, returnDate, returnTime, req.user.role, validUntil]
    );

    await logTransitionToDB(result.rows[0].id, req.user.id, 'none', initialStatus, 'Faculty gatepass requested', req.user.name);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /gatepass/faculty/:id/approve
 * Multi-branch Approval for Faculty
 */
const approveFacultyGatePass = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, remarks } = req.body;
    const actorId = req.user.id;
    const actorRole = req.user.role;

    const gpResult = await pool.query('SELECT * FROM gate_passes WHERE id = $1', [id]);
    if (gpResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Pass not found' });
    
    const gp = gpResult.rows[0];
    let nextStatus = gp.status;

    // Check branch: Academic vs Non-Academic
    const userResult = await pool.query('SELECT department_id FROM faculty WHERE user_id = $1', [gp.user_id]);
    const isAcademic = userResult.rows[0]?.department_id !== null;

    if (action === 'approve') {
      if (isAcademic) {
        // Workflow A: waiting -> hod_approved -> approved
        if (gp.status === 'waiting') {
          if (actorRole !== ROLES.DEPARTMENT_ADMIN && actorRole !== ROLES.SUPER_ADMIN) {
            return res.status(403).json({ success: false, message: 'Only HOD or Admin can approve this step' });
          }
          nextStatus = actorRole === ROLES.SUPER_ADMIN ? 'approved' : 'hod_approved';
        } else if (gp.status === 'hod_approved') {
          if (actorRole !== ROLES.SUPER_ADMIN) return res.status(403).json({ success: false, message: 'Only Admin can finalize this pass' });
          nextStatus = 'approved';
        }
      } else {
        // Workflow B: waiting -> approved
        if (actorRole !== ROLES.SUPER_ADMIN) return res.status(403).json({ success: false, message: 'Only Admin can approve non-academic staff' });
        nextStatus = 'approved';
      }
    } else {
      nextStatus = 'rejected';
    }

    if (nextStatus === gp.status) return res.status(400).json({ success: false, message: 'Invalid state transition' });

    // === QR GENERATION ON FINAL FACULTY APPROVAL ===
    let qrToken = null;
    let qrDataUrl = null;
    let updateQuery;
    let params;

    if (nextStatus === 'approved') {
      const qrResult = await generateGatePassQR(gp);
      qrToken = qrResult.qrToken;
      qrDataUrl = qrResult.qrDataUrl;

      const outDateTime = new Date(`${gp.leave_date}T${gp.out_time}`);
      const qrExpiry = new Date(outDateTime.getTime() + 60 * 60 * 1000); 
      const now = new Date();
      const thirtyMinBefore = new Date(outDateTime.getTime() - 30 * 60 * 1000);
      const generationTime = now > thirtyMinBefore ? now : thirtyMinBefore;

      if (action === 'approve') {
        const query = `UPDATE gate_passes SET status = $1, 
                       hod_approver_id = CASE WHEN $1 = 'hod_approved' THEN $2 ELSE hod_approver_id END,
                       hod_name = CASE WHEN $1 = 'hod_approved' THEN $7 ELSE hod_name END,
                       admin_approver_id = CASE WHEN $1 = 'approved' THEN $2 ELSE admin_approver_id END,
                       admin_name = CASE WHEN $1 = 'approved' THEN $7 ELSE admin_name END,
                       hod_approved_at = CASE WHEN $1 = 'hod_approved' THEN NOW() ELSE hod_approved_at END,
                       admin_approved_at = CASE WHEN $1 = 'approved' THEN NOW() ELSE admin_approved_at END,
                       hod_remarks = CASE WHEN $1 = 'hod_approved' THEN $3 ELSE hod_remarks END,
                       admin_remarks = CASE WHEN $1 = 'approved' THEN $3 ELSE admin_remarks END,
                       qr_token = $5, qr_generated_at = $6, qr_expires_at = $8
                WHERE id = $4 RETURNING *`;
        const result = await pool.query(query, [nextStatus, actorId, remarks, id, qrToken, generationTime, req.user.name, qrExpiry]);
        const updated = result.rows[0];
        await logTransitionToDB(id, actorId, gp.status, nextStatus, remarks, req.user.name);
        return res.json({ success: true, data: { ...updated, qrDataUrl } });
      }
    } else {
      if (action === 'approve') {
        const query = `UPDATE gate_passes SET status = $1, 
                       hod_approver_id = CASE WHEN $1 = 'hod_approved' THEN $2 ELSE hod_approver_id END,
                       hod_name = CASE WHEN $1 = 'hod_approved' THEN $5 ELSE hod_name END,
                       admin_approver_id = CASE WHEN $1 = 'approved' THEN $2 ELSE admin_approver_id END,
                       admin_name = CASE WHEN $1 = 'approved' THEN $5 ELSE admin_name END,
                       hod_approved_at = CASE WHEN $1 = 'hod_approved' THEN NOW() ELSE hod_approved_at END,
                       admin_approved_at = CASE WHEN $1 = 'approved' THEN NOW() ELSE admin_approved_at END,
                       hod_remarks = CASE WHEN $1 = 'hod_approved' THEN $3 ELSE hod_remarks END,
                       admin_remarks = CASE WHEN $1 = 'approved' THEN $3 ELSE admin_remarks END
                WHERE id = $4 RETURNING *`;
        const result = await pool.query(query, [nextStatus, actorId, remarks, id, req.user.name]);
        const updated = result.rows[0];
        await logTransitionToDB(id, actorId, gp.status, nextStatus, remarks, req.user.name);
        return res.json({ success: true, data: updated });
      } else {
        const result = await pool.query(
          `UPDATE gate_passes SET status = $1, admin_remarks = $2 WHERE id = $3 RETURNING *`,
          [nextStatus, remarks, id]
        );
        await logTransitionToDB(id, actorId, gp.status, nextStatus, remarks, req.user.name);
        return res.json({ success: true, data: result.rows[0] });
      }
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requestGatePass,
  getGatePasses,
  getGatePassById,
  approveGatePass,
  scanGatePass,
  openGatePass,
  closeGatePass,
  requestFacultyGatePass,
  approveFacultyGatePass
};
