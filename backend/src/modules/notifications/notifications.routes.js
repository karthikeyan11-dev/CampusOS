const express = require('express');
const router = express.Router();
const ctrl = require('./notifications.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize, authorizeAny } = require('../../middleware/rbac.middleware');
const { auditLog } = require('../../middleware/audit.middleware');
const { upload, setUploadPath } = require('../../middleware/upload.middleware');

router.post('/',
  authenticate,
  authorize('notifications:create'),
  setUploadPath('notifications'),
  upload.array('attachments', 5),
  auditLog('notification_created', 'notification'),
  ctrl.createNotification
);

router.get('/',
  authenticate,
  ctrl.getNotifications
);

router.get('/pending',
  authenticate,
  authorize('notifications:approve'),
  ctrl.getPendingNotifications
);

router.get('/:id',
  authenticate,
  ctrl.getNotificationById
);

router.patch('/:id/approve',
  authenticate,
  authorize('notifications:approve'),
  auditLog('notification_approval', 'notification'),
  ctrl.approveNotification
);

module.exports = router;
