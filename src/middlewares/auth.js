// const passport = require('passport');
// const httpStatus = require('http-status');
// const ApiError = require('../utils/ApiError');
// const { roleRights } = require('../config/roles');

// const verifyCallback = (req, resolve, reject, requiredRights) => async (err, user, info) => {
//   console.log('err...........', err)
//   console.log('user...........', user)
//   console.log('info...........', info)
//   if (err || info || !user) {
//     return reject(new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate'));
//   }
//   req.user = user;

//   if (requiredRights.length) {
//     const userRights = roleRights.get(user.role);
//     const hasRequiredRights = requiredRights.every((requiredRight) => userRights.includes(requiredRight));
//     if (!hasRequiredRights && req.params.userId !== user.id) {
//       return reject(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
//     }
//   }

//   resolve();
// };
// const auth = (...requiredRights) => async (req, res, next) => {
//   console.log('req.headers.authorization', req.headers.authorization)
//   return new Promise((resolve, reject) => {
//     passport.authenticate('jwt', { session: false }, verifyCallback(req, resolve, reject, requiredRights))(req, res, next);
//   })
//     .then(() => next())
//     .catch((err) => next(err));
// };


// module.exports = auth;

const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { authService, userService, tokenService, emailService } = require('../services');
const Joi = require('joi');
const ApiError = require('../utils/ApiError');
const { User } = require('../models');
const { sendWelcomeEmail } = require('../services/email.service');

const register = {
  validation: {
    body: Joi.object().keys({
      first_name: Joi.string().required(),
      last_name: Joi.string().required(),
      email: Joi.string().required().email(),
      // password: Joi.string().required().custom(password),
      password: Joi.string().required(),
    }),
  },
  handler: async (req, res) => {
    try {
      // Check if user already exists
      const user = await User.findOne({ email: req.body.email });
      if (user) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'User already registered');
      }

      // Create new user
      const newUser = await new User(req.body).save();

      // Generate auth tokens
      const token = await tokenService.generateAuthTokens(newUser);

      // Send welcome email via SMTP
      await sendWelcomeEmail(newUser.email, newUser.first_name);

      // Send success response
      return res.status(httpStatus.CREATED).send({
        success: true,
        message: 'User registered successfully',
        user: newUser,
        token,
      });
    } catch (error) {
      return res
        .status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR)
        .send({
          success: false,
          message: error.message || 'Registration failed',
        });
    }
  }

};

const login = {
  validation: {
    body: Joi.object().keys({
      email: Joi.string().required().email(),
      password: Joi.string().required(),
    }),
  },
  handler: async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.isPasswordMatch(password))) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Incorrect email or password');
    }

    const token = await tokenService.generateAuthTokens(user);
    return res.status(httpStatus.OK).send({ token, user });
  }
};

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await authService.refreshAuth(req.body.refreshToken);
  res.send({ ...tokens });
});

const forgotPassword = catchAsync(async (req, res) => {
  const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
  await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
  res.status(httpStatus.OK).send({ message: 'Reset password email sent' });
});

const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.query.token, req.body.password);
  res.status(httpStatus.OK).send({ message: 'Password reset successfully' });
});

const sendVerificationEmail = catchAsync(async (req, res) => {
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(req.user);
  await emailService.sendVerificationEmail(req.user.email, verifyEmailToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const verifyEmail = catchAsync(async (req, res) => {
  await authService.verifyEmail(req.query.token);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
};
