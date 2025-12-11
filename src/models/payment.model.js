const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const paymentSchema = mongoose.Schema(
    {
        // ✅ Common User Info
        full_name: { type: String, trim: true },
        email: { type: String, trim: true },
        phone: { type: String, trim: true },
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",         // reference your User model
            required: false,     // guest users won’t have user_id
            index: true,
        },

        // ✅ Plan / Order Info
        plan_id: { type: String },
        amount: { type: Number, required: true },
        currency: { type: String, default: 'INR' },
        payment_method: {
            type: String,
            enum: ['Razorpay', 'Stripe', 'Paypal'],
            default: 'Razorpay',
        },

        // ✅ Razorpay Specific Fields
        transaction_id: { type: String }, // Razorpay Order ID
        razorpay_payment_id: { type: String },
        razorpay_signature: { type: String },

        // ✅ Stripe Specific Fields
        paymentIntentId: { type: String },
        card: {
            brand: { type: String },
            last4: { type: String },
            exp_month: { type: Number },
            exp_year: { type: Number },
        },

        // ✅ Payment Status
        payment_status: {
            type: String,
            enum: ['Pending', 'paid', 'succeeded', 'failed', 'cancelled'],
            default: 'Pending',
        },

        // ✅ Email Reference (for Stripe fallback)
        customerEmail: { type: String },

        // ✅ Miscellaneous / Metadata
        remarks: { type: String },
    },
    {
        timestamps: true, // createdAt, updatedAt
    }
);

paymentSchema.index({ paymentIntentId: 1, transaction_id: 1 });

// add plugin that converts mongoose to json
paymentSchema.plugin(toJSON);

/**
 * @typedef Payment
 */
const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
