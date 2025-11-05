const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const cartSchema = mongoose.Schema(
    {
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
