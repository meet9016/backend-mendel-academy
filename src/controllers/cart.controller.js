const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { Cart, Product } = require('../models');
const Joi = require('joi');

// Add to Cart
const addToCart = {
  validation: {
    body: Joi.object().keys({
      category_name: Joi.string().trim().required(),
      price: Joi.number().required(),
      quantity: Joi.number().default(1),
      duration: Joi.string().allow(null, ''),
    }),
  },

  handler: async (req, res) => {
    try {
      const { category_name } = req.body;

      // Check if item with same category already exists
      const existingItem = await Cart.findOne({ category_name });

      if (existingItem) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json({ message: 'Item already exists in cart' });
      }

      // Create new cart item
      const item = await Cart.create(req.body);

      return res.status(httpStatus.CREATED).json({
        message: 'Item added to cart successfully',
        data: item,
      });
    } catch (error) {
      console.error('Error creating cart item:', error);
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: error.message });
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
