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

router.post('/faculty',
  authenticate,
  restrictTo(ROLES.FACULTY, ROLES.DEPARTMENT_ADMIN, ROLES.WARDEN, ROLES.DEPUTY_WARDEN, ROLES.SECURITY_STAFF, ROLES.MAINTENANCE_STAFF),
  auditLog('faculty_gatepass_requested', 'gate_pass'),
  ctrl.requestFacultyGatePass
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

router.patch('/faculty/:id/approve',
  authenticate,
  restrictTo(ROLES.DEPARTMENT_ADMIN, ROLES.SUPER_ADMIN),
  auditLog('faculty_gatepass_approval', 'gate_pass'),
  ctrl.approveFacultyGatePass
);

router.post('/scan',
  authenticate,
  authorize('gatepass:scan'),
  auditLog('gatepass_scanned', 'gate_pass'),
  ctrl.scanGatePass
);

router.post('/open',
  authenticate,
  authorize('gatepass:scan'),
  auditLog('gatepass_opened', 'gate_pass'),
  ctrl.openGatePass
);

router.post('/close',
  authenticate,
  authorize('gatepass:scan'),
  auditLog('gatepass_closed', 'gate_pass'),
  ctrl.closeGatePass
);

module.exports = router;
