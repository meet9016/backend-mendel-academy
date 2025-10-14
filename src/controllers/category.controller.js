const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const Joi = require('joi');
// import Category from "../models/category.model.js";
const Category = require("../models/category.model");

// GET all categories
const getAllCategories = {
  validation: {}, // no validation needed for GET request

  handler: async (req, res) => {
    try {
      const categories = await Category.find();

      if (!categories || categories.length === 0) {
        throw new ApiError(httpStatus.NOT_FOUND, "No categories found");
      }

      res.status(httpStatus.OK).send(categories);
    } catch (error) {
      // If it's not already an ApiError, wrap it
      if (!(error instanceof ApiError)) {
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Error fetching categories");
      }
      throw error;
    }
  },
};

// POST to add new category (optional, for admin use)
const createCategory = {
  validation: {
    body: Joi.object().keys({
      name: Joi.string().trim().required(),
      slug: Joi.string().trim().required(),
    }),
  },

  handler: async (req, res) => {
    const { name, slug } = req.body;

    // 🔍 Check if category already exists
    const categoryExists = await Category.findOne({ slug: slug.toLowerCase() });
    if (categoryExists) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Category already exists");
    }

    // 🧠 Create category
    const category = await Category.create({
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
    });

    res.status(httpStatus.CREATED).send(category);
  },
};

module.exports = {
  getAllCategories,
  createCategory,
};