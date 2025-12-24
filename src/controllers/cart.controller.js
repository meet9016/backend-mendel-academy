const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { Cart, PreRecord } = require('../models');
const Joi = require('joi');
const mongoose = require("mongoose");
const axios = require('axios');

// ✅ Helper to get user's country from IP
const getUserCountryCode = async (ip) => {
    try {
        // ✅ Handle localhost/development environment
        if (!ip || ip === '::1' || ip === '127.0.0.1' || ip === 'localhost' || ip.includes('::ffff:127.0.0.1')) {
            console.log('⚠️ Development environment detected (Cart). Using default India (IN) for testing.');
            // 🔧 CHANGE THIS TO 'US' if you want to test USD in development
            return 'IN';
        }

        const response = await axios.get(`http://ip-api.com/json/${ip}`);
        const countryCode = response.data.countryCode || 'US';

        console.log(`✅ Cart - Detected IP: ${ip}, Country Code: ${countryCode}`);

        return countryCode;
    } catch (err) {
        console.error('❌ Cart IP detection error:', err.message);
        // Default to India for errors (you can change to US if preferred)
        return 'IN';
    }
};

// ✅ Helper to determine display currency
const getDisplayCurrency = (countryCode) => {
    const currency = countryCode === 'IN' ? 'INR' : 'USD';
    console.log(`💰 Cart - Display Currency for ${countryCode}: ${currency}`);
    return currency;
};

// ✅ Helper to get price based on currency
const getPriceForCurrency = (priceUsd, priceInr, currency) => {
    return currency === 'INR' ? priceInr : priceUsd;
};

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

            // ✅ Get user's country to determine currency
            const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress;

            console.log('🔍 Cart - Add to Cart IP:', ip);

            const countryCode = await getUserCountryCode(ip);
            const displayCurrency = getDisplayCurrency(countryCode);

            console.log(`💳 Cart - Adding product with currency: ${displayCurrency}`);

            // ✅ Get product details
            const product = await PreRecord.findById(product_id);
            if (!product) {
                return res.status(404).send({
                    success: false,
                    message: "Product not found",
                });
            }

            // ✅ Calculate total price based on user's currency
            let total_price = 0;
            for (const optionType of selected_options) {
                const option = product.options.find(o => o.type === optionType);
                if (option && option.is_available) {
                    const optionPrice = getPriceForCurrency(
                        option.price_usd,
                        option.price_inr,
                        displayCurrency
                    );
                    console.log(`  Option ${optionType}: ${displayCurrency} ${optionPrice} (USD: ${option.price_usd}, INR: ${option.price_inr})`);
                    total_price += optionPrice;
                } else {
                    return res.status(400).send({
                        success: false,
                        message: `Option ${optionType} is not available`,
                    });
                }
            }

            console.log(`  Total Price: ${displayCurrency} ${total_price}`);

            const query = {
                product_id,
                bucket_type: true
            };

            if (user_id) {
                query.user_id = user_id;
                query.temp_id = null;
            } else if (temp_id) {
                query.temp_id = temp_id;
                query.user_id = null;
            } else {
                return res.status(400).send({
                    success: false,
                    message: "Either temp_id or user_id is required",
                });
            }

            let cartItem = await Cart.findOne(query);

            if (cartItem) {
                cartItem.selected_options = selected_options;
                cartItem.total_price = total_price;
                cartItem.currency = displayCurrency; // ✅ Store currency
                await cartItem.save();
                console.log('✅ Cart updated successfully');
            } else {
                cartItem = await Cart.create({
                    temp_id: user_id ? null : temp_id,
                    user_id: user_id || null,
                    product_id,
                    selected_options,
                    category_name,
                    total_price,
                    currency: displayCurrency, // ✅ Store currency
                    duration,
                    bucket_type: true,
                    quantity: 1
                });
                console.log('✅ Cart item created successfully');
            }

            const countQuery = user_id
                ? { user_id, bucket_type: true }
                : { temp_id, bucket_type: true };
            const totalItems = await Cart.countDocuments(countQuery);

            return res.status(200).send({
                success: true,
                message: cartItem.isNew ? "Product added to cart successfully" : "Cart updated successfully",
                cart: cartItem,
                count: totalItems,
            });

        } catch (error) {
            console.error('❌ Add to cart error:', error);

            if (error.code === 11000) {
                return res.status(409).send({
                    success: false,
                    message: "This product is already in your cart",
                });
            }

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

            // ✅ Get user's country to determine currency
            const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress;

            console.log('🔍 Cart - Checkout IP:', ip);

            const countryCode = await getUserCountryCode(ip);
            const displayCurrency = getDisplayCurrency(countryCode);

            let data = [];

            data = await Cart.find({ temp_id, bucket_type: true })
                .populate('product_id');

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

            // ✅ Convert prices to user's currency
            const convertedData = data.map(item => {
                const itemObj = item.toObject();

                // If cart has stored currency and it matches display currency, use stored price
                // Otherwise recalculate from product
                if (itemObj.currency === displayCurrency) {
                    console.log(`  ✓ Cart item already in ${displayCurrency}`);
                    return itemObj;
                }

                console.log(`  ⚠️ Converting cart item from ${itemObj.currency} to ${displayCurrency}`);

                // Recalculate price in correct currency
                let total_price = 0;
                if (itemObj.product_id && itemObj.product_id.options) {
                    for (const optionType of itemObj.selected_options) {
                        const option = itemObj.product_id.options.find(o => o.type === optionType);
                        if (option) {
                            total_price += getPriceForCurrency(
                                option.price_usd,
                                option.price_inr,
                                displayCurrency
                            );
                        }
                    }
                }

                return {
                    ...itemObj,
                    total_price,
                    currency: displayCurrency
                };
            });

            const totalAmount = convertedData.reduce((sum, item) => {
                return sum + (item.total_price * item.quantity);
            }, 0);

            console.log(`💰 Checkout Total: ${displayCurrency} ${totalAmount}`);

            return res.status(200).json({
                success: true,
                data: convertedData,
                totalAmount,
                currency: displayCurrency
            });

        } catch (error) {
            console.error('❌ Checkout error:', error);
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

            // ✅ Get user's country to determine currency
            const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress;

            console.log('🔍 Cart - Get Cart IP:', ip);

            const countryCode = await getUserCountryCode(ip);
            const displayCurrency = getDisplayCurrency(countryCode);

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

            console.log(`📦 Found ${cartItems.length} cart items`);

            // ✅ Convert prices to user's currency
            const convertedCart = cartItems.map((item, index) => {
                if (item.currency === displayCurrency) {
                    console.log(`  ✓ Item ${index + 1}: Already in ${displayCurrency}`);
                    return item;
                }

                console.log(`  ⚠️ Item ${index + 1}: Converting from ${item.currency || 'unknown'} to ${displayCurrency}`);

                // Recalculate price in correct currency
                let total_price = 0;
                if (item.product_id && item.product_id.options) {
                    for (const optionType of item.selected_options) {
                        const option = item.product_id.options.find(o => o.type === optionType);
                        if (option) {
                            total_price += getPriceForCurrency(
                                option.price_usd,
                                option.price_inr,
                                displayCurrency
                            );
                        }
                    }
                }

                return {
                    ...item,
                    total_price,
                    currency: displayCurrency
                };
            });

            const total = convertedCart.reduce((acc, item) => {
                const price = Number(item.total_price) || 0;
                const qty = Number(item.quantity) || 0;
                return acc + price * qty;
            }, 0);

            console.log(`💰 Cart Total: ${displayCurrency} ${total}`);

            return res.status(200).send({
                success: true,
                message: "Cart fetched successfully",
                cart: convertedCart,
                total,
                currency: displayCurrency
            });

        } catch (error) {
            console.error('❌ Get cart error:', error);
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

            // ✅ Get user's country to determine currency
            const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress;

            console.log('🔍 Cart - Update Options IP:', ip);

            const countryCode = await getUserCountryCode(ip);
            const displayCurrency = getDisplayCurrency(countryCode);

            const cartItem = await Cart.findById(cart_id).populate('product_id');

            if (!cartItem) {
                return res.status(404).json({
                    success: false,
                    message: "Cart item not found!"
                });
            }

            // Calculate new total price in user's currency
            let total_price = 0;
            for (const optionType of selected_options) {
                const option = cartItem.product_id.options.find(o => o.type === optionType);
                if (option && option.is_available) {
                    total_price += getPriceForCurrency(
                        option.price_usd,
                        option.price_inr,
                        displayCurrency
                    );
                } else {
                    return res.status(400).json({
                        success: false,
                        message: `Option ${optionType} is not available`
                    });
                }
            }

            console.log(`💰 Updated cart total: ${displayCurrency} ${total_price}`);

            cartItem.selected_options = selected_options;
            cartItem.total_price = total_price;
            cartItem.currency = displayCurrency;
            await cartItem.save();

            res.json({
                success: true,
                message: "Cart options updated successfully!",
                data: cartItem
            });
        } catch (error) {
            console.error('❌ Update cart options error:', error);
            res.status(500).json({
                success: false,
                message: "Server error",
                error: error.message
            });
        }
    }
};

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

            // ✅ Get user's country to determine currency
            const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress;

            console.log('🔍 Cart - Remove Option IP:', ip);

            const countryCode = await getUserCountryCode(ip);
            const displayCurrency = getDisplayCurrency(countryCode);

            const cartItem = await Cart.findById(cart_id).populate('product_id');

            if (!cartItem) {
                return res.status(404).json({
                    success: false,
                    message: "Cart item not found!"
                });
            }

            cartItem.selected_options = cartItem.selected_options.filter(
                opt => opt !== option_type
            );

            if (cartItem.selected_options.length === 0) {
                await Cart.findByIdAndDelete(cart_id);
                console.log('🗑️ Last option removed, cart item deleted');
                return res.json({
                    success: true,
                    message: "Last option removed, cart item deleted!",
                    data: null
                });
            }

            // Recalculate total price in user's currency
            let total_price = 0;
            for (const optType of cartItem.selected_options) {
                const option = cartItem.product_id.options.find(o => o.type === optType);
                if (option && option.is_available) {
                    total_price += getPriceForCurrency(
                        option.price_usd,
                        option.price_inr,
                        displayCurrency
                    );
                }
            }

            console.log(`💰 Updated cart total after removal: ${displayCurrency} ${total_price}`);

            cartItem.total_price = total_price;
            cartItem.currency = displayCurrency;
            await cartItem.save();

            res.json({
                success: true,
                message: "Option removed from cart successfully!",
                data: cartItem
            });
        } catch (error) {
            console.error('❌ Remove cart option error:', error);
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