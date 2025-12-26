// models/cart.model.js
const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const cartSchema = mongoose.Schema(
    {
        temp_id: {
            type: String,
            index: true,
        },
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false,
            index: true,
        },

        // ✅ Cart type to differentiate between PreRecord and Exam Plans
        cart_type: {
            type: String,
            enum: ['prerecord', 'exam_plan'],
            default: 'prerecord',
            required: true,
        },

        // For PreRecord products
        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PreRecord",
            required: function () {
                return this.cart_type === 'prerecord';
            },
        },
        selected_options: [{
            type: String,
            enum: ['record-book', 'video', 'writing-book']
        }],

        // ✅ For Exam Plans
        exam_category_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ExamList",
            required: function () {
                return this.cart_type === 'exam_plan';
            },
        },
        plan_id: {
            type: String,
            required: function () {
                return this.cart_type === 'exam_plan';
            },
        },
        plan_details: {
            plan_type: String,
            plan_month: Number, // ✅ CHANGED from plan_day to plan_month
            plan_pricing_dollar: Number,
            plan_pricing_inr: Number,
            plan_sub_title: [String],
        },

        // Common fields
        category_name: {
            type: String,
            required: true,
        },
        quantity: {
            type: Number,
            default: 1,
        },
        total_price: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            enum: ['USD', 'INR'],
            default: 'USD'
        },
        duration: {
            type: String,
        },
        bucket_type: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// ✅ Updated compound index for both types
cartSchema.index(
    { cart_type: 1, product_id: 1, exam_category_id: 1, plan_id: 1, user_id: 1, temp_id: 1 },
    {
        unique: true,
        partialFilterExpression: { bucket_type: true }
    }
);

cartSchema.plugin(toJSON);

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;