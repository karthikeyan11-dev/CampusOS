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
    otherwise: Joi.forbidden(),
  }),
  classId: Joi.when('role', {
    is: ROLES.STUDENT,
    then: Joi.string().uuid().optional(),
    otherwise: Joi.forbidden(),
  }),
  batch: Joi.when('role', {
    is: ROLES.STUDENT,
    then: Joi.string().optional(),
    otherwise: Joi.forbidden(),
  }),
  residenceType: Joi.when('role', {
    is: ROLES.STUDENT,
    then: Joi.string().valid('hosteller', 'day_scholar').optional(),
    otherwise: Joi.forbidden(),
  }),
  hostelBlock: Joi.string().optional().allow(''),
  roomNumber: Joi.string().optional().allow(''),
  fatherName: Joi.when('role', {
    is: ROLES.STUDENT,
    then: Joi.string().optional(),
    otherwise: Joi.forbidden(),
  }),
  fatherPhone: Joi.when('role', {
    is: ROLES.STUDENT,
    then: Joi.string().optional(),
    otherwise: Joi.forbidden(),
  }),
  motherName: Joi.when('role', {
    is: ROLES.STUDENT,
    then: Joi.string().optional(),
    otherwise: Joi.forbidden(),
  }),
  motherPhone: Joi.when('role', {
    is: ROLES.STUDENT,
    then: Joi.string().optional(),
    otherwise: Joi.forbidden(),
  }),

  // Faculty-specific fields
  facultyIdNumber: Joi.when('role', {
    is: Joi.string().valid(ROLES.FACULTY, ROLES.DEPARTMENT_ADMIN),
    then: Joi.string().required(),
    otherwise: Joi.forbidden(),
  }),
  designation: Joi.string().optional().allow(''),
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
