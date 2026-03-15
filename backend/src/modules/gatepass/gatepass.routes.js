const express = require('express');
const router = express.Router();
const ctrl = require('./gatepass.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize, authorizeAny, restrictTo } = require('../../middleware/rbac.middleware');
const { auditLog } = require('../../middleware/audit.middleware');
const { ROLES } = require('../../config/constants');

router.post('/request',
  authenticate,
  authorize('gatepass:request'),
  auditLog('gatepass_requested', 'gate_pass'),
  ctrl.requestGatePass
);

router.get('/',
  authenticate,
  ctrl.getGatePasses
);

router.get('/:id',
  authenticate,
  ctrl.getGatePassById
);

router.patch('/:id/approve',
  authenticate,
  authorizeAny('gatepass:approve_faculty', 'gatepass:approve_hod', 'gatepass:approve_warden', 'gatepass:approve_admin'),
  auditLog('gatepass_approval', 'gate_pass'),
  ctrl.approveGatePass
);

router.post('/scan',
  authenticate,
  authorize('gatepass:scan'),
  auditLog('gatepass_scanned', 'gate_pass'),
  ctrl.scanGatePass
);

module.exports = router;
