const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { Cart, Product } = require('../models');
const Joi = require('joi');
const mongoose = require("mongoose");

// Add to Cart
const addToCart = {
    validation: {
        body: Joi.object().keys({
            temp_id: Joi.string(),
            user_id: Joi.string(),
            product_id: Joi.string().required(),
            category_name: Joi.string().trim().required(),
            price: Joi.number().required(),
            quantity: Joi.number().default(1),
            duration: Joi.string().allow(null, ''),
            bucket_type: Joi.boolean(),
        }),
    },

    handler: async (req, res) => {
        try {

            const { temp_id, user_id, product_id, category_name, price, quantity, duration } = req.body;

            // Already exist check (same product + same variant)
            let cartItem = await Cart.findOne({ temp_id, user_id, product_id, category_name, price, quantity, duration });

            if (cartItem) {
                cartItem.quantity += quantity;
                await cartItem.save();
            } else {
                cartItem = await Cart.create(req.body);
            }

            // Count total items for this temp_id OR user_id
            const countQuery = user_id ? { user_id } : { temp_id };
            console.log("countQuery",countQuery);

            countQuery.bucket_type = true;
            const totalItems = await Cart.countDocuments(countQuery);
            console.log("totalItems",totalItems);
            
            return res.status(200).send({
                success: true,
                message: "Product added to cart successfully",
                cart: cartItem,
                count: totalItems, // total items for this user/temp
            });

        } catch (error) {
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
            data = await Cart.find({ temp_id, bucket_type: true });

            // 2️⃣ If no data found → try using user_id
            if (data.length === 0) {
                data = await Cart.find({ user_id: temp_id, bucket_type: true });
            }

            // If still no data
            if (data.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "No cart found"
                });
            }

            // Calculate total
            const totalAmount = data.reduce((sum, item) => {
                return sum + (item.price * item.quantity);
            }, 0);

            return res.status(200).json({
                success: true,
                data,
                totalAmount
            });

        } catch (error) {
            res.status(500).json({ message: 'Server error', error });
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

            // Check if the passed value is a REAL ObjectId
            const isObjectId = mongoose.Types.ObjectId.isValid(temp_id);

            const query = {
                $or: [
                    { temp_id: temp_id },              // Guest cart
                    ...(isObjectId ? [{ user_id: temp_id }] : [])  // User cart only if valid ObjectId
                ],
                bucket_type: true
            };

            const cartItems = await Cart.find(query)
                .populate("product_id")
                .lean();

            const total = cartItems.reduce((acc, item) => {
                const price = Number(item.price) || 0;
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
            const carts = await Cart.find();
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
            const { temp_id } = req.params; // value can be temp_id or user_id

            if (!temp_id) {
                return res.status(400).send({
                    success: false,
                    message: "temp_id or user_id is required",
                });
            }

            const mongoose = require("mongoose");
            const isObjectId = mongoose.Types.ObjectId.isValid(temp_id);

            // Query base condition  
            const query = isObjectId
                ? { user_id: temp_id }   // logged-in user
                : { temp_id: temp_id };  // guest user

            // 👉 IMPORTANT: Add bucket_type filter (must be true)
            query.bucket_type = true;

            // Count only items with bucket_type true
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

// Update Quantity
const updateQuantity = {
    handler: async (req, res) => {
        try {
            const userId = req.user.id || req.user._id;
            const { productId, quantity } = req.body;

            if (!productId || quantity == null) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'Product ID and quantity are required');
            }

            const cart = await Cart.findOne({ userId });
            if (!cart) throw new ApiError(httpStatus.NOT_FOUND, 'Cart not found');

            const itemIndex = cart.items.findIndex(
                item => item.productId?.toString() === String(productId)
            );

            if (itemIndex === -1) {
                throw new ApiError(httpStatus.NOT_FOUND, 'Product not found in cart');
            }

            cart.items[itemIndex].quantity = quantity;
            await cart.save();

            res.status(200).json({
                status: 'success',
                message: 'Cart updated successfully',
                cart
            });
        } catch (error) {
            console.error('Update quantity error:', error);
            res.status(error.statusCode || 500).json({
                status: 'error',
                message: error.message || 'Server error'
            });
        }
    },
};

// Remove Product from Cart
const deleteCartItem = {
    handler: async (req, res) => {
        try {
            const userId = req.user.id || req.user._id;
            const { productId } = req.params;

            const cart = await Cart.findOne({ userId });
            if (!cart) throw new ApiError(httpStatus.NOT_FOUND, 'Cart not found');

            cart.items = cart.items.filter(
                item => item.productId.toString() !== productId
            );

            await cart.save();

            res.status(200).json({ status: 'success', message: 'Product removed from cart', cart });
        } catch (error) {
            res.status(500).json({ message: 'Server error', error });
        }
    },
};

// Clear Entire Cart
const removeCart = {
    handler: async (req, res) => {
        try {
            const id = req.params.id;

            const deletedItem = await Cart.findByIdAndDelete(id);

            if (!deletedItem) {
                return res.status(404).json({
                    success: false,
                    message: "Record not found!"
                });
            }

            res.json({
                success: true,
                message: "Record deleted successfully!",
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

module.exports = {
    addToCart,
    getCheckoutPageTempId,
    getCart,
    getAllCart,
    getCartCount,
    updateQuantity,
    deleteCartItem,
    removeCart,
};
