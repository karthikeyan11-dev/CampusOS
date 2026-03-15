const { pool } = require('../../config/database');

/**
 * GET /analytics/dashboard
 */
const getDashboard = async (req, res, next) => {
  try {
    // Run all queries in parallel
    const [
      complaintStats,
      complaintsByCategory,
      gatePassStats,
      notificationStats,
      bookingStats,
      recentActivity,
      userStats,
      lostFoundStats,
    ] = await Promise.all([
      // Complaints by status
      pool.query(`
        SELECT status, COUNT(*) as count 
        FROM complaints 
        GROUP BY status
      `),

      // Complaints by category
      pool.query(`
        SELECT COALESCE(category, 'uncategorized') as category, COUNT(*) as count 
        FROM complaints 
        GROUP BY category
        ORDER BY count DESC
      `),

      // Gate passes this month
      pool.query(`
        SELECT status, COUNT(*) as count 
        FROM gate_passes 
        WHERE created_at >= DATE_TRUNC('month', NOW())
        GROUP BY status
      `),

      // Notifications this month
      pool.query(`
        SELECT type, COUNT(*) as count 
        FROM notifications 
        WHERE created_at >= DATE_TRUNC('month', NOW())
        GROUP BY type
      `),

      // Booking stats
      pool.query(`
        SELECT r.type as resource_type, COUNT(b.id) as bookings, 
               COUNT(CASE WHEN b.status = 'approved' THEN 1 END) as approved
        FROM resources r
        LEFT JOIN bookings b ON r.id = b.resource_id 
          AND b.created_at >= DATE_TRUNC('month', NOW())
        GROUP BY r.type
      `),

      // Recent activity (last 10 audit logs)
      pool.query(`
        SELECT al.*, u.name as user_name, u.role as user_role
        FROM audit_logs al
        JOIN users u ON al.user_id = u.id
        ORDER BY al.created_at DESC
        LIMIT 10
      `),

      // User stats
      pool.query(`
        SELECT role, status, COUNT(*) as count
        FROM users
        GROUP BY role, status
      `),

      // Lost & Found stats
      pool.query(`
        SELECT type, status, COUNT(*) as count
        FROM lost_found_items
        GROUP BY type, status
      `),
    ]);

    // Calculate totals
    const totalComplaints = complaintStats.rows.reduce((sum, r) => sum + parseInt(r.count), 0);
    const openComplaints = complaintStats.rows.find(r => r.status === 'open')?.count || 0;
    const totalGatePasses = gatePassStats.rows.reduce((sum, r) => sum + parseInt(r.count), 0);
    const pendingUsers = userStats.rows
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + parseInt(r.count), 0);

    res.json({
      success: true,
      data: {
        overview: {
          totalComplaints,
          openComplaints: parseInt(openComplaints),
          totalGatePassesThisMonth: totalGatePasses,
          pendingApprovals: pendingUsers,
        },
        complaints: {
          byStatus: complaintStats.rows,
          byCategory: complaintsByCategory.rows,
        },
        gatePasses: {
          thisMonth: gatePassStats.rows,
        },
        notifications: {
          thisMonth: notificationStats.rows,
        },
        resources: {
          usage: bookingStats.rows,
        },
        lostFound: lostFoundStats.rows,
        users: userStats.rows,
        recentActivity: recentActivity.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /analytics/audit-logs
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const { action, entityType, userId, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let conditions = [];
    let params = [];
    let idx = 0;

    if (action) { idx++; conditions.push(`al.action = $${idx}`); params.push(action); }
    if (entityType) { idx++; conditions.push(`al.entity_type = $${idx}`); params.push(entityType); }
    if (userId) { idx++; conditions.push(`al.user_id = $${idx}`); params.push(userId); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT al.*, u.name as user_name, u.role as user_role
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${idx + 1} OFFSET $${idx + 2}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  getAuditLogs,
};
