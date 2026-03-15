const Joi = require('joi');
const { ROLES } = require('../../config/constants');

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  name: Joi.string().min(2).max(100).required(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{6,14}$/).optional(),
  role: Joi.string().valid(...Object.values(ROLES)).required(),
  departmentId: Joi.string().uuid().optional(),

  // Student-specific fields
  rollNumber: Joi.when('role', {
    is: ROLES.STUDENT,
    then: Joi.string().required(),
    otherwise: Joi.optional().allow('', null),
  }),
  classId: Joi.when('role', {
    is: ROLES.STUDENT,
    then: Joi.string().uuid().optional(),
    otherwise: Joi.optional().allow('', null),
  }),
  batch: Joi.when('role', {
    is: ROLES.STUDENT,
    then: Joi.string().optional(),
    otherwise: Joi.optional().allow('', null),
  }),
  residenceType: Joi.when('role', {
    is: ROLES.STUDENT,
    then: Joi.string().valid('hosteller', 'day_scholar').optional(),
    otherwise: Joi.optional().allow('', null),
  }),
  hostelBlock: Joi.string().optional().allow('', null),
  roomNumber: Joi.string().optional().allow('', null),
  fatherName: Joi.when('role', {
    is: ROLES.STUDENT,
    then: Joi.string().optional(),
    otherwise: Joi.optional().allow('', null),
  }),
  fatherPhone: Joi.when('role', {
    is: ROLES.STUDENT,
    then: Joi.string().optional(),
    otherwise: Joi.optional().allow('', null),
  }),
  motherName: Joi.when('role', {
    is: ROLES.STUDENT,
    then: Joi.string().optional(),
    otherwise: Joi.optional().allow('', null),
  }),
  motherPhone: Joi.when('role', {
    is: ROLES.STUDENT,
    then: Joi.string().optional(),
    otherwise: Joi.optional().allow('', null),
  }),

  // Faculty / Warden / Deputy Warden specific fields
  facultyIdNumber: Joi.when('role', {
    is: Joi.string().valid(ROLES.FACULTY, ROLES.DEPARTMENT_ADMIN, ROLES.WARDEN, ROLES.DEPUTY_WARDEN),
    then: Joi.string().required(),
    otherwise: Joi.optional().allow('', null),
  }),
  designation: Joi.string().optional().allow('', null),

  // Hostel assignment (for wardens and hosteller students)
  hostelId: Joi.string().uuid().optional().allow('', null),
  wardenId: Joi.string().uuid().optional().allow('', null),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const approveUserSchema = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required(),
  reason: Joi.string().optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  approveUserSchema,
};
