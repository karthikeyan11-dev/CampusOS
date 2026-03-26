const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize, authorizeAny } = require('../../middleware/rbac.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { auditLog } = require('../../middleware/audit.middleware');
const { upload, setUploadPath } = require('../../middleware/upload.middleware');
const { registerSchema, loginSchema, refreshTokenSchema, approveUserSchema } = require('./auth.validators');

// Public routes
router.post('/register',
  setUploadPath('id-cards'),
  upload.single('idCard'),
  validate(registerSchema),
  authController.register
);

router.post('/login',
  validate(loginSchema),
  authController.login
);

router.post('/refresh',
  validate(refreshTokenSchema),
  authController.refreshAccessToken
);

// Protected routes
router.post('/logout',
  authenticate,
  authController.logout
);

router.get('/me',
  authenticate,
  authController.getProfile
);

router.patch('/me',
  authenticate,
  authController.updateProfile
);

// Admin routes
router.get('/users/pending',
  authenticate,
  authorizeAny('users:approve_faculty', 'users:approve_students'),
  authController.getPendingUsers
);

router.patch('/users/:id/approve',
  authenticate,
  authorizeAny('users:approve_faculty', 'users:approve_students'),
  validate(approveUserSchema),
  auditLog('user_approval', 'user'),
  authController.approveUser
);

router.get('/users',
  authenticate,
  authorize('users:view'),
  authController.getAllUsers
);

router.get('/faculty/mapping',
  authenticate,
  authorize('users:promote'),
  authController.getFacultyMapping
);

router.patch('/users/:id/promote',
  authenticate,
  authorize('users:promote'),
  authController.promoteUser
);

router.post('/assignments/class',
  authenticate,
  authorize('users:promote'),
  authController.updateClassAssignment
);

router.post('/assignments/department',
  authenticate,
  authorize('users:promote'),
  authController.updateDepartmentAssignment
);

module.exports = router;
