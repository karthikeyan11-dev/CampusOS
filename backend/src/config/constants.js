// Role constants matching database enum
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  DEPARTMENT_ADMIN: 'department_admin',
  FACULTY: 'faculty',
  STUDENT: 'student',
  SECURITY_STAFF: 'security_staff',
  MAINTENANCE_STAFF: 'maintenance_staff',
  WARDEN: 'warden',
  DEPUTY_WARDEN: 'deputy_warden',
};

// Roles allowed during self-registration
const REGISTRATION_ROLES = [
  ROLES.STUDENT,
  ROLES.FACULTY,
  ROLES.SECURITY_STAFF,
  ROLES.MAINTENANCE_STAFF
];

// User account status
const USER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
};

// Notification types
const NOTIFICATION_TYPES = {
  ACADEMIC: 'academic',
  EVENT: 'event',
  EMERGENCY: 'emergency',
  DEPARTMENT: 'department',
  LOST_FOUND: 'lost_found',
  SYSTEM: 'system',
};

// Notification target types
const NOTIFICATION_TARGETS = {
  ALL: 'all',
  DEPARTMENT: 'department',
  BATCH: 'batch',
  CLASS: 'class',
  HOSTELLERS: 'hostellers',
  DAY_SCHOLARS: 'day_scholars',
  FACULTY: 'faculty',
};

// Notification approval status
const NOTIFICATION_STATUS = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
};

// Complaint status lifecycle
const COMPLAINT_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  REJECTED: 'rejected',
  ESCALATED: 'escalated',
};

// Complaint categories
const COMPLAINT_CATEGORIES = {
  INFRASTRUCTURE: 'infrastructure',
  ACADEMIC: 'academic',
  HOSTEL: 'hostel',
  TRANSPORT: 'transport',
  CANTEEN: 'canteen',
  IT_SERVICES: 'it_services',
  LIBRARY: 'library',
  OTHER: 'other',
};

// Complaint priority
const COMPLAINT_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

// Gate pass status — matches database enum exactly
const GATE_PASS_STATUS = {
  PENDING_FACULTY: 'pending_faculty',
  MENTOR_APPROVED: 'mentor_approved',
  HOD_APPROVED: 'hod_approved',
  WARDEN_APPROVED: 'warden_approved',
  APPROVED: 'approved',
  OPENED: 'opened',
  YET_TO_BE_CLOSED: 'yet_to_be_closed',
  CLOSED: 'closed',
  EXPIRED: 'expired',
  REJECTED: 'rejected',
};

// Gate pass types
const GATE_PASS_TYPE = {
  HOSTELLER: 'hosteller',
  DAY_SCHOLAR: 'day_scholar',
  FACULTY: 'faculty',
  HOD: 'hod',
};

// Lost & Found status
const ITEM_STATUS = {
  REPORTED: 'reported',
  MATCHED: 'matched',
  RESOLVED: 'resolved',
  EXPIRED: 'expired',
};

// Booking status
const BOOKING_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
};

// Permission matrix — which roles can do what
const PERMISSIONS = {
  // User management
  'users:manage_all': [ROLES.SUPER_ADMIN],
  'users:approve_faculty': [ROLES.SUPER_ADMIN],
  'users:approve_students': [ROLES.FACULTY, ROLES.DEPARTMENT_ADMIN],
  'users:approve_staff': [ROLES.SUPER_ADMIN],
  'users:view_department': [ROLES.DEPARTMENT_ADMIN, ROLES.FACULTY],

  // Notifications
  'notifications:publish_all': [ROLES.SUPER_ADMIN],
  'notifications:publish_department': [ROLES.DEPARTMENT_ADMIN],
  'notifications:create': [ROLES.FACULTY, ROLES.DEPARTMENT_ADMIN, ROLES.SUPER_ADMIN],
  'notifications:approve': [ROLES.DEPARTMENT_ADMIN, ROLES.SUPER_ADMIN],
  'notifications:view': [ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN, ROLES.FACULTY, ROLES.STUDENT],

  // Complaints
  'complaints:create': [ROLES.STUDENT, ROLES.FACULTY],
  'complaints:view_all': [ROLES.SUPER_ADMIN],
  'complaints:view_department': [ROLES.DEPARTMENT_ADMIN],
  'complaints:manage': [ROLES.MAINTENANCE_STAFF, ROLES.DEPARTMENT_ADMIN, ROLES.SUPER_ADMIN],
  'complaints:update_status': [ROLES.MAINTENANCE_STAFF, ROLES.DEPARTMENT_ADMIN, ROLES.SUPER_ADMIN],

  // Gate passes
  'gatepass:request': [ROLES.STUDENT, ROLES.FACULTY, ROLES.DEPARTMENT_ADMIN],
  'gatepass:approve_faculty': [ROLES.FACULTY],
  'gatepass:approve_hod': [ROLES.DEPARTMENT_ADMIN],
  'gatepass:approve_admin': [ROLES.SUPER_ADMIN],
  'gatepass:approve_warden': [ROLES.WARDEN, ROLES.DEPUTY_WARDEN],
  'gatepass:scan': [ROLES.SECURITY_STAFF],
  'gatepass:view_all': [ROLES.SUPER_ADMIN, ROLES.SECURITY_STAFF, ROLES.WARDEN, ROLES.DEPUTY_WARDEN],

  // Resources
  'resources:manage': [ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN],
  'resources:book': [ROLES.FACULTY],
  'resources:approve_booking': [ROLES.DEPARTMENT_ADMIN, ROLES.SUPER_ADMIN],
  'resources:view': [ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN, ROLES.FACULTY, ROLES.STUDENT],

  // Lost & Found
  'lostfound:create': [ROLES.STUDENT, ROLES.FACULTY, ROLES.SECURITY_STAFF],
  'lostfound:view': [ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN, ROLES.FACULTY, ROLES.STUDENT, ROLES.SECURITY_STAFF],

  // Analytics
  'analytics:view': [ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN],

  // Audit logs
  'audit:view': [ROLES.SUPER_ADMIN],

  // Departments
  'departments:manage': [ROLES.SUPER_ADMIN],

  // Hostel Management
  'hostels:manage': [ROLES.SUPER_ADMIN],

  // User Promotion
  'users:promote': [ROLES.SUPER_ADMIN],
};

// Escalation SLA timelines (in hours)
const ESCALATION_SLA = {
  [COMPLAINT_PRIORITY.LOW]: 72,
  [COMPLAINT_PRIORITY.MEDIUM]: 48,
  [COMPLAINT_PRIORITY.HIGH]: 24,
  [COMPLAINT_PRIORITY.CRITICAL]: 6,
};

module.exports = {
  ROLES,
  REGISTRATION_ROLES,
  USER_STATUS,
  NOTIFICATION_TYPES,
  NOTIFICATION_TARGETS,
  NOTIFICATION_STATUS,
  COMPLAINT_STATUS,
  COMPLAINT_CATEGORIES,
  COMPLAINT_PRIORITY,
  GATE_PASS_STATUS,
  GATE_PASS_TYPE,
  ITEM_STATUS,
  BOOKING_STATUS,
  PERMISSIONS,
  ESCALATION_SLA,
};
