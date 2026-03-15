/**
 * Validation middleware factory
 * Validates request body/params/query against a Joi schema
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors,
      });
    }

    // Replace with validated/sanitized data
    req[source] = value;
    next();
  };
};

module.exports = { validate };
