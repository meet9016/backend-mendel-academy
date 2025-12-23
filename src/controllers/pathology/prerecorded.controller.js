const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const Joi = require('joi');
const { PreRecord } = require('../../models');
const { handlePagination } = require('../../utils/helper');
const { getLiveRates } = require('../../utils/exchangeRates.js');
const axios = require('axios');

// Helper function to get user's country and currency
async function getCurrencyFromCountryCode(countryCode) {
    try {
        const { data } = await axios.get(
            `https://restcountries.com/v3.1/alpha/${countryCode}`
        );

        const currencies = data[0].currencies;
        const currencyCode = Object.keys(currencies)[0];

        return currencyCode;
    } catch (err) {
        console.error("Currency lookup failed:", err);
        return "USD";
    }
}

const getUserCountryCode = async (ip) => {
    try {
        // ✅ Handle localhost/development environment
        if (!ip || ip === '::1' || ip === '127.0.0.1' || ip === 'localhost' || ip.includes('::ffff:127.0.0.1')) {
            console.log('⚠️ Development environment detected. Using default India (IN) for testing.');
            // 🔧 CHANGE THIS TO 'US' if you want to test USD in development
            return {
                country: "India",
                countryCode: "IN",
                currency: "INR"
            };
        }

        const response = await axios.get(`http://ip-api.com/json/${ip}`);
        const countryCode = response.data.countryCode;

        console.log(`✅ Detected IP: ${ip}, Country: ${response.data.country}, Code: ${countryCode}`);

        const currency = await getCurrencyFromCountryCode(countryCode);

        return {
            country: response.data.country,
            countryCode,
            currency
        };

    } catch (err) {
        console.error('❌ IP detection error:', err.message);
        // Default to India for errors (you can change to US if preferred)
        return { country: "India", countryCode: "IN", currency: "INR" };
    }
};

// ✅ Helper to determine display currency
const getDisplayCurrency = (countryCode) => {
    return countryCode === 'IN' ? 'INR' : 'USD';
};

// ✅ Helper to get price based on currency
const getPriceForCurrency = (priceUsd, priceInr, currency) => {
    return currency === 'INR' ? priceInr : priceUsd;
};

// Validation schema for options
const optionSchema = Joi.object({
    type: Joi.string().valid('record-book', 'video', 'writing-book').required(),
    description: Joi.string().required(),
    price_usd: Joi.number().required(),
    price_inr: Joi.number().required(),
    features: Joi.array().items(Joi.string()).min(1).required(),
    is_available: Joi.boolean().default(true)
});

const createPreRecorded = {
    validation: {
        body: Joi.object().keys({
            title: Joi.string().trim().required(),
            category: Joi.string().allow('', null).optional(),
            total_reviews: Joi.number().allow(null).optional(),
            subtitle: Joi.string().allow('', null).optional(),
            vimeo_video_id: Joi.string().trim().required(),
            rating: Joi.number().allow(null).optional(),
            duration: Joi.string().trim().required(),
            description: Joi.string().trim().required(),
            date: Joi.date().required(),
            status: Joi.string().valid('Active', 'Inactive').default('Active'),
            options: Joi.array().items(optionSchema).min(1).required()
        }),
    },
    handler: async (req, res) => {
        try {
            if (!req.body.options || !Array.isArray(req.body.options) || req.body.options.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "At least one option is required"
                });
            }

            req.body.options = req.body.options.map((option, index) => {
                if (!option.type || !option.description) {
                    throw new Error(`Option ${index} is missing required fields (type or description)`);
                }

                if (!option.price_usd || !option.price_inr) {
                    throw new Error(`Option ${index} must have both USD and INR prices`);
                }

                if (!Array.isArray(option.features)) {
                    option.features = [];
                } else {
                    option.features = option.features.filter(f => f && f.trim());
                }

                if (option.features.length === 0) {
                    throw new Error(`Option ${index} must have at least one feature`);
                }

                return {
                    type: option.type,
                    description: option.description,
                    price_usd: typeof option.price_usd === 'string' ? parseFloat(option.price_usd) : option.price_usd,
                    price_inr: typeof option.price_inr === 'string' ? parseFloat(option.price_inr) : option.price_inr,
                    features: option.features,
                    is_available: option.is_available !== undefined ? option.is_available : true
                };
            });

            const minPriceUSD = Math.min(...req.body.options.map(opt => opt.price_usd));
            const minPriceINR = Math.min(...req.body.options.map(opt => opt.price_inr));

            req.body.price_usd = minPriceUSD;
            req.body.price_inr = minPriceINR;

            const pre_recorded = await PreRecord.create(req.body);

            return res.status(201).json({
                success: true,
                message: "Pre recorded created successfully!",
                data: pre_recorded
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message || "Failed to create Pre Recorded",
                error: error.message
            });
        }
    }
}

const getAllPreRecorded = {
    handler: async (req, res) => {
        try {
            const { status, search } = req.query;

            const ip =
                req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
                req.socket.remoteAddress;

            console.log('🔍 Incoming IP:', ip);

            const user = await getUserCountryCode(ip);

            console.log('🌍 User Location:', user);

            // ✅ Determine display currency based on country
            const displayCurrency = getDisplayCurrency(user.countryCode);

            console.log('💰 Display Currency:', displayCurrency);

            const query = {};

            if (status) query.status = status;
            if (search) query.title = { $regex: search, $options: "i" };

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            const totalRecords = await PreRecord.countDocuments(query);
            const data = await PreRecord.find(query)
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 });

            // ✅ Convert prices for each record
            const convertedData = data.map(record => {
                const recordObj = record.toObject();

                const displayPrice = getPriceForCurrency(
                    recordObj.price_usd,
                    recordObj.price_inr,
                    displayCurrency
                );

                const convertedOptions = recordObj.options.map(option => {
                    const optionPrice = getPriceForCurrency(
                        option.price_usd,
                        option.price_inr,
                        displayCurrency
                    );

                    return {
                        type: option.type,
                        description: option.description,
                        price: optionPrice,
                        features: option.features,
                        is_available: option.is_available
                    };
                });

                return {
                    ...recordObj,
                    price: displayPrice,
                    currency: displayCurrency,
                    user_country: user.country,
                    options: convertedOptions
                };
            });

            res.status(200).json({
                success: true,
                data: convertedData,
                currency: displayCurrency, // ✅ Added for frontend reference
                pagination: {
                    page,
                    limit,
                    totalRecords,
                    totalPages: Math.ceil(totalRecords / limit)
                }
            });

        } catch (error) {
            console.error('❌ Error in getAllPreRecorded:', error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to fetch pre-recorded courses"
            });
        }
    }
}

const getPreRecordedById = {
    handler: async (req, res) => {
        try {
            const { _id } = req.params;

            if (!_id.match(/^[0-9a-fA-F]{24}$/)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid ID format"
                });
            }

            const ip =
                req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
                req.socket.remoteAddress;

            console.log('🔍 Incoming IP (getById):', ip);

            const user = await getUserCountryCode(ip);

            console.log('🌍 User Location (getById):', user);

            // ✅ Determine display currency based on country
            const displayCurrency = getDisplayCurrency(user.countryCode);

            console.log('💰 Display Currency (getById):', displayCurrency);

            const pre_recorded = await PreRecord.findById(_id);

            if (!pre_recorded) {
                return res.status(404).json({
                    success: false,
                    message: "PreRecorded not found"
                });
            }

            const recordObj = pre_recorded.toObject();

            const displayPrice = getPriceForCurrency(
                recordObj.price_usd,
                recordObj.price_inr,
                displayCurrency
            );

            const convertedOptions = recordObj.options.map(option => {
                const optionPrice = getPriceForCurrency(
                    option.price_usd,
                    option.price_inr,
                    displayCurrency
                );

                return {
                    type: option.type,
                    description: option.description,
                    price: optionPrice,
                    features: option.features,
                    is_available: option.is_available
                };
            });

            res.status(200).json({
                success: true,
                data: {
                    ...recordObj,
                    price: displayPrice,
                    currency: displayCurrency,
                    user_country: user.country,
                    user_currency: displayCurrency,
                    options: convertedOptions
                }
            });
        } catch (error) {
            console.error('❌ Error in getPreRecordedById:', error);
            res.status(500).json({
                success: false,
                message: "Internal Server Error",
                error: error.message
            });
        }
    }
};

const updatePreRecorded = {
    validation: {
        body: Joi.object().keys({
            title: Joi.string().trim().optional(),
            category: Joi.string().allow('', null).optional(),
            total_reviews: Joi.number().allow(null).optional(),
            subtitle: Joi.string().allow('', null).optional(),
            vimeo_video_id: Joi.string().trim().optional(),
            rating: Joi.number().allow(null).optional(),
            duration: Joi.string().trim().optional(),
            description: Joi.string().trim().optional(),
            date: Joi.date().optional(),
            status: Joi.string().valid('Active', 'Inactive').optional(),
            options: Joi.array().items(optionSchema).optional()
        }),
    },
    handler: async (req, res) => {
        try {
            const { _id } = req.params;

            const preRecordExist = await PreRecord.findById(_id);

            if (!preRecordExist) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'PreRecord does not exist');
            }

            if (req.body?.title && req.body.title !== preRecordExist.title) {
                const titleExist = await PreRecord.findOne({
                    title: req.body.title,
                    _id: { $ne: _id }
                });
                if (titleExist) {
                    throw new ApiError(httpStatus.BAD_REQUEST, 'PreRecord with this title already exists');
                }
            }

            if (req.body.options && Array.isArray(req.body.options)) {
                if (req.body.options.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: "At least one option is required"
                    });
                }

                req.body.options = req.body.options.map((option, index) => {
                    if (!option.price_usd || !option.price_inr) {
                        throw new Error(`Option ${index} must have both USD and INR prices`);
                    }

                    const features = Array.isArray(option.features)
                        ? option.features.filter(f => f && f.trim())
                        : [];

                    if (features.length === 0) {
                        throw new Error(`Option ${index} must have at least one feature`);
                    }

                    return {
                        type: option.type,
                        description: option.description,
                        price_usd: typeof option.price_usd === 'string' ? parseFloat(option.price_usd) : option.price_usd,
                        price_inr: typeof option.price_inr === 'string' ? parseFloat(option.price_inr) : option.price_inr,
                        features: features,
                        is_available: option.is_available !== undefined ? option.is_available : true
                    };
                });

                const minPriceUSD = Math.min(...req.body.options.map(opt => opt.price_usd));
                const minPriceINR = Math.min(...req.body.options.map(opt => opt.price_inr));

                req.body.price_usd = minPriceUSD;
                req.body.price_inr = minPriceINR;
            }

            const preRecord = await PreRecord.findByIdAndUpdate(
                _id,
                req.body,
                { new: true, runValidators: true }
            );

            res.send({
                success: true,
                message: "Pre record updated successfully!",
                data: preRecord
            });
        } catch (error) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Failed to update Pre Recorded"
            });
        }
    }
}

const deletePreRecorded = {
    handler: async (req, res) => {
        try {
            const { _id } = req.params;

            const preRecordExist = await PreRecord.findById(_id);

            if (!preRecordExist) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'PreRecord does not exist');
            }

            await PreRecord.findByIdAndDelete(_id);

            res.send({
                success: true,
                message: 'PreRecord deleted successfully'
            });
        } catch (error) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Failed to delete Pre Recorded"
            });
        }
    }
}

const toggleOptionAvailability = {
    validation: {
        body: Joi.object().keys({
            option_type: Joi.string().valid('record-book', 'video', 'writing-book').required(),
            is_available: Joi.boolean().required()
        })
    },
    handler: async (req, res) => {
        try {
            const { _id } = req.params;
            const { option_type, is_available } = req.body;

            const preRecord = await PreRecord.findById(_id);

            if (!preRecord) {
                throw new ApiError(httpStatus.NOT_FOUND, 'PreRecord not found');
            }

            const optionIndex = preRecord.options.findIndex(opt => opt.type === option_type);

            if (optionIndex === -1) {
                throw new ApiError(httpStatus.NOT_FOUND, 'Option not found');
            }

            preRecord.options[optionIndex].is_available = is_available;
            await preRecord.save();

            res.send({
                success: true,
                message: `Option ${is_available ? 'enabled' : 'disabled'} successfully!`,
                data: preRecord
            });
        } catch (error) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Failed to toggle option"
            });
        }
    }
};

module.exports = {
    createPreRecorded,
    getAllPreRecorded,
    getPreRecordedById,
    updatePreRecorded,
    deletePreRecorded,
    toggleOptionAvailability
};