const express = require('express');
const router = express.Router();
const ctrl = require('./lostfound.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');
const { upload, setUploadPath } = require('../../middleware/upload.middleware');

router.post('/',
  authenticate,
  authorize('lostfound:create'),
  setUploadPath('lostfound'),
  upload.array('images', 3),
  ctrl.createItem
);

router.get('/', authenticate, ctrl.getItems);
router.get('/:id', authenticate, ctrl.getItemById);

router.patch('/:id/resolve',
  authenticate,
  ctrl.resolveItem
);

module.exports = router;
