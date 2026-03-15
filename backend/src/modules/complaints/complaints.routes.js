const express = require('express');
const router = express.Router();
const ctrl = require('./complaints.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize, authorizeAny } = require('../../middleware/rbac.middleware');
const { auditLog } = require('../../middleware/audit.middleware');
const { upload, setUploadPath } = require('../../middleware/upload.middleware');

router.post('/',
  authenticate,
  authorize('complaints:create'),
  setUploadPath('complaints'),
  upload.array('evidence', 5),
  auditLog('complaint_created', 'complaint'),
  ctrl.createComplaint
);

router.get('/',
  authenticate,
  ctrl.getComplaints
);

router.get('/:id',
  authenticate,
  ctrl.getComplaintById
);

router.patch('/:id/status',
  authenticate,
  authorize('complaints:update_status'),
  setUploadPath('complaints'),
  upload.single('resolutionProof'),
  auditLog('complaint_status_update', 'complaint'),
  ctrl.updateComplaintStatus
);

router.post('/:id/comments',
  authenticate,
  ctrl.addComment
);

module.exports = router;
