const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { Cart, PreRecord } = require('../models');
const Joi = require('joi');
const mongoose = require("mongoose");

// ✅ UPDATED: Add/Update Cart with multiple options for same product
const addToCart = {
    validation: {
        body: Joi.object().keys({
            temp_id: Joi.string(),
            user_id: Joi.string(),
            product_id: Joi.string().required(),
            selected_options: Joi.array()
                .items(Joi.string().valid('record-book', 'video', 'writing-book'))
                .min(1)
                .required(),
            category_name: Joi.string().trim().required(),
            duration: Joi.string().allow(null, ''),
            bucket_type: Joi.boolean(),
        }),
    },

    handler: async (req, res) => {
        try {
            const { temp_id, user_id, product_id, selected_options, category_name, duration } = req.body;

            // ✅ Get product details to calculate price
            const product = await PreRecord.findById(product_id);
            if (!product) {
                return res.status(404).send({
                    success: false,
                    message: "Product not found",
                });
            }

            // ✅ Calculate total price for selected options
            let total_price = 0;
            for (const optionType of selected_options) {
                const option = product.options.find(o => o.type === optionType);
                if (option && option.is_available) {
                    total_price += option.price;
                } else {
                    return res.status(400).send({
                        success: false,
                        message: `Option ${optionType} is not available`,
                    });
                }
            }

            // ✅ Check if product already exists in cart
            const query = {
                product_id,
                bucket_type: true
            };
            
            if (user_id) {
                query.user_id = user_id;
            } else if (temp_id) {
                query.temp_id = temp_id;
            } else {
                return res.status(400).send({
                    success: false,
                    message: "Either temp_id or user_id is required",
                });
            }

            let cartItem = await Cart.findOne(query);

            if (cartItem) {
                // ✅ Update existing cart item with new options
                cartItem.selected_options = selected_options;
                cartItem.total_price = total_price;
                await cartItem.save();
            } else {
                // ✅ Create new cart item
                cartItem = await Cart.create({
                    temp_id,
                    user_id,
                    product_id,
                    selected_options,
                    category_name,
                    total_price,
                    duration,
                    bucket_type: true,
                    quantity: 1
                });
            }

            // Count total items
            const countQuery = user_id ? { user_id } : { temp_id };
            countQuery.bucket_type = true;
            const totalItems = await Cart.countDocuments(countQuery);

            return res.status(200).send({
                success: true,
                message: "Product added to cart successfully",
                cart: cartItem,
                count: totalItems,
            });

        } catch (error) {
            console.error('Add to cart error:', error);
            return res.status(500).send({
                success: false,
                message: error.message,
            });
        }
    },
};

const getCheckoutPageTempId = {
    handler: async (req, res) => {
        try {
            const { temp_id } = req.params;

            let data = [];

            // 1️⃣ Try using temp_id
            data = await Cart.find({ temp_id, bucket_type: true })
                .populate('product_id');

            // 2️⃣ If no data found → try using user_id
            if (data.length === 0) {
                data = await Cart.find({ user_id: temp_id, bucket_type: true })
                    .populate('product_id');
            }

            if (data.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "No cart found"
                });
            }

            // Calculate total
            const totalAmount = data.reduce((sum, item) => {
                return sum + (item.total_price * item.quantity);
            }, 0);

            return res.status(200).json({
                success: true,
                data,
                totalAmount
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    },
};

const getCart = {
    handler: async (req, res) => {
        try {
            const { temp_id } = req.query;

            if (!temp_id) {
                return res.status(400).send({
                    success: false,
                    message: "temp_id is required",
                });
            }

            const isObjectId = mongoose.Types.ObjectId.isValid(temp_id);

            const query = {
                $or: [
                    { temp_id: temp_id },
                    ...(isObjectId ? [{ user_id: temp_id }] : [])
                ],
                bucket_type: true
            };

            const cartItems = await Cart.find(query)
                .populate("product_id")
                .lean();

            const total = cartItems.reduce((acc, item) => {
                const price = Number(item.total_price) || 0;
                const qty = Number(item.quantity) || 0;
                return acc + price * qty;
            }, 0);

            return res.status(200).send({
                success: true,
                message: "Cart fetched successfully",
                cart: cartItems,
                total
            });

        } catch (error) {
            return res.status(500).send({
                success: false,
                message: error.message,
            });
        }
    },
};

const getAllCart = {
    handler: async (req, res) => {
        try {
            const carts = await Cart.find().populate('product_id');
            res.status(200).json({
                success: true,
                data: carts,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message,
            });
        }
    }
}

const getCartCount = {
    handler: async (req, res) => {
        try {
            const { temp_id } = req.params;

            if (!temp_id) {
                return res.status(400).send({
                    success: false,
                    message: "temp_id or user_id is required",
                });
            }

            const isObjectId = mongoose.Types.ObjectId.isValid(temp_id);

            const query = isObjectId
                ? { user_id: temp_id }
                : { temp_id: temp_id };

            query.bucket_type = true;

            const count = await Cart.countDocuments(query);

            return res.status(200).send({
                success: true,
                count,
            });

        } catch (error) {
            return res.status(500).send({
                success: false,
                message: error.message,
            });
        }
    },
};

const updateQuantity = {
    validation: {
        body: Joi.object().keys({
            cart_id: Joi.string().required(),
            quantity: Joi.number().min(1).required()
        })
    },
    handler: async (req, res) => {
        try {
            const { cart_id, quantity } = req.body;

            const cartItem = await Cart.findById(cart_id);

            if (!cartItem) {
                throw new ApiError(httpStatus.NOT_FOUND, 'Cart item not found');
            }

            cartItem.quantity = quantity;
            await cartItem.save();

            res.status(200).json({
                success: true,
                message: 'Cart updated successfully',
                data: cartItem
            });
        } catch (error) {
            console.error('Update quantity error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Server error'
            });
        }
    },
};

// ✅ Remove entire cart item (product)
const removeCart = {
    handler: async (req, res) => {
        try {
            const id = req.params.id;

            const deletedItem = await Cart.findByIdAndDelete(id);

            if (!deletedItem) {
                return res.status(404).json({
                    success: false,
                    message: "Cart item not found!"
                });
            }

            res.json({
                success: true,
                message: "Cart item deleted successfully!",
                data: deletedItem
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Server error",
                error: error.message
            });
        }
    },
};

// ✅ NEW: Update selected options for a cart item
const updateCartOptions = {
    validation: {
        body: Joi.object().keys({
            cart_id: Joi.string().required(),
            selected_options: Joi.array()
                .items(Joi.string().valid('record-book', 'video', 'writing-book'))
                .min(1)
                .required()
        })
    },
    handler: async (req, res) => {
        try {
            const { cart_id, selected_options } = req.body;

            const cartItem = await Cart.findById(cart_id).populate('product_id');

            if (!cartItem) {
                return res.status(404).json({
                    success: false,
                    message: "Cart item not found!"
                });
            }

            // Calculate new total price
            let total_price = 0;
            for (const optionType of selected_options) {
                const option = cartItem.product_id.options.find(o => o.type === optionType);
                if (option && option.is_available) {
                    total_price += option.price;
                } else {
                    return res.status(400).json({
                        success: false,
                        message: `Option ${optionType} is not available`
                    });
                }
            }

            cartItem.selected_options = selected_options;
            cartItem.total_price = total_price;
            await cartItem.save();

            res.json({
                success: true,
                message: "Cart options updated successfully!",
                data: cartItem
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Server error",
                error: error.message
            });
        }
    }
};

// ✅ NEW: Remove specific option from cart item
const removeCartOption = {
    validation: {
        body: Joi.object().keys({
            cart_id: Joi.string().required(),
            option_type: Joi.string().valid('record-book', 'video', 'writing-book').required()
        })
    },
    handler: async (req, res) => {
        try {
            const { cart_id, option_type } = req.body;

            const cartItem = await Cart.findById(cart_id).populate('product_id');

            if (!cartItem) {
                return res.status(404).json({
                    success: false,
                    message: "Cart item not found!"
                });
            }

            // Remove the option
            cartItem.selected_options = cartItem.selected_options.filter(
                opt => opt !== option_type
            );

            // If no options left, delete the cart item
            if (cartItem.selected_options.length === 0) {
                await Cart.findByIdAndDelete(cart_id);
                return res.json({
                    success: true,
                    message: "Last option removed, cart item deleted!",
                    data: null
                });
            }

            // Recalculate total price
            let total_price = 0;
            for (const optType of cartItem.selected_options) {
                const option = cartItem.product_id.options.find(o => o.type === optType);
                if (option && option.is_available) {
                    total_price += option.price;
                }
            }

            cartItem.total_price = total_price;
            await cartItem.save();

            res.json({
                success: true,
                message: "Option removed from cart successfully!",
                data: cartItem
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Server error",
                error: error.message
            });
        }
    }
};

module.exports = {
    addToCart,
    getCheckoutPageTempId,
    getCart,
    getAllCart,
    getCartCount,
    updateQuantity,
    removeCart,
    updateCartOptions,
    removeCartOption,
};