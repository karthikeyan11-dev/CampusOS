const { pool } = require('../../config/database');
const redisService = require('../../services/redis.service');

/**
 * GET /analytics/dashboard
 */
const getDashboard = async (req, res, next) => {
  try {
    const dashboardData = await redisService.getOrSetCache(
      'analytics:dashboard',
      async () => {
        // Run all queries in parallel
        // Safe query execution helper
        const safeQuery = async (queryStr, fallback = { rows: [] }) => {
          try {
            return await pool.query(queryStr);
          } catch (err) {
            console.error(`⚠️ Dashboard Query Fail:`, err.message);
            return fallback;
          }
        };

        // Run all queries with resilience
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
          safeQuery(`SELECT status, COUNT(*) as count FROM complaints GROUP BY status`),
          safeQuery(`SELECT COALESCE(category::text, 'other') as category, COUNT(*) as count FROM complaints GROUP BY category ORDER BY count DESC`),
          safeQuery(`SELECT status, COUNT(*) as count FROM gate_passes WHERE created_at >= DATE_TRUNC('month', NOW()) GROUP BY status`),
          safeQuery(`SELECT type, COUNT(*) as count FROM notifications WHERE created_at >= DATE_TRUNC('month', NOW()) GROUP BY type`),
          safeQuery(`SELECT r.type as resource_type, COUNT(b.id) as bookings, COUNT(CASE WHEN b.status = 'approved' THEN 1 END) as approved FROM resources r LEFT JOIN bookings b ON r.id = b.resource_id AND b.created_at >= DATE_TRUNC('month', NOW()) GROUP BY r.type`),
          safeQuery(`SELECT al.*, u.name as user_name, u.role as user_role FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id ORDER BY al.created_at DESC LIMIT 10`),
          safeQuery(`SELECT role, status, COUNT(*) as count FROM users GROUP BY role, status`),
          safeQuery(`SELECT type, status, COUNT(*) as count FROM lost_found_items GROUP BY type, status`),
        ]);

        const totalComplaints = complaintStats.rows.reduce((sum, r) => sum + parseInt(r.count), 0);
        const openComplaints = complaintStats.rows.find(r => r.status === 'open')?.count || 0;
        const totalGatePasses = gatePassStats.rows.reduce((sum, r) => sum + parseInt(r.count), 0);
        const pendingUsers = userStats.rows.filter(r => r.status === 'pending').reduce((sum, r) => sum + parseInt(r.count), 0);

        return {
          overview: { totalComplaints, openComplaints: parseInt(openComplaints), totalGatePassesThisMonth: totalGatePasses, pendingApprovals: pendingUsers },
          complaints: { byStatus: complaintStats.rows, byCategory: complaintsByCategory.rows },
          gatePasses: { thisMonth: gatePassStats.rows },
          notifications: { thisMonth: notificationStats.rows },
          resources: { usage: bookingStats.rows },
          lostFound: lostFoundStats.rows,
          users: userStats.rows,
          recentActivity: recentActivity.rows,
        };
      },
      300 // 5 minutes TTL
    );

    res.json({ success: true, data: dashboardData });
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
