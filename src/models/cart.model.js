const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const cartSchema = mongoose.Schema(
    {
        temp_id: {
            type: String,   // guest temp id (device/session)
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
        // ✅ CHANGED: Store multiple selected options as array
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
        // ✅ CHANGED: Total price for all selected bundles combined
        total_price: {
            type: Number,
            required: true,
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

// ✅ Add compound index to prevent duplicate products per user/temp_id
cartSchema.index({ product_id: 1, user_id: 1 }, { unique: true, sparse: true });
cartSchema.index({ product_id: 1, temp_id: 1 }, { unique: true, sparse: true });

cartSchema.plugin(toJSON);

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;