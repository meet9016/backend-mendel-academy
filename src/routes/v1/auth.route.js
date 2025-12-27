const express = require('express');
const validate = require('../../middlewares/validate');
const authValidation = require('../../validations/auth.validation');
const authController = require('../../controllers/auth.controller');
const auth = require('../../middlewares/auth');
const catchAsync = require('../../utils/catchAsync');

const router = express.Router();

// Registration and Login
router.post('/register', validate(authController.register.validation), catchAsync(authController.register.handler));
router.post('/login', validate(authController.login.validation), catchAsync(authController.login.handler));

// Profile Management
router.get('/profile/:id', catchAsync(authController.getUserProfile.handler));
router.put('/profile/:id', validate(authController.updateProfile.validation), catchAsync(authController.updateProfile.handler));
router.post('/profile-photo/:id', authController.updateProfilePhoto.handler);

// Email Verification
router.post('/send-verification-email', authController.sendVerificationEmail);
router.post('/verify-email', validate(authValidation.verifyEmail), authController.verifyEmail);

// Uncomment these as needed
// router.post('/logout', validate(authValidation.logout), authController.logout);
// router.post('/refresh-tokens', validate(authValidation.refreshTokens), authController.refreshTokens);
// router.post('/forgot-password', validate(authValidation.forgotPassword), authController.forgotPassword);
// router.post('/reset-password', validate(authValidation.resetPassword), authController.resetPassword);

module.exports = router;