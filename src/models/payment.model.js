const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const paymentSchema = mongoose.Schema(
    {
        // user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        // category_id: { type: mongoose.Schema.Types.ObjectId, ref: "ExamList", required: true },
        plan_id: { type: mongoose.Schema.Types.ObjectId },
        amount: { type: Number, required: true },
        // payment_status: { type: String, enum: ["Pending", "Success", "Failed"], default: "Pending" },
        status: {
            type: String,
            default: "created", // created | paid | failed
        },
        transaction_id: { type: String },
        payment_method: { type: String, enum: ["Razorpay", "Stripe", "Paypal"], default: "Razorpay" },
        createdAt: { type: Date, default: Date.now },
        razorpay_order_id: { type: String },
        razorpay_payment_id: { type: String },
        razorpay_signature: { type: String },
    },
    {
        timestamps: true,
    }
);

// add plugin that converts mongoose to json
paymentSchema.plugin(toJSON);

/**
 * @typedef Payment
 */
const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
