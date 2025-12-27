const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const Joi = require('joi');
const Faq = require("../models/faq.model");
const TermsConditions = require('../models/termsConditions.model');

// POST to add new category (optional, for admin use)
const createOrUpdateTermsConditions = {
    validation: {
        body: Joi.object().keys({
            description: Joi.string().trim().required(),
        }),
    },

    handler: async (req, res) => {
        try {
            const { description } = req.body;

            const termsCondition = await TermsConditions.findOneAndUpdate(
                {}, // empty filter → single document
                { description },
                {
                    new: true,      // updated document return kare
                    upsert: true,   // agar record na ho to create kare
                }
            );

            return res.status(httpStatus.OK).json({
                success: true,
                message: "Terms & Conditions saved successfully",
                data: termsCondition,
            });
        } catch (error) {
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Failed to save Terms & Conditions",
                error: error.message,
            });
        }
    },
};

// GET all FAQ
const getTermsConditions = {
  handler: async (req, res) => {
    try {
      const termsCondition = await TermsConditions.findOne();

      if (!termsCondition) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          "No Terms & Conditions found"
        );
      }

      res.status(httpStatus.OK).json({
        success: true,
        data: termsCondition,
      });
    } catch (error) {
      if (!(error instanceof ApiError)) {
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          "Error fetching Terms & Conditions"
        );
      }
      throw error;
    }
  },
};


module.exports = {
    createOrUpdateTermsConditions,
    getTermsConditions,
};