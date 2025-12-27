const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const Joi = require('joi');
const { HyperSpecialist } = require('../../models');
const { handlePagination } = require('../../utils/helper');
const axios = require('axios');

// ✅ IP-based currency detection (same as cart controller)
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

const createHyperSpecialist = {
    validation: {
        body: Joi.object().keys({
            title: Joi.string().trim().required(),
            description: Joi.string().trim().required(),
            tags: Joi.array().items(Joi.string().trim()).optional(),
            price_dollar: Joi.number().required(),
            price_inr: Joi.number().required(),
        })
    },
    handler: async (req, res) => {
        try {
            const course = await HyperSpecialist.create(req.body);

            return res.status(201).json({
                success: true,
                message: "HyperSpecialist created successfully!",
                data: course,
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: "Failed to create HyperSpecialist",
                error: error.message,
            });
        }
    }
}

// ✅ ENHANCED: Get all with currency detection
const getAllHyperSpecialist = {
    handler: async (req, res) => {
        try {
            const { status, search, page = 1, limit = 10 } = req.query;

            // Get user's IP and determine currency
            const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress;
            const countryCode = await getUserCountryCode(ip);
            const displayCurrency = getDisplayCurrency(countryCode);

            const query = {};

            if (status) query.status = status;
            if (search) query.title = { $regex: search, $options: "i" };

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const [data, totalDocuments] = await Promise.all([
                HyperSpecialist.find(query)
                    .skip(skip)
                    .limit(parseInt(limit))
                    .lean(),
                HyperSpecialist.countDocuments(query)
            ]);

            // ✅ Add display_price and currency to each item
            const enrichedData = data.map(item => ({
                ...item,
                display_price: getPriceForCurrency(item.price_dollar, item.price_inr, displayCurrency),
                currency: displayCurrency,
                id: item._id.toString() // Add id for frontend compatibility
            }));

            const totalPages = Math.ceil(totalDocuments / parseInt(limit));

            res.status(200).json({
                success: true,
                data: enrichedData,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalDocuments,
                    limit: parseInt(limit)
                },
                currency: displayCurrency
            });

        } catch (error) {
            console.error("Error in getAllHyperSpecialist:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch HyperSpecialist modules",
                error: error.message
            });
        }
    }
}

// ✅ ENHANCED: Get by ID with currency detection
const getHyperSpecialistById = {
    handler: async (req, res) => {
        try {
            const { _id } = req.params;

            // Get user's IP and determine currency
            const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress;
            const countryCode = await getUserCountryCode(ip);
            const displayCurrency = getDisplayCurrency(countryCode);

            const data = await HyperSpecialist.findById(_id).lean();

            if (!data) {
                return res.status(404).json({
                    success: false,
                    message: "HyperSpecialist not found"
                });
            }

            // ✅ Add display_price and currency
            const enrichedData = {
                ...data,
                display_price: getPriceForCurrency(data.price_dollar, data.price_inr, displayCurrency),
                currency: displayCurrency,
                id: data._id.toString()
            };

            res.status(200).json({
                success: true,
                data: enrichedData
            });
        } catch (error) {
            console.error("Error fetching HyperSpecialist by ID:", error);
            res.status(500).json({
                success: false,
                message: "Internal Server Error",
                error: error.message
            });
        }
    }
};

const updateHyperSpecialist = {
    validation: {
        body: Joi.object().keys({
            title: Joi.string().trim().optional(),
            description: Joi.string().trim().optional(),
            tags: Joi.array().items(Joi.string().trim()).optional(),
            price_dollar: Joi.number().optional(),
            price_inr: Joi.number().optional(),
        })
    },
    handler: async (req, res) => {
        try {
            const { _id } = req.params;

            const Exist = await HyperSpecialist.findOne({ _id });

            if (!Exist) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'HyperSpecialist does not exist');
            }

            if (req.body?.title) {
                const titleExist = await HyperSpecialist.findOne({
                    title: req.body.title,
                    _id: { $ne: _id }
                });
                if (titleExist) {
                    throw new ApiError(httpStatus.BAD_REQUEST, 'HyperSpecialist with this title already exists');
                }
            }

            const updated = await HyperSpecialist.findByIdAndUpdate(_id, req.body, { new: true });

            res.send({
                success: true,
                message: "HyperSpecialist updated successfully!",
                data: updated
            });
        } catch (error) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message
            });
        }
    }
}

const deleteHyperSpecialist = {
    handler: async (req, res) => {
        try {
            const { _id } = req.params;

            const HyperSpecialistExist = await HyperSpecialist.findOne({ _id });

            if (!HyperSpecialistExist) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'HyperSpecialist does not exist');
            }

            await HyperSpecialist.findByIdAndDelete(_id);

            res.send({
                success: true,
                message: 'HyperSpecialist deleted successfully'
            });
        } catch (error) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = {
    createHyperSpecialist,
    getAllHyperSpecialist,
    getHyperSpecialistById,
    updateHyperSpecialist,
    deleteHyperSpecialist
};