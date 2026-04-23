const jwt = require('jsonwebtoken');
const { tokenTypes } = require('../config/tokens');
const config = require('../config/config');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');

const generateAuthTokens = async (user) => {
  const accessToken = jwt.sign(
    { sub: user.id, type: tokenTypes.ACCESS },
    config.jwt.secret,
    { expiresIn: '1d' }
  );
  return { access: accessToken };
};

const generateResetPasswordToken = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No user found with this email');
  }
  const expires = config.jwt.resetPasswordExpirationMinutes || 10;
  const token = jwt.sign(
    { sub: user.id, type: tokenTypes.RESET_PASSWORD },
    config.jwt.secret,
    { expiresIn: `${expires}m` }
  );
  return token;
};

const verifyResetPasswordToken = (token) => {
  const payload = jwt.verify(token, config.jwt.secret);
  if (payload.type !== tokenTypes.RESET_PASSWORD) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token type');
  }
  return payload;
};

module.exports = {
  generateAuthTokens,
  generateResetPasswordToken,
  verifyResetPasswordToken,
};