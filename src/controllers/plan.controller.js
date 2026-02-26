const httpStatus = require('http-status');
const Joi = require('joi');
const { Plans } = require('../models');
const { handlePagination } = require('../utils/helper');
const logger = require('../config/logger');

const createPlan = {
    validation: {
        body: Joi.object().keys({
            id: Joi.string().trim().lowercase().required(),
            name: Joi.string().trim().required(),
            price_inr: Joi.number().positive().required(),
            price_usd: Joi.number().positive().required(),
            duration: Joi.string().trim().required(),
            duration_months: Joi.number().integer().positive().required(),
            features: Joi.array().items(Joi.string().trim()).min(1).required(),
            icon_type: Joi.string().valid('crown', 'shield', 'zap', 'star', 'rocket').default('zap'),
            is_popular: Joi.boolean().default(false),
            is_best_value: Joi.boolean().default(false),
            sort_order: Joi.number().integer().default(0),
            status: Joi.string().valid('Active', 'Inactive').default('Active'),
        }),
    },
    handler: async (req, res) => {
        try {
            const { id, name } = req.body;

            // Check if plan with same id or name already exists
            const planExist = await Plans.findOne({
                $or: [{ id }, { name }]
            });

            if (planExist) {
                return res.status(httpStatus.BAD_REQUEST).json({
                    message: 'Plan with this id or name already exists'
                });
            }

            const plan = await Plans.create(req.body);

            return res.status(201).json({
                success: true,
                message: "Plan created successfully!",
                data: plan
            });
        } catch (error) {
            logger.error('Error creating plan:', error);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                message: error.message
            });
        }
    }
};

const getAllPlans = {
    handler: async (req, res) => {
        try {
            const { status, search, is_popular, is_best_value } = req.query;
            const query = {};

            // Build query filters
            if (status) query.status = status;
            if (is_popular !== undefined) query.is_popular = is_popular === 'true';
            if (is_best_value !== undefined) query.is_best_value = is_best_value === 'true';

            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { id: { $regex: search, $options: "i" } }
                ];
            }

            await handlePagination(Plans, req, res, query);
        } catch (error) {
            logger.error('Error fetching plans:', error);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                message: error.message
            });
        }
    },
};

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

const getActivePlans = {
    handler: async (req, res) => {
        try {
            const countryCode = await getUserCountryCode(req.ip);
            const plans = countryCode === "IN" ? await Plans.find({ status: 'Active' }).select('-price_usd')
                .sort({ sort_order: 1, createdAt: -1 }) : await Plans.find({ status: 'Active' }).select('-price_inr')
                    .sort({ sort_order: 1, createdAt: -1 });


            return res.status(200).json({
                success: true,
                data: plans
            });
        } catch (error) {
            logger.error('Error fetching active plans:', error);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                message: error.message
            });
        }
    }
};

const getPlanById = {
    handler: async (req, res) => {
        try {
            const { id } = req.params;

            let plan;

            // Check if id is MongoDB ObjectId or custom id
            if (id.match(/^[0-9a-fA-F]{24}$/)) {
                plan = await Plans.findById(id);
            } else {
                plan = await Plans.findOne({ id: id.toLowerCase() });
            }

            if (!plan) {
                return res.status(404).json({
                    success: false,
                    message: "Plan not found"
                });
            }

            return res.status(200).json({
                success: true,
                data: plan
            });
        } catch (error) {
            logger.error('Error fetching plan:', error);
            return res.status(500).json({
                success: false,
                message: "Internal Server Error"
            });
        }
    }
};

const updatePlan = {
    validation: {
        body: Joi.object().keys({
            id: Joi.string().trim().lowercase().optional(),
            name: Joi.string().trim().optional(),
            price_inr: Joi.number().positive().optional(),
            price_usd: Joi.number().positive().optional(),
            duration: Joi.string().trim().optional(),
            duration_months: Joi.number().integer().positive().optional(),
            features: Joi.array().items(Joi.string().trim()).min(1).optional(),
            icon_type: Joi.string().valid('crown', 'shield', 'zap', 'star', 'rocket').optional(),
            is_popular: Joi.boolean().optional(),
            is_best_value: Joi.boolean().optional(),
            sort_order: Joi.number().integer().optional(),
            status: Joi.string().valid('Active', 'Inactive').optional(),
        }).min(1), // At least one field to update
    },
    handler: async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = req.body;

            // Find the plan
            let plan;
            if (id.match(/^[0-9a-fA-F]{24}$/)) {
                plan = await Plans.findById(id);
            } else {
                plan = await Plans.findOne({ id: id.toLowerCase() });
            }

            if (!plan) {
                return res.status(httpStatus.BAD_REQUEST).json({
                    success: false,
                    message: 'Plan not found'
                });
            }

            // Check if custom id is being changed and if new id already exists
            if (updateData.id && updateData.id !== plan.id) {
                const idExist = await Plans.findOne({
                    id: updateData.id.toLowerCase(),
                    _id: { $ne: plan._id }
                });
                if (idExist) {
                    return res.status(httpStatus.BAD_REQUEST).json({
                        message: 'Plan with this id already exists'
                    });
                }
            }

            // Check if name is being changed and if new name already exists
            if (updateData.name && updateData.name !== plan.name) {
                const nameExist = await Plans.findOne({
                    name: updateData.name,
                    _id: { $ne: plan._id }
                });
                if (nameExist) {
                    return res.status(httpStatus.BAD_REQUEST).json({
                        message: 'Plan with this name already exists'
                    });
                }
            }

            const updatedPlan = await Plans.findByIdAndUpdate(
                plan._id,
                updateData,
                { new: true, runValidators: true }
            );

            return res.status(200).json({
                success: true,
                message: "Plan updated successfully!",
                data: updatedPlan,
            });
        } catch (error) {
            logger.error('Error updating plan:', error);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                message: error.message
            });
        }
    }
};

const deletePlan = {
    handler: async (req, res) => {
        try {
            const { id } = req.params;

            // Find the plan
            let plan;
            if (id.match(/^[0-9a-fA-F]{24}$/)) {
                plan = await Plans.findById(id);
            } else {
                plan = await Plans.findOne({ id: id.toLowerCase() });
            }

            if (!plan) {
                return res.status(httpStatus.BAD_REQUEST).json({
                    success: false,
                    message: 'Plan not found'
                });
            }

            await Plans.findByIdAndDelete(plan._id);

            return res.status(200).json({
                success: true,
                message: 'Plan deleted successfully'
            });
        } catch (error) {
            logger.error('Error deleting plan:', error);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                message: error.message
            });
        }
    }
};

const bulkUpdatePlans = {
    handler: async (req, res) => {
        try {
            const { plans } = req.body;

            if (!Array.isArray(plans) || plans.length === 0) {
                return res.status(httpStatus.BAD_REQUEST).json({
                    message: 'Please provide an array of plans to update'
                });
            }

            const operations = plans.map(plan => ({
                updateOne: {
                    filter: { id: plan.id },
                    update: { $set: plan },
                    upsert: true
                }
            }));

            const result = await Plans.bulkWrite(operations);

            return res.status(200).json({
                success: true,
                message: 'Bulk update completed',
                data: result
            });
        } catch (error) {
            logger.error('Error in bulk update:', error);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                message: error.message
            });
        }
    }
};

module.exports = {
    createPlan,
    getAllPlans,
    getActivePlans,
    getPlanById,
    updatePlan,
    deletePlan,
    bulkUpdatePlans
};