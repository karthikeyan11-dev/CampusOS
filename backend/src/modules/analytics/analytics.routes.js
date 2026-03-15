const express = require('express');
const router = express.Router();
const ctrl = require('./analytics.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

router.get('/dashboard',
  authenticate,
  authorize('analytics:view'),
  ctrl.getDashboard
);

router.get('/audit-logs',
  authenticate,
  authorize('audit:view'),
  ctrl.getAuditLogs
);

module.exports = router;
