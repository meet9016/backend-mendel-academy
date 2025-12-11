const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { authService, userService, tokenService, emailService } = require('../services');
const Joi = require('joi');
const ApiError = require('../utils/ApiError');
const { User, Cart, Payment } = require('../models');
const { sendWelcomeEmail } = require('../services/email.service');
const { createZoomMeeting } = require('../services/zoom.service');

const register = {
  validation: {
    body: Joi.object().keys({
      first_name: Joi.string().required(),
      last_name: Joi.string().required(),
      email: Joi.string().required().email(),
      password: Joi.string().required(),
    }),
  },

  handler: async (req, res) => {
    // const session = await User.startSession(); // start MongoDB transaction session
    // session.startTransaction();

    try {
      // 1️⃣ Check if user already exists
      const existingUser = await User.findOne({ email: req.body.email });
      if (existingUser) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'User already registered');
      }

      // 2️⃣ Create new user (inside transaction)
      // const newUser = await new User(req.body).save({ session });
      const newUser = await new User(req.body).save();

      // 3️⃣ Generate auth token
      const token = await tokenService.generateAuthTokens(newUser);

      // 4️⃣ Create Zoom meeting (valid 5 min)
      // const zoomMeeting = await createZoomMeeting(`Welcome ${newUser.first_name}`);

      // 5️⃣ Send welcome email
      await sendWelcomeEmail(newUser.email, newUser.first_name);
      // await sendWelcomeEmail(newUser.email, newUser.first_name, zoomMeeting.join_url);

      // ✅ If all succeed, commit transaction
      // await session.commitTransaction();
      // session.endSession();

      console.log("Incoming registration body:", req.body);

      // 6️⃣ Send success response
      return res.status(httpStatus.CREATED).send({
        success: true,
        message: 'User registered successfully',
        user: newUser,
        token,
        // zoom_meeting: zoomMeeting,
      });

    } catch (error) {
      // ❌ Rollback changes if any step fails
      // await session.abortTransaction();
      // session.endSession();
      console.error("❌ Registration Error:", error.message, error.stack);

      return res
        .status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR)
        .send({
          success: false,
          message: error.message || 'Registration failed',
        });
    }
  },
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

const getUserProfile = {

  handler: async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await User.findById(userId);

      // Cart items all
      const cartItems = await Cart.find({ user_id: userId });

      // bucket_type = true
      const addToCartItem = cartItems.filter(item => item.bucket_type === true);

      // bucket_type = false
      const payBill = cartItems.filter(item => item.bucket_type === false);

      // Payment items
      const paymentItems = await Payment.find({ user_id: userId });

      if (!user) {
        return res.status(404).json({ message: "User Not Found" });
      }

      return res.status(200).send({
        success: true,
        message: "Successfully",
        user: user,
        cart: {
          addToCartItem: addToCartItem,
          payBill: payBill
        },
        payment: paymentItems,
        totalSpent: paymentItems.reduce((total, payment) => total + payment.amount, 0),
      });

    } catch (error) {
      res.status(500).json({ message: "Server Error", error });
    }
  }
}

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
  getUserProfile,
};