const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const Joi = require('joi');
const Faq = require("../models/faq.model");

// POST to add new category (optional, for admin use)
const createFaq = {
    validation: {
        body: Joi.object().keys({
            title: Joi.string().trim().required(),
            description: Joi.string().trim().required(),
        }),
    },

    handler: async (req, res) => {
        try {
            const { title, description } = req.body;

            const faq = await Faq.create(req.body);

            return res.status(201).json({
                success: true,
                message: "Faq created successfully!",
                data: faq
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: "Failed to create live course",
                error: error.message,
            });
        }
    }
};

// ✅ UPDATE FAQ
const updateFaq = {
    validation: {
        body: Joi.object().keys({
            title: Joi.string().trim().required(),
            description: Joi.string().trim().required(),
        }),
    },

    handler: async (req, res) => {
        try {
            const { _id } = req.params;
            const updates = req.body;

            const faq = await Faq.findByIdAndUpdate(_id, updates, { new: true });

            if (!faq) {
                throw new ApiError(httpStatus.NOT_FOUND, "FAQ not found");
            }

            // res.status(httpStatus.OK).send({
            //     status: "success",
            //     code: httpStatus.OK,
            //     data: {
            //         _id: faq._id,
            //         title: faq.title,
            //         description: faq.description,
            //         createdAt: faq.createdAt,
            //         updatedAt: faq.updatedAt,
            //     },
            // });
            res.send({
                success: true,
                message: "Faq updated successfully!",
                faq
            });
        } catch (error) {
            if (!(error instanceof ApiError)) {
                throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Error updating FAQ");
            }
            throw error;
        }
    },
};

// GET all FAQ
const getAllFaq = {

    handler: async (req, res) => {
        try {
            const faq = await Faq.find();

            if (!faq || faq.length === 0) {
                throw new ApiError(httpStatus.NOT_FOUND, "No FAQ found");
            }

            res.status(httpStatus.OK).send(faq);
        } catch (error) {
            // If it's not already an ApiError, wrap it
            if (!(error instanceof ApiError)) {
                throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Error fetching FAQ");
            }
            throw error;
        }
    },
};

// ✅ GET FAQ by ID
const getFaqById = {
    handler: async (req, res) => {
        try {
            const { _id } = req.params;
            const faq = await Faq.findById(_id);

            if (!faq) {
                throw new ApiError(httpStatus.NOT_FOUND, "FAQ not found");
            }

            res.status(httpStatus.OK).send(faq);
        } catch (error) {
            if (!(error instanceof ApiError)) {
                throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Error fetching FAQ by ID");
            }
            throw error;
        }
    },
};

// ✅ DELETE FAQ
const deleteFaq = {
    handler: async (req, res) => {
        try {
            const { _id } = req.params;
            const faq = await Faq.findByIdAndDelete(_id);

            if (!faq) {
                throw new ApiError(httpStatus.NOT_FOUND, "FAQ not found");
            }

            // res.status(httpStatus.OK).send({ message: "FAQ deleted successfully" });
            res.status(httpStatus.OK).send({
                status: true,
                code: httpStatus.OK,
                message: "FAQ deleted successfully",
            });
        } catch (error) {
            if (!(error instanceof ApiError)) {
                throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Error deleting FAQ");
            }
            throw error;
        }
    },
};

module.exports = {
    getAllFaq,
    getFaqById,
    createFaq,
    updateFaq,
    deleteFaq,
};