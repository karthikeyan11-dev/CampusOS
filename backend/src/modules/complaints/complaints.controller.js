const { pool } = require('../../config/database');
const { ROLES, COMPLAINT_STATUS, ESCALATION_SLA } = require('../../config/constants');
const { classifyComplaint } = require('../../services/ai.service');

/**
 * POST /complaints
 */
const createComplaint = async (req, res, next) => {
  try {
    const { title, description, isAnonymous, category, departmentId } = req.body;

    // AI Classification
    const aiResult = await classifyComplaint(title, description);

    // Calculate SLA deadline
    const priority = aiResult.priority || 'medium';
    const slaHours = ESCALATION_SLA[priority] || 48;
    const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    // Handle uploaded evidence files
    const evidenceUrls = req.files
      ? req.files.map((f) => `/uploads/complaints/${f.filename}`)
      : [];

    const result = await pool.query(
      `INSERT INTO complaints 
       (title, description, is_anonymous, submitted_by, category, ai_category, 
        priority, ai_priority, ai_sentiment, department_id, sla_deadline, evidence_urls)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        title, description, isAnonymous || false, req.user.id,
        category || aiResult.category, aiResult.category,
        priority, aiResult.priority, aiResult.sentiment,
        departmentId, slaDeadline, evidenceUrls,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully.',
      data: {
        ...result.rows[0],
        aiClassification: aiResult,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /complaints
 */
const getComplaints = async (req, res, next) => {
  try {
    const { status, category, priority, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let conditions = [];
    let params = [];
    let paramIdx = 0;

    // Role-based filtering
    if (req.user.role === ROLES.STUDENT) {
      paramIdx++;
      conditions.push(`c.submitted_by = $${paramIdx}`);
      params.push(req.user.id);
    } else if (req.user.role === ROLES.DEPARTMENT_ADMIN) {
      paramIdx++;
      conditions.push(`c.department_id = $${paramIdx}`);
      params.push(req.user.departmentId);
    } else if (req.user.role === ROLES.MAINTENANCE_STAFF) {
      conditions.push(`c.category IN ('infrastructure', 'hostel')`);
    }

    if (status) {
      paramIdx++;
      conditions.push(`c.status = $${paramIdx}`);
      params.push(status);
    }
    if (category) {
      paramIdx++;
      conditions.push(`c.category = $${paramIdx}`);
      params.push(category);
    }
    if (priority) {
      paramIdx++;
      conditions.push(`c.priority = $${paramIdx}`);
      params.push(priority);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT c.*,
        CASE WHEN c.is_anonymous THEN 'Anonymous' ELSE u.name END as submitted_by_name,
        d.name as department_name,
        au.name as assigned_to_name
      FROM complaints c
      JOIN users u ON c.submitted_by = u.id
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN users au ON c.assigned_to = au.id
      ${whereClause}
      ORDER BY 
        CASE c.priority 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END,
        c.created_at DESC
      LIMIT $${paramIdx + 1} OFFSET $${paramIdx + 2}
    `;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /complaints/:id
 */
const getComplaintById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT c.*,
        CASE WHEN c.is_anonymous AND c.submitted_by != $2 THEN 'Anonymous' ELSE u.name END as submitted_by_name,
        d.name as department_name
       FROM complaints c
       JOIN users u ON c.submitted_by = u.id
       LEFT JOIN departments d ON c.department_id = d.id
       WHERE c.id = $1`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    // Get comments
    const comments = await pool.query(
      `SELECT cc.*, u.name as user_name, u.role as user_role
       FROM complaint_comments cc
       JOIN users u ON cc.user_id = u.id
       WHERE cc.complaint_id = $1
       ORDER BY cc.created_at ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        comments: comments.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /complaints/:id/status
 */
const updateComplaintStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, resolutionNotes, assignTo } = req.body;

    let updateFields = ['status = $1', 'updated_at = NOW()'];
    let params = [status, id];
    let paramIdx = 2;

    if (resolutionNotes) {
      paramIdx++;
      updateFields.push(`resolution_notes = $${paramIdx}`);
      params.push(resolutionNotes);
    }

    if (assignTo) {
      paramIdx++;
      updateFields.push(`assigned_to = $${paramIdx}`);
      params.push(assignTo);
    }

    if (status === COMPLAINT_STATUS.RESOLVED) {
      updateFields.push('resolved_at = NOW()');
      // Handle resolution proof upload
      if (req.file) {
        paramIdx++;
        updateFields.push(`resolution_proof_url = $${paramIdx}`);
        params.push(`/uploads/complaints/${req.file.filename}`);
      }
    }
    if (status === COMPLAINT_STATUS.CLOSED) {
      updateFields.push('closed_at = NOW()');
    }
    if (status === COMPLAINT_STATUS.ESCALATED) {
      updateFields.push('escalated_at = NOW()');
      updateFields.push('escalation_level = escalation_level + 1');
    }

    const result = await pool.query(
      `UPDATE complaints SET ${updateFields.join(', ')} WHERE id = $2 RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    res.json({
      success: true,
      message: `Complaint status updated to ${status}.`,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /complaints/:id/comments
 */
const addComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { comment, isInternal } = req.body;

    const result = await pool.query(
      `INSERT INTO complaint_comments (complaint_id, user_id, comment, is_internal)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, req.user.id, comment, isInternal || false]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaintStatus,
  addComment,
};
