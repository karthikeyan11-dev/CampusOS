const { pool } = require('../../config/database');
const { ROLES, NOTIFICATION_STATUS } = require('../../config/constants');
const { summarizeNotification } = require('../../services/ai.service');
const { sendNotificationDelivery } = require('../../services/notification_delivery.service');

/**
 * POST /notifications
 */
const createNotification = async (req, res, next) => {
  try {
    const {
      title, content, type, targetType, targetDepartmentId,
      targetBatch, targetClassId, expiresAt, isPinned,
    } = req.body;

    // Determine initial status based on role
    let status = NOTIFICATION_STATUS.PENDING_APPROVAL;
    if (req.user.role === ROLES.SUPER_ADMIN || req.user.role === ROLES.DEPARTMENT_ADMIN) {
      status = NOTIFICATION_STATUS.PUBLISHED;
    }

    // AI Summarize
    const aiSummary = await summarizeNotification(content);

    // Handle uploaded attachments
    const attachmentUrls = req.files
      ? req.files.map((f) => `/uploads/notifications/${f.filename}`)
      : [];

    // Pre-compute publish fields to avoid PostgreSQL parameter type conflicts
    const isPublished = status === NOTIFICATION_STATUS.PUBLISHED;
    const publishedAt = isPublished ? new Date() : null;
    const approvedBy = isPublished ? req.user.id : null;
    const approvedAt = isPublished ? new Date() : null;

    const result = await pool.query(
      `INSERT INTO notifications 
       (title, content, ai_summary, type, status, target_type, target_department_id,
        target_batch, target_class_id, posted_by, expires_at, is_pinned,
        attachment_urls, published_at, approved_by, approved_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [title, content, aiSummary, type || 'academic', status,
       targetType || 'all', targetDepartmentId || null, targetBatch || null, targetClassId || null,
       req.user.id, expiresAt || null, isPinned || false, attachmentUrls,
       publishedAt, approvedBy, approvedAt]
    );

    const notification = result.rows[0];

    // Trigger delivery if published
    if (status === NOTIFICATION_STATUS.PUBLISHED) {
      sendNotificationDelivery(notification);
    }

    res.status(201).json({
      success: true,
      message: status === NOTIFICATION_STATUS.PUBLISHED
        ? 'Notification published successfully.'
        : 'Notification submitted for approval.',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /notifications
 */
const getNotifications = async (req, res, next) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = ["n.status = 'published'"];
    let params = [];

    // Filter by type
    if (type) {
      params.push(type);
      whereConditions.push(`n.type = $${params.length}`);
    }

    // Filter by target
    if (req.user.role === ROLES.STUDENT) {
      // Fetch student attributes for targeting
      const studentRes = await pool.query(
        'SELECT batch, class_id, residence_type FROM students WHERE user_id = $1',
        [req.user.id]
      );
      const student = studentRes.rows[0] || {};

      whereConditions.push(`(
        n.target_user_id = $${params.length + 5}
        OR n.target_type = 'all'
        OR (n.target_type = 'department' AND n.target_department_id = $${params.length + 1})
        OR (n.target_type = 'batch' AND n.target_batch = $${params.length + 2})
        OR (n.target_type = 'class' AND n.target_class_id = $${params.length + 3})
        OR (n.target_type = 'hosteller' AND $${params.length + 4} = 'hosteller')
        OR (n.target_type = 'day_scholar' AND $${params.length + 4} = 'day_scholar')
      )`);
      params.push(req.user.departmentId, student.batch, student.class_id, student.residence_type, req.user.id);
    } else if (req.user.role === ROLES.FACULTY) {
      whereConditions.push(`(
        n.target_user_id = $${params.length + 2}
        OR n.target_type = 'all'
        OR (n.target_type = 'faculty' AND (n.target_department_id IS NULL OR n.target_department_id = $${params.length + 1}))
        OR (n.target_type = 'department' AND n.target_department_id = $${params.length + 1})
      )`);
      params.push(req.user.departmentId, req.user.id);
    }

    // Filter expired
    whereConditions.push("(n.expires_at IS NULL OR n.expires_at > NOW())");

    // Capture filters count for total count query
    const filterParams = [...params];
    const filterWhere = whereConditions.join(' AND ').trim();

    // 🚀 PHASE 10: SYNCHRONIZED PAGINATION QUERY
    const query = [
      "SELECT n.*, u.name as posted_by_name,",
      `EXISTS(SELECT 1 FROM notification_reads nr WHERE nr.notification_id = n.id AND nr.user_id = $${params.length + 1}) as is_read`,
      "FROM notifications n",
      "JOIN users u ON n.posted_by = u.id",
      "WHERE " + filterWhere,
      "ORDER BY n.is_pinned DESC, n.published_at DESC",
      `LIMIT $${params.length + 2} OFFSET $${params.length + 3}`
    ].join(' ').replace(/\s+/g, ' ');

    console.log('[TELEMETRY] Hot-Patch Initialized: Notification API sync confirmed.');
    console.log('[DEBUG] Query Payload:', { sql: query, params: [...params, req.user.id, parseInt(limit), offset] });

    const result = await pool.query(query, [
      ...params,
      req.user.id,
      parseInt(limit),
      offset
    ]);

    // 🚀 PHASE 10: SYNCHRONIZED COUNT QUERY
    const countQuery = `SELECT COUNT(*) FROM notifications n WHERE ${filterWhere}`.replace(/\s+/g, ' ');
    console.log('[DEBUG] Count Payload:', { sql: countQuery, params: filterParams });
    
    const countResult = await pool.query(countQuery, filterParams);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0]?.count || 0),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /notifications/:id
 */
const getNotificationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT n.*, u.name as posted_by_name, u.role as posted_by_role
       FROM notifications n
       JOIN users u ON n.posted_by = u.id
       WHERE n.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    // Mark as read
    await pool.query(
      `INSERT INTO notification_reads (notification_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [id, req.user.id]
    );

    // Increment view count
    await pool.query('UPDATE notifications SET view_count = view_count + 1 WHERE id = $1', [id]);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /notifications/:id/approve
 */
const approveNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'approve' or 'reject'

    const newStatus = action === 'approve' ? NOTIFICATION_STATUS.PUBLISHED : NOTIFICATION_STATUS.REJECTED;

    const publishedAt = newStatus === NOTIFICATION_STATUS.PUBLISHED ? new Date() : null;

    const result = await pool.query(
      `UPDATE notifications 
       SET status = $1, approved_by = $2, approved_at = NOW(), published_at = $3
       WHERE id = $4 AND status = 'pending_approval'
       RETURNING *`,
      [newStatus, req.user.id, publishedAt, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found or already processed.' });
    }

    const notification = result.rows[0];

    // Trigger delivery if approved
    if (newStatus === NOTIFICATION_STATUS.PUBLISHED) {
      sendNotificationDelivery(notification);
    }

    res.json({
      success: true,
      message: `Notification ${action}d successfully.`,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /notifications/pending
 */
const getPendingNotifications = async (req, res, next) => {
  try {
    let query = `
      SELECT n.*, u.name as posted_by_name
      FROM notifications n
      JOIN users u ON n.posted_by = u.id
      WHERE n.status = 'pending_approval'
    `;
    const params = [];

    if (req.user.role === ROLES.DEPARTMENT_ADMIN) {
      query += ' AND n.target_department_id = $1';
      params.push(req.user.departmentId);
    }

    query += ' ORDER BY n.created_at DESC';

    const result = await pool.query(query, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createNotification,
  getNotifications,
  getNotificationById,
  approveNotification,
  getPendingNotifications,
};
