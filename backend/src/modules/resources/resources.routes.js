const express = require('express');
const router = express.Router();
const ctrl = require('./resources.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');
const { auditLog } = require('../../middleware/audit.middleware');

router.get('/', authenticate, ctrl.getResources);

router.post('/',
  authenticate,
  authorize('resources:manage'),
  auditLog('resource_created', 'resource'),
  ctrl.createResource
);

router.post('/book',
  authenticate,
  authorize('resources:book'),
  auditLog('resource_booked', 'booking'),
  ctrl.bookResource
);

router.get('/bookings', authenticate, ctrl.getBookings);

router.get('/:resourceId/availability', authenticate, ctrl.getAvailability);

router.patch('/bookings/:id/approve',
  authenticate,
  authorize('resources:approve_booking'),
  auditLog('booking_approval', 'booking'),
  ctrl.approveBooking
);

module.exports = router;
