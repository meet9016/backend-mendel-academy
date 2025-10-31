const httpStatus = require("http-status");
const ApiError = require("../utils/ApiError");
const Joi = require("joi");
const { ExamCategory } = require("../models");
const { handlePagination } = require("../utils/helper");

/* ===============================
   🟢 CREATE NEW CATEGORY
   Example: "USMLE Program" or "International Exams"
================================ */
const createExamCategory = {
  validation: {
    body: Joi.object().keys({
      category_name: Joi.string().trim().required(),
      exams: Joi.array().items(
        Joi.object({
          exam_name: Joi.string().trim().required(),
          country: Joi.string().allow(""),
          status: Joi.string().valid("Active", "Inactive").optional(),
        })
      ),
    }),
  },

  handler: async (req, res) => {
    try {
      const { category_name, exams } = req.body;

      // ✅ Check if category already exists
      const exists = await ExamCategory.findOne({ category_name });
      if (exists) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json({ message: "Category already exists" });
      }

      const newCategory = await ExamCategory.create({
        category_name,
        exams,
      });

      res.status(httpStatus.CREATED).json(newCategory);
    } catch (err) {
      console.error("Error creating category:", err);
      res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: err.message });
    }
  },
};

/* ===============================
   🟡 GET ALL CATEGORIES
================================ */
const getAllExamCategories = {
  handler: async (req, res) => {
    try {
      const { search, status } = req.query;
      const query = {};

      if (search) query.category_name = { $regex: search, $options: "i" };
      if (status) query["exams.status"] = status;

      await handlePagination(ExamCategory, req, res, query);
    } catch (err) {
      console.error("Error fetching categories:", err);
      res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: err.message });
    }
  },
};

/* ===============================
   🔵 GET CATEGORY BY ID
================================ */
const getExamCategoryById = {
  handler: async (req, res) => {
    try {
      const { _id } = req.params;
      const category = await ExamCategory.findById(_id);
      if (!category)
        return res.status(404).json({ message: "Category not found" });

      res.status(200).json(category);
    } catch (err) {
      console.error("Error fetching category:", err);
      res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: err.message });
    }
  },
};

/* ===============================
   🟠 UPDATE CATEGORY OR SUBEXAMS
================================ */
const updateExamCategory = {
  validation: {
    body: Joi.object().keys({
      category_name: Joi.string().trim().required(),
      exams: Joi.array().items(
        Joi.object({
          exam_name: Joi.string().trim().required(),
          country: Joi.string().allow(""),
          description: Joi.string().allow(""),
          status: Joi.string().valid("Active", "Inactive").optional(),
        })
      ),
    }),
  },

  handler: async (req, res) => {
    try {
      const { _id } = req.params;

      const category = await ExamCategory.findByIdAndUpdate(_id, req.body, {
        new: true,
      });

      if (!category)
           throw new ApiError(httpStatus.BAD_REQUEST, 'Category not exist');

      res.status(httpStatus.OK).json(category);
    } catch (err) {
      console.error("Error updating category:", err);
      res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: err.message });
    }
  },
};

/* ===============================
   🔴 DELETE CATEGORY
================================ */
const deleteExamCategory = {
  handler: async (req, res) => {
    try {
      const { _id } = req.params;

      const category = await ExamCategory.findById(_id);
      if (!category)
                   throw new ApiError(httpStatus.BAD_REQUEST, 'Category not exist');


      await ExamCategory.findByIdAndDelete(_id);
      res.status(httpStatus.OK).json({ message: "Category deleted successfully" });
    } catch (err) {
      console.error("Error deleting category:", err);
      res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: err.message });
    }
  },
};

module.exports = {
  createExamCategory,
  getAllExamCategories,
  getExamCategoryById,
  updateExamCategory,
  deleteExamCategory,
};
