const { PERMISSIONS } = require('../config/constants');

/**
 * RBAC Authorization Middleware
 * Checks if the user's role has the required permission
 * 
 * Usage: authorize('notifications:create')
 */
const authorize = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const userRole = req.user.role;

    // Super admin has all permissions
    if (userRole === 'super_admin') {
      return next();
    }

    // Check if user's role has ALL required permissions
    const hasPermission = requiredPermissions.every((permission) => {
      const allowedRoles = PERMISSIONS[permission];
      if (!allowedRoles) {
        console.warn(`⚠️ Unknown permission: ${permission}`);
        return false;
      }
      return allowedRoles.includes(userRole);
    });

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions.',
        required: requiredPermissions,
        userRole,
      });
    }

    next();
  };
};

/**
 * Check if user has ANY of the specified permissions
 */
const authorizeAny = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (req.user.role === 'super_admin') {
      return next();
    }

    const hasAny = permissions.some((permission) => {
      const allowedRoles = PERMISSIONS[permission];
      return allowedRoles && allowedRoles.includes(req.user.role);
    });

    if (!hasAny) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions.',
      });
    }

    next();
  };
};

/**
 * Restrict to specific roles directly
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.',
      });
    }

    next();
  };
};

module.exports = { authorize, authorizeAny, restrictTo };
