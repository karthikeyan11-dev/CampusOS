const { pool } = require('../config/database');

/**
 * Audit logging middleware
 * Automatically logs API actions to audit_logs table
 */
const auditLog = (action, entityType) => {
  return async (req, res, next) => {
    // Store original json method to intercept response
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      // Log after successful responses
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const entityId = body?.data?.id || req.params.id || null;

        pool.query(
          `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            req.user.id,
            action,
            entityType,
            entityId,
            JSON.stringify({
              method: req.method,
              path: req.originalUrl,
              body: sanitizeBody(req.body),
            }),
            req.ip,
            req.get('user-agent'),
          ]
        ).catch((err) => console.error('Audit log error:', err.message));
      }

      return originalJson(body);
    };

    next();
  };
};

/**
 * Remove sensitive fields from request body before logging
 */
function sanitizeBody(body) {
  if (!body) return null;
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'password_hash', 'token', 'refreshToken', 'qr_token'];
  sensitiveFields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  return sanitized;
}

module.exports = { auditLog };
