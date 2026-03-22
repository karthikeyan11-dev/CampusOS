const express = require('express');
const router = express.Router();
const governanceController = require('./governance.controller');
const lookupController = require('./lookup.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

// Public/Lighweight lookups (Authenticated only)
router.get('/lookup/departments', authenticate, lookupController.lookupDepartments);
router.get('/lookup/hostels', authenticate, lookupController.lookupHostels);

// All routes below are Super Admin only for Institution Management
router.use(authenticate, authorize('departments:manage'));

// Department CRUD & Hierarchy
router.get('/departments', governanceController.getDepartments);
router.post('/departments', governanceController.createDepartment);
router.get('/departments/:id', governanceController.getDepartmentDetails);
router.patch('/departments/:id', governanceController.updateDepartment);
router.delete('/departments/:id', governanceController.deleteDepartment);

// Hostel CRUD & Hierarchy
router.get('/hostels', governanceController.getHostels);
router.post('/hostels', governanceController.createHostel);
router.get('/hostels/:id', governanceController.getHostelDetails);
router.patch('/hostels/:id', governanceController.updateHostel);
router.delete('/hostels/:id', governanceController.deleteHostel);

// Mapping Operations
router.get('/mappings/faculty', governanceController.getFacultyForMapping);
router.post('/mappings/hostel', governanceController.createHostelMapping);

module.exports = router;
