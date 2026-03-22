const { ROLES } = require('../config/constants');

/**
 * Middleware to enforce the "5-Day Rule" for profile updates.
 * Student updates are permitted ONLY if current_date - approved_at <= 5 days.
 * Super Admin bypasses all temporal checks.
 */
const enforceFiveDayRule = async (req, res, next) => {
  try {
    const { user } = req;
    
    // Super Admin bypasses all checks
    if (user.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    // Only students are restricted by the 5-day rule currently
    if (user.role === ROLES.STUDENT) {
      if (!user.approvedAt) {
         return res.status(403).json({ 
           success: false, 
           message: 'Profile update restricted: User not yet approved.' 
         });
      }

      const approvedDate = new Date(user.approvedAt);
      const currentDate = new Date();
      
      const diffInMilliseconds = currentDate - approvedDate;
      const diffInDays = diffInMilliseconds / (1000 * 60 * 60 * 24);

      if (diffInDays > 5) {
        return res.status(403).json({ 
          success: false, 
          message: 'Profile update window (5 days post-approval) has expired. Contact support to request changes.' 
        });
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { enforceFiveDayRule };
