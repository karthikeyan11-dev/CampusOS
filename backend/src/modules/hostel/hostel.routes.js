const express = require('express');
const router = express.Router();
const hostelController = require('./hostel.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

// Public/All authenticated
router.get('/', authenticate, hostelController.getHostels);

// Admin only
router.post('/',
  authenticate,
  authorize('hostels:manage'),
  hostelController.createHostel
);

router.patch('/:id/assign',
  authenticate,
  authorize('hostels:manage'),
  hostelController.assignWardens
);

module.exports = router;
