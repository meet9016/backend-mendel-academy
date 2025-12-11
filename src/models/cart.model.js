const mongoose = require('mongoose');
const { toJSON } = require('./plugins');
const { boolean } = require('joi');

const cartSchema = mongoose.Schema(
    {
        temp_id: {
            type: String,   // guest temp id (device/session)
            index: true,
        },
        user_id: {   // <-- NEW FIELD
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",         // reference your User model
            required: false,     // guest users won’t have user_id
            index: true,
        },
        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PreRecord",
            required: true,
        },
        category_name: {
            type: String,
            required: true,
        },
        quantity: {
            type: Number,
            default: 1,
        },
        price: {
            type: Number,
            required: true,
        },
        duration: {
            type: String,
            // required: true,
        },
        bucket_type: {
            type: Boolean,
        },
    },
    {
        timestamps: true,
    }
);

// add plugin that converts mongoose to json
cartSchema.plugin(toJSON);

/**
 * @typedef Cart
 */
const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
