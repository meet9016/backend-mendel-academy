const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const paymentSchema = new mongoose.Schema({
  razorpay_order_id: String,
  razorpay_payment_id: String,
  razorpay_signature: String,
  amount: Number,
  currency: String,
  status: {
    type: String,
    default: "created", // created | paid | failed
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

paymentSchema.plugin(toJSON); 

/**
 * @typedef Payment
 */
const Payment = mongoose.model("Payment", paymentSchema);
module.exports = Payment;