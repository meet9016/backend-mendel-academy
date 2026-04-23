const httpStatus = require('http-status');
const userService = require('./user.service');
const ApiError = require('../utils/ApiError');
const { verifyResetPasswordToken } = require('./tokenService');
const { User } = require('../models');

const loginUserWithEmailAndPassword = async (email, password) => {
  const user = await userService.getUserByEmail(email);
  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }
  return user;
};

const resetPassword = async (token, newPassword) => {
  const payload = verifyResetPasswordToken(token);
  const user = await User.findById(payload.sub);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  user.password = newPassword;
  await user.save();
};

module.exports = {
  loginUserWithEmailAndPassword,
  resetPassword,
};
