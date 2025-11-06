const express = require('express');
const auth = require('../../middlewares/auth');
const catchAsync = require('../../utils/catchAsync');
const { paymentController } = require('../../controllers');

const router = express.Router();
router.post('/create-order', catchAsync(paymentController.createOrder.handler));
router.post('/verify-payment', catchAsync(paymentController.verifyPayment.handler));

module.exports = router;