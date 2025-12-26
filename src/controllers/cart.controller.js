const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { Cart, PreRecord, ExamCategory } = require('../models');
const Joi = require('joi');
const mongoose = require("mongoose");
const axios = require('axios');

const getUserCountryCode = async (ip) => {
    try {
        if (!ip || ip === '::1' || ip === '127.0.0.1' || ip === 'localhost' || ip.includes('::ffff:127.0.0.1')) {
            return 'IN';
        }

        const response = await axios.get(`http://ip-api.com/json/${ip}`);
        return response.data.countryCode || 'US';
    } catch (err) {
        return 'IN';
    }
};

const getDisplayCurrency = (countryCode) => {
    return countryCode === 'IN' ? 'INR' : 'USD';
};

const getPriceForCurrency = (priceUsd, priceInr, currency) => {
    return currency === 'INR' ? priceInr : priceUsd;
};

// ✅ EXISTING: Add PreRecord product to cart
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

            const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress;
            const countryCode = await getUserCountryCode(ip);
            const displayCurrency = getDisplayCurrency(countryCode);

            const product = await PreRecord.findById(product_id);
            if (!product) {
                return res.status(404).send({
                    success: false,
                    message: "Product not found",
                });
            }

            let total_price = 0;
            for (const optionType of selected_options) {
                const option = product.options.find(o => o.type === optionType);
                if (option && option.is_available) {
                    const optionPrice = getPriceForCurrency(
                        option.price_usd,
                        option.price_inr,
                        displayCurrency
                    );
                    total_price += optionPrice;
                } else {
                    return res.status(400).send({
                        success: false,
                        message: `Option ${optionType} is not available`,
                    });
                }
            }

            const query = {
                product_id,
                cart_type: 'prerecord',
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
                cartItem.currency = displayCurrency;
                await cartItem.save();
            } else {
                cartItem = await Cart.create({
                    temp_id: user_id ? null : temp_id,
                    user_id: user_id || null,
                    cart_type: 'prerecord',
                    product_id,
                    selected_options,
                    category_name,
                    total_price,
                    currency: displayCurrency,
                    duration,
                    bucket_type: true,
                    quantity: 1
                });
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

// ✅ FIXED: Add Exam Plan to cart with correct duration handling
const addExamPlanToCart = {
    validation: {
        body: Joi.object().keys({
            temp_id: Joi.string(),
            user_id: Joi.string(),
            exam_category_id: Joi.string().required(),
            plan_id: Joi.string().required(),
            bucket_type: Joi.boolean(),
        }),
    },

    handler: async (req, res) => {
        try {
            const { temp_id, user_id, exam_category_id, plan_id } = req.body;

            const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress;
            const countryCode = await getUserCountryCode(ip);
            const displayCurrency = getDisplayCurrency(countryCode);

            // Fetch exam category
            const examCategory = await ExamCategory.findById(exam_category_id);
            if (!examCategory) {
                return res.status(404).send({
                    success: false,
                    message: "Exam category not found",
                });
            }

            // Find the specific plan
            const plan = examCategory.choose_plan_list.id(plan_id);
            if (!plan) {
                return res.status(404).send({
                    success: false,
                    message: "Plan not found",
                });
            }

            // ✅ CRITICAL FIX: Extract duration properly from plan_day or plan_month
            // Convert to number and ensure it's valid
            const durationValue = Number(plan.plan_month || plan.plan_day || 0);

            console.log('Plan duration extraction:', {
                plan_month: plan.plan_month,
                plan_day: plan.plan_day,
                final_duration: durationValue
            });

            // Calculate price based on currency
            const total_price = getPriceForCurrency(
                plan.plan_pricing_dollar,
                plan.plan_pricing_inr,
                displayCurrency
            );

            const query = {
                exam_category_id,
                plan_id,
                cart_type: 'exam_plan',
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
                // ✅ Update existing cart item with ALL fields
                cartItem.total_price = total_price;
                cartItem.currency = displayCurrency;
                cartItem.duration = String(durationValue); // Store as plain number string
                cartItem.plan_details = {
                    plan_type: plan.plan_type,
                    plan_month: durationValue, // ✅ Store the numeric value
                    plan_pricing_dollar: plan.plan_pricing_dollar,
                    plan_pricing_inr: plan.plan_pricing_inr,
                    plan_sub_title: plan.plan_sub_title,
                };
                await cartItem.save();

                console.log('Updated cart item:', {
                    duration: cartItem.duration,
                    plan_month: cartItem.plan_details.plan_month
                });
            } else {
                // ✅ Create new cart item with ALL fields properly set
                cartItem = await Cart.create({
                    temp_id: user_id ? null : temp_id,
                    user_id: user_id || null,
                    cart_type: 'exam_plan',
                    exam_category_id,
                    plan_id,
                    plan_details: {
                        plan_type: plan.plan_type,
                        plan_month: durationValue, // ✅ Store the numeric value
                        plan_pricing_dollar: plan.plan_pricing_dollar,
                        plan_pricing_inr: plan.plan_pricing_inr,
                        plan_sub_title: plan.plan_sub_title,
                    },
                    category_name: examCategory.category_name,
                    total_price,
                    currency: displayCurrency,
                    duration: String(durationValue), // ✅ Store as plain number string
                    bucket_type: true,
                    quantity: 1
                });

                console.log('Created cart item:', {
                    duration: cartItem.duration,
                    plan_month: cartItem.plan_details.plan_month
                });
            }

            const countQuery = user_id
                ? { user_id, bucket_type: true }
                : { temp_id, bucket_type: true };
            const totalItems = await Cart.countDocuments(countQuery);

            return res.status(200).send({
                success: true,
                message: cartItem.isNew ? "Plan added to cart successfully" : "Cart updated successfully",
                cart: cartItem,
                count: totalItems,
            });

        } catch (error) {
            console.error('Error in addExamPlanToCart:', error);

            if (error.code === 11000) {
                return res.status(409).send({
                    success: false,
                    message: "This plan is already in your cart",
                });
            }

            return res.status(500).send({
                success: false,
                message: error.message,
            });
        }
    },
};

// ✅ UPDATED: Get all cart items (both types)
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

            const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress;
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
                .populate("exam_category_id")
                .lean();

            const convertedCart = cartItems.map(item => {
                // Handle currency conversion if needed
                if (item.currency === displayCurrency) {
                    return item;
                }

                let total_price = 0;

                // Convert PreRecord product prices
                if (item.cart_type === 'prerecord' && item.product_id && item.product_id.options) {
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

                // Convert Exam Plan prices
                if (item.cart_type === 'exam_plan' && item.plan_details) {
                    total_price = getPriceForCurrency(
                        item.plan_details.plan_pricing_dollar,
                        item.plan_details.plan_pricing_inr,
                        displayCurrency
                    );
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

            return res.status(200).send({
                success: true,
                message: "Cart fetched successfully",
                cart: convertedCart,
                total,
                currency: displayCurrency
            });

        } catch (error) {
            return res.status(500).send({
                success: false,
                message: error.message,
            });
        }
    },
};

// ✅ UPDATED: Get checkout page data (both types)
const getCheckoutPageTempId = {
    handler: async (req, res) => {
        try {
            const { temp_id } = req.params;
            const isObjectId = mongoose.Types.ObjectId.isValid(temp_id);

            const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress;
            const countryCode = await getUserCountryCode(ip);
            const displayCurrency = getDisplayCurrency(countryCode);

            let data = [];

            if (isObjectId) {
                data = await Cart.find({ user_id: temp_id, bucket_type: true })
                    .populate('product_id')
                    .populate('exam_category_id');
            }

            if (data.length === 0) {
                data = await Cart.find({ temp_id, bucket_type: true })
                    .populate('product_id')
                    .populate('exam_category_id');
            }

            if (data.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "No cart found"
                });
            }

            const convertedData = data.map(item => {
                const itemObj = item.toObject();

                if (itemObj.currency === displayCurrency) {
                    return itemObj;
                }

                let total_price = 0;

                // Convert PreRecord prices
                if (itemObj.cart_type === 'prerecord' && itemObj.product_id && itemObj.product_id.options) {
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

                // Convert Exam Plan prices
                if (itemObj.cart_type === 'exam_plan' && itemObj.plan_details) {
                    total_price = getPriceForCurrency(
                        itemObj.plan_details.plan_pricing_dollar,
                        itemObj.plan_details.plan_pricing_inr,
                        displayCurrency
                    );
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

            return res.status(200).json({
                success: true,
                data: convertedData,
                totalAmount,
                currency: displayCurrency
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

// ✅ Existing methods remain the same
const getAllCart = {
    handler: async (req, res) => {
        try {
            const carts = await Cart.find()
                .populate('product_id')
                .populate('exam_category_id');
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
};

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

            const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress;
            const countryCode = await getUserCountryCode(ip);
            const displayCurrency = getDisplayCurrency(countryCode);

            const cartItem = await Cart.findById(cart_id).populate('product_id');

            if (!cartItem) {
                return res.status(404).json({
                    success: false,
                    message: "Cart item not found!"
                });
            }

            if (cartItem.cart_type !== 'prerecord') {
                return res.status(400).json({
                    success: false,
                    message: "This operation is only for PreRecord products"
                });
            }

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

            const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress;
            const countryCode = await getUserCountryCode(ip);
            const displayCurrency = getDisplayCurrency(countryCode);

            const cartItem = await Cart.findById(cart_id).populate('product_id');

            if (!cartItem) {
                return res.status(404).json({
                    success: false,
                    message: "Cart item not found!"
                });
            }

            if (cartItem.cart_type !== 'prerecord') {
                return res.status(400).json({
                    success: false,
                    message: "This operation is only for PreRecord products"
                });
            }

            cartItem.selected_options = cartItem.selected_options.filter(
                opt => opt !== option_type
            );

            if (cartItem.selected_options.length === 0) {
                await Cart.findByIdAndDelete(cart_id);
                return res.json({
                    success: true,
                    message: "Last option removed, cart item deleted!",
                    data: null,
                    deleted: true
                });
            }

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

            cartItem.total_price = total_price;
            cartItem.currency = displayCurrency;
            await cartItem.save();

            res.json({
                success: true,
                message: "Option removed from cart successfully!",
                data: cartItem,
                deleted: false
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
    addExamPlanToCart,
    getCheckoutPageTempId,
    getCart,
    getAllCart,
    getCartCount,
    updateQuantity,
    removeCart,
    updateCartOptions,
    removeCartOption,
};