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
        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PreRecord",
            required: true,
        },
        selected_options: [{
            type: String,
            enum: ['record-book', 'video', 'writing-book']
        }],
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
        // ✅ NEW: Store currency for the cart item
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

// ✅ Compound index that handles both guest and logged-in users
cartSchema.index(
    { product_id: 1, user_id: 1, temp_id: 1 },
    {
        unique: true,
        partialFilterExpression: { bucket_type: true }
    }
);

cartSchema.plugin(toJSON);

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;