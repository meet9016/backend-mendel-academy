const httpStatus = require("http-status");
const ApiError = require("../utils/ApiError");
const Joi = require("joi");
const { ExamCategory } = require("../models");
const { handlePagination } = require("../utils/helper");

const createExamCategory = {
  validation: {
    body: Joi.object().keys({
      category_name: Joi.string().trim().required(),

      exams: Joi.array().items(
        Joi.object({
          exam_name: Joi.string().trim().required(),
          country: Joi.string().allow(""),
          sub_titles: Joi.array().items(Joi.string().trim()).optional(),
          description: Joi.string().trim().optional(),
          status: Joi.string().valid("Active", "Inactive").optional(),
        })
      ),

      choose_plan_list: Joi.array().items(
        Joi.object({
          plan_pricing: Joi.string().trim().required(),
          plan_day: Joi.number().required(),
          plan_type: Joi.string().trim().required(),
          plan_sub_title: Joi.array().items(Joi.string().trim()).required(),
          most_popular: Joi.boolean().optional().default(false),
        })
      ).optional(),
    }),
  },

  handler: async (req, res) => {
    try {
      const { category_name, exams, choose_plan_list } = req.body;

      // Validate that only 1 plan has most_popular = true
      if (choose_plan_list) {
        const popularCount = choose_plan_list.filter(plan => plan.most_popular).length;
        if (popularCount > 1) {
          return res.status(400).json({
            message: "Only one plan can be marked as most_popular = true.",
          });
        }
      }

      // Check if category already exists
      const existingCategory = await ExamCategory.findOne({ category_name });

      if (existingCategory) {
        const existingExamNames = existingCategory.exams.map((e) =>
          e.exam_name.toLowerCase()
        );

        const newExams = exams.filter(
          (exam) => !existingExamNames.includes(exam.exam_name.toLowerCase())
        );

        if (newExams.length === 0 && (!choose_plan_list || choose_plan_list.length === 0)) {
          return res.status(400).json({
            message: "All provided exams and plans already exist in this category.",
          });
        }
      }

      // Create new category
      const newCategory = await ExamCategory.create({
        category_name,
        exams,
        choose_plan_list,
      });

      return res.status(201).json({
        message: "Exam category created successfully",
        data: newCategory,
      });
    } catch (err) {
      console.error("Error creating category:", err);
      res.status(500).json({ message: err.message });
    }
  },
};

module.exports = { createExamCategory };

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

const getAllExamsList = {
  handler: async (req, res) => {
    try {
      const categories = await ExamCategory.find();

      // Transform data into the required response
      const dataMap = {};

      categories.forEach(category => {
        if (!dataMap[category.category_name]) {
          dataMap[category.category_name] = {
            category_name: category.category_name,
            exams: []
          };
        }

        category.exams.forEach(exam => {
          dataMap[category.category_name].exams.push({
            _id: exam._id,
            exam_name: exam.exam_name,
            country: exam.country,
            status: exam.status
          });
        });
      });

      // Convert object map to array
      const responseData = Object.values(dataMap);

      res.json({ data: responseData });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error' });
    }
  },
};

// const updateExamCategory = {
//   validation: {
//     body: Joi.object().keys({
//       category_name: Joi.string().trim().required(),
//       exams: Joi.array().items(
//         Joi.object({
//           exam_name: Joi.string().trim().required(),
//           country: Joi.string().allow(""),
//           description: Joi.string().allow(""),
//           status: Joi.string().valid("Active", "Inactive").optional(),
//         })
//       ),
//     }),
//   },

//   handler: async (req, res) => {
//     try {
//       const { _id } = req.params;

//       const category = await ExamCategory.findByIdAndUpdate(_id, req.body, {
//         new: true,
//       });

//       if (!category)
//         throw new ApiError(httpStatus.BAD_REQUEST, 'Category not exist');

//       res.status(httpStatus.OK).json(category);
//     } catch (err) {
//       console.error("Error updating category:", err);
//       res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: err.message });
//     }
//   },
// };

const updateExamCategory = {
  validation: {
    body: Joi.object().keys({
      exam: Joi.object({
        _id: Joi.string().required(), // exam id to update
        exam_name: Joi.string().trim().required(),
        country: Joi.string().allow(""),
        sub_titles: Joi.array().items(Joi.string().trim()).optional(),
        description: Joi.string().trim().optional(),
        status: Joi.string().valid("Active", "Inactive").optional(),
      }).required(),
    }),
  },

  handler: async (req, res) => {
    try {
      const { _id } = req.params; // category id
      const { exam } = req.body;

      // 🔍 Find the category
      const category = await ExamCategory.findById(_id);
      if (!category) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Category not found");
      }

      // 🔍 Find the exam inside the category
      const existingExam = category.exams.id(exam._id);
      if (!existingExam) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Exam not found in this category");
      }

      // ✅ Update exam fields
      existingExam.exam_name = exam.exam_name || existingExam.exam_name;
      existingExam.country = exam.country || existingExam.country;
      existingExam.sub_titles = exam.sub_titles || existingExam.sub_titles;
      existingExam.description = exam.description || existingExam.description;
      existingExam.status = exam.status || existingExam.status;

      await category.save();

      return res.status(httpStatus.OK).json({
        message: "Exam updated successfully.",
        updatedExam: existingExam,
      });
    } catch (err) {
      console.error("Error updating exam:", err);
      res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: err.message });
    }
  },
};

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
  getAllExamsList,
  updateExamCategory,
  deleteExamCategory,
};
