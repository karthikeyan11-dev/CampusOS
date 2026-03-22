const express = require('express');
const router = express.Router();
const ctrl = require('./resources.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');
const { auditLog } = require('../../middleware/audit.middleware');

// Collection routes
router.get('/', authenticate, ctrl.getResources);
router.post('/', authenticate, authorize('resources:manage'), auditLog('resource_created', 'resource'), ctrl.createResource);

// Specialized routes (MUST be before generic /:id)
router.post('/book', authenticate, authorize('resources:book'), auditLog('resource_booked', 'booking'), ctrl.bookResource);
router.get('/bookings', authenticate, ctrl.getBookings);
router.patch('/bookings/:id/approve', authenticate, authorize('resources:approve_booking'), auditLog('booking_approval', 'booking'), ctrl.approveBooking);

// Individual Asset routes
router.route('/:id')
  .patch(authenticate, authorize('resources:manage'), auditLog('resource_updated', 'resource'), ctrl.updateResource)
  .delete(authenticate, authorize('resources:manage'), auditLog('resource_deactivated', 'resource'), ctrl.deleteResource);

router.get('/:resourceId/availability', authenticate, ctrl.getAvailability);
router.get('/:resourceId/conflicts', authenticate, ctrl.checkConflicts);

module.exports = router;
