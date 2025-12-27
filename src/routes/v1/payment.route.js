// const express = require('express');
// const validate = require('../../middlewares/validate');
// const auth = require('../../middlewares/auth');
// const catchAsync = require('../../utils/catchAsync');
// const { paymentController } = require('../../controllers');

// const router = express.Router();

// router.post('/create', validate(paymentController.createPayment.validation), catchAsync(paymentController.createPayment.handler));
// router.post("/verify-payment", validate(paymentController.verifyPayment.validation), catchAsync(paymentController.verifyPayment.handler));
// router.post("/verify-payment-stripe", validate(paymentController.verifyPaymentStripe.validation), catchAsync(paymentController.verifyPaymentStripe.handler));

// module.exports = router;

const express = require('express');
const validate = require('../../middlewares/validate');
const auth = require('../../middlewares/auth');
const catchAsync = require('../../utils/catchAsync');
const { paymentController } = require('../../controllers');

const router = express.Router();

// ===============================
// 💳 RAZORPAY ROUTES
// ===============================

// ✅ Create Razorpay order (with validation)
router.post(
  '/create',
  validate(paymentController.createPayment.validation),
  catchAsync(paymentController.createPayment.handler)
);

// ✅ Verify Razorpay payment (after success)
router.post(
  '/verify-payment',
  catchAsync(paymentController.verifyPayment.handler)
);

// ===============================
// 💰 STRIPE ROUTES
// ===============================

// ✅ Create Stripe payment intent
router.post(
  '/create-payment-intent',
  catchAsync(paymentController.createStripePaymentIntent.handler)
);

// ✅ Verify & Save Stripe payment
router.post(
  '/verify-payment-stripe',
  catchAsync(paymentController.verifyPaymentStripe.handler)
);
router.get('/getall', catchAsync(paymentController.getAllPayment.handler));

router.get("/download-excel", catchAsync(paymentController.downloadPaymentExcel.handler));
router.get("/user-download-excel", auth(), catchAsync(paymentController.downloadUserWisePaymentsExcel.handler));

module.exports = router;
