const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { Cart, Product } = require('../models');

// Add to Cart
const addToCart = {
    handler: async (req, res) => {
        try {
            const userId = req.user.id || req.user._id;
            const { productId, quantity } = req.body;

            if (!productId || !quantity) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'Product ID and quantity are required');
            }

            const product = await Product.findById(productId);
            if (!product) throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');

            let cart = await Cart.findOne({ userId });
            if (!cart) cart = new Cart({ userId, items: [] });

            const existingItemIndex = cart.items.findIndex(
                item => item.productId.toString() === productId
            );

            if (existingItemIndex > -1) {
                cart.items[existingItemIndex].quantity += quantity;
            } else {
                cart.items.push({ productId, quantity, price: product.price });
            }

            await cart.save();

            const totalAmount = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

            res.status(200).json({
                status: 'success',
                message: 'Item added to cart successfully',
                totalAmount,
                cart,
            });
        } catch (error) {
            console.error('Add to cart error:', error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },
};

// Get User Cart
const getCart = {
    handler: async (req, res) => {
        try {
            const userId = req.user.id || req.user._id;
            const cart = await Cart.findOne({ userId }).populate('items.productId');

            if (!cart) return res.status(200).json({ message: 'Cart is empty', items: [] });

            const totalAmount = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

            res.status(200).json({ status: 'success', totalAmount, cart });
        } catch (error) {
            res.status(500).json({ message: 'Server error', error });
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
const clearCart = {
    handler: async (req, res) => {
        try {
            const userId = req.user.id || req.user._id;

            if (!userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            const cart = await Cart.findOne({ userId });

            if (!cart) {
                return res.status(404).json({ message: 'Cart not found' });
            }

            cart.items = [];
            await cart.save();

            res.status(200).json({
                status: 'success',
                message: 'Cart cleared successfully',
                cart,
            });
        } catch (error) {
            console.error('Clear cart error:', error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },
};

module.exports = {
    addToCart,
    getCart,
    updateQuantity,
    deleteCartItem,
    clearCart,
};
