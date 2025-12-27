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

        // ✅ Cart type - NOW INCLUDES HYPERSPECIALIST
        cart_type: {
            type: String,
            enum: ['prerecord', 'exam_plan', 'hyperspecialist'],
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

        // For Exam Plans
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
            plan_month: Number,
            plan_pricing_dollar: Number,
            plan_pricing_inr: Number,
            plan_sub_title: [String],
        },

        // ✅ For HyperSpecialist
        hyperspecialist_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "HyperSpecialist",
            required: function () {
                return this.cart_type === 'hyperspecialist';
            },
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

// ✅ For PreRecord products - prevent duplicate product_id per user
cartSchema.index(
    { cart_type: 1, product_id: 1, user_id: 1, bucket_type: 1 },
    {
        unique: true,
        partialFilterExpression: {
            cart_type: 'prerecord',
            bucket_type: true,
            user_id: { $type: 'objectId' }
        }
    }
);

cartSchema.index(
    { cart_type: 1, product_id: 1, temp_id: 1, bucket_type: 1 },
    {
        unique: true,
        partialFilterExpression: {
            cart_type: 'prerecord',
            bucket_type: true,
            temp_id: { $type: 'string' }
        }
    }
);

// ✅ For Exam Plans - prevent duplicate exam_category_id + plan_id per user
cartSchema.index(
    { cart_type: 1, exam_category_id: 1, plan_id: 1, user_id: 1, bucket_type: 1 },
    {
        unique: true,
        partialFilterExpression: {
            cart_type: 'exam_plan',
            bucket_type: true,
            user_id: { $type: 'objectId' }
        }
    }
);

cartSchema.index(
    { cart_type: 1, exam_category_id: 1, plan_id: 1, temp_id: 1, bucket_type: 1 },
    {
        unique: true,
        partialFilterExpression: {
            cart_type: 'exam_plan',
            bucket_type: true,
            temp_id: { $type: 'string' }
        }
    }
);

// ✅ NEW: For HyperSpecialist - prevent duplicate hyperspecialist_id per user
cartSchema.index(
    { cart_type: 1, hyperspecialist_id: 1, user_id: 1, bucket_type: 1 },
    {
        unique: true,
        partialFilterExpression: {
            cart_type: 'hyperspecialist',
            bucket_type: true,
            user_id: { $type: 'objectId' }
        }
    }
);

cartSchema.index(
    { cart_type: 1, hyperspecialist_id: 1, temp_id: 1, bucket_type: 1 },
    {
        unique: true,
        partialFilterExpression: {
            cart_type: 'hyperspecialist',
            bucket_type: true,
            temp_id: { $type: 'string' }
        }
    }
);

// Optional: Performance indexes
cartSchema.index({ user_id: 1, bucket_type: 1 });
cartSchema.index({ temp_id: 1, bucket_type: 1 });

cartSchema.plugin(toJSON);

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;