const mongoose = require('mongoose');

const validateObjectIdParam = (name = 'id') => (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params[name])) {
    return res.status(400).json({
      code: 'INVALID_ID',
      error: `${name} must be a valid MongoDB ObjectId`
    });
  }
  next();
};

const validateObjectIdArray = (values) => (
  Array.isArray(values) && values.every(value => mongoose.isObjectIdOrHexString(value))
);

module.exports = {
  validateObjectIdArray,
  validateObjectIdParam
};
