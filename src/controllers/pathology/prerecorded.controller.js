const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const Joi = require('joi');
const { PreRecord } = require('../../models');
const { handlePagination } = require('../../utils/helper');

// Validation schema for options
const optionSchema = Joi.object({
    type: Joi.string().valid('record-book', 'video', 'writing-book').required(),
    description: Joi.string().required(),
    price: Joi.number().required(),
    features: Joi.array().items(Joi.string()).min(1).required(),
    is_available: Joi.boolean().default(true)
});

// ✅ HELPER: Validate main price = minimum option price
const validateMainPrice = (mainPrice, options) => {
    if (!options || options.length === 0) {
        return; // No validation needed if no options
    }

    const optionPrices = options.map(opt => opt.price);
    const minOptionPrice = Math.min(...optionPrices);

    if (mainPrice !== minOptionPrice) {
        throw new Error(
            `Main price (${mainPrice}) must equal the minimum option price (${minOptionPrice}). ` +
            `This ensures the "starting from" price is accurate.`
        );
    }
};

const createPreRecorded = {
    validation: {
        body: Joi.object().keys({
            title: Joi.string().trim().required(),
            category: Joi.string().allow('', null).optional(),
            total_reviews: Joi.number().allow(null).optional(),
            subtitle: Joi.string().allow('', null).optional(),
            vimeo_video_id: Joi.string().trim().required(),
            rating: Joi.number().allow(null).optional(),
            price: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
            duration: Joi.string().trim().required(),
            description: Joi.string().trim().required(),
            date: Joi.date().required(),
            status: Joi.string().valid('Active', 'Inactive').default('Active'),
            options: Joi.array().items(optionSchema).optional().default([])
        }),
    },
    handler: async (req, res) => {
        try {
            // Convert price to number if it's a string
            if (req.body.price && typeof req.body.price === 'string') {
                req.body.price = parseFloat(req.body.price);
            }

            // Ensure options array exists and is properly formatted
            if (!req.body.options || !Array.isArray(req.body.options)) {
                req.body.options = [];
            } else {
                // Process each option
                req.body.options = req.body.options.map((option, index) => {
                    // Validate required fields
                    if (!option.type || !option.description) {
                        throw new Error(`Option ${index} is missing required fields (type or description)`);
                    }

                    // Ensure features is an array and filter out empty strings
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
                        price: typeof option.price === 'string' ? parseFloat(option.price) : option.price,
                        features: option.features,
                        is_available: option.is_available !== undefined ? option.is_available : true
                    };
                });

                // ✅ Validate that main price = minimum option price
                validateMainPrice(req.body.price, req.body.options);
            }

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
        const { status, search } = req.query;

        const query = {};

        if (status) query.status = status;
        if (search) query.title = { $regex: search, $options: "i" };

        await handlePagination(PreRecord, req, res, query);
    }
}

const getPreRecordedById = {
    handler: async (req, res) => {
        try {
            const { _id } = req.params;

            // Validate MongoDB ObjectId format
            if (!_id.match(/^[0-9a-fA-F]{24}$/)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid ID format"
                });
            }

            const pre_recorded = await PreRecord.findById(_id);

            if (!pre_recorded) {
                return res.status(404).json({
                    success: false,
                    message: "PreRecorded not found"
                });
            }

            res.status(200).json({
                success: true,
                data: pre_recorded
            });
        } catch (error) {
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
            title: Joi.string().trim().required(),
            category: Joi.string().allow('', null).optional(),
            total_reviews: Joi.number().allow(null).optional(),
            subtitle: Joi.string().allow('', null).optional(),
            vimeo_video_id: Joi.string().trim().required(),
            rating: Joi.number().allow(null).optional(),
            price: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
            duration: Joi.string().trim().required(),
            description: Joi.string().trim().required(),
            date: Joi.date().required(),
            status: Joi.string().valid('Active', 'Inactive').optional(),
            options: Joi.array().items(optionSchema).optional()
        }),
    },
    handler: async (req, res) => {
        try {
            const { _id } = req.params;

            // Convert price to number if it's a string
            if (req.body.price && typeof req.body.price === 'string') {
                req.body.price = parseFloat(req.body.price);
            }

            // Process options if provided
            if (req.body.options && Array.isArray(req.body.options)) {
                req.body.options = req.body.options.map(option => {
                    const features = Array.isArray(option.features)
                        ? option.features.filter(f => f && f.trim())
                        : [];

                    return {
                        type: option.type,
                        description: option.description,
                        price: typeof option.price === 'string' ? parseFloat(option.price) : option.price,
                        features: features,
                        is_available: option.is_available !== undefined ? option.is_available : true
                    };
                });

                // ✅ Validate that main price = minimum option price
                validateMainPrice(req.body.price, req.body.options);
            }

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