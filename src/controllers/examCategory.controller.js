const httpStatus = require("http-status");
const ApiError = require("../utils/ApiError");
const Joi = require("joi");
const { ExamCategory } = require("../models");
const { handlePagination } = require("../utils/helper");
const { ObjectId } = require("mongoose").Types;

const createExamCategory = {
  validation: {
    body: Joi.object().keys({
      category_name: Joi.string().trim().required(),

      exams: Joi.array().items(
        Joi.object({
          exam_name: Joi.string().trim().required(),
          title: Joi.string().trim().required(),
          country: Joi.string().allow(""),
          sub_titles: Joi.array().items(Joi.string().trim()).optional(),
          description: Joi.string().trim().optional(),
          status: Joi.string().valid("Active", "Inactive").insensitive().default("Active").optional(),
          image: Joi.string().optional(),
        })
      ),

      choose_plan_list: Joi.array().items(
        Joi.object({
          plan_pricing: Joi.string().allow("").optional(),
          plan_day: Joi.string(),
          plan_type: Joi.string().trim().required(),
          plan_sub_title: Joi.array(),
          most_popular: Joi.boolean().truthy('true').falsy('false').default(false),
        })
      ).optional(),
      who_can_enroll_title: Joi.string().trim().required(),
      who_can_enroll_description: Joi.string().trim().required(),
      who_can_enroll_image: Joi.string().optional(),
    }),
  },

  handler: async (req, res) => {
    try {
      const { category_name, exams, choose_plan_list, who_can_enroll_title,
        who_can_enroll_description,
      } = req.body;

      // Validate that only 1 plan has most_popular = true
      if (choose_plan_list) {
        const popularCount = choose_plan_list.filter(plan => plan.most_popular).length;
        if (popularCount > 1) {
          return res.status(400).json({
            message: "Only one plan can be marked as most_popular = true.",
          });
        }
      }

      const baseUrl = req.protocol + "://" + req.get("host");
      let updatedExams = exams;
      let enrollImageUrl = "";

      if (req.files && req.files.image && req.files.image[0]) {
        const examImageUrl = `${baseUrl}/uploads/${req.files.image[0].filename}`;
        if (Array.isArray(exams) && exams.length > 0) {
          updatedExams = exams.map((exam) => ({
            ...exam,
            image: examImageUrl,
          }));
        }
      }

      // ✅ Handle "who_can_enroll_image"
      if (req.files && req.files.who_can_enroll_image && req.files.who_can_enroll_image[0]) {
        enrollImageUrl = `${baseUrl}/uploads/${req.files.who_can_enroll_image[0].filename}`;
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
        exams: updatedExams,
        choose_plan_list,
        who_can_enroll_title,
        who_can_enroll_description,
        who_can_enroll_image: enrollImageUrl,
      });

      return res.status(201).json({
        message: "Exam category created successfully",
        // data: newCategory,
      });
    } catch (err) {
      console.error("Error creating category:", err);
      res.status(500).json({ message: err.message });
    }
  },
};

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

const getAllExamCategoriesActiveData = {
  handler: async (req, res) => {
    try {
      const { search, status } = req.query;
      const query = {};

      // 🔍 Optional search by category name
      if (search) query.category_name = { $regex: search, $options: "i" };

      // 🧠 Always exclude Inactive exams
      query["exams.status"] = { $ne: "Inactive" };

      // ✅ If you still want to allow custom status filter (like Active only)
      if (status && status !== "Inactive") {
        query["exams.status"] = status;
      }

      await handlePagination(ExamCategory, req, res, query);
    } catch (err) {
      console.error("Error fetching categories:", err);
      res
        .status(500)
        .json({ message: "Error fetching exam categories", error: err.message });
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

      const dataMap = {};

      categories.forEach((category) => {
        // Initialize category entry
        if (!dataMap[category.category_name]) {
          dataMap[category.category_name] = {
            category_name: category.category_name,
            exams: [],
          };
        }

        // ✅ Only include exams with Active status
        const activeExams = category.exams.filter(
          (exam) => exam.status === "Active"
        );

        activeExams.forEach((exam) => {
          dataMap[category.category_name].exams.push({
            exam_id: category._id,
            _id: exam._id,
            exam_name: exam.exam_name,
            country: exam.country,
            status: exam.status,
          });
        });
      });

      // Convert object map to array
      const responseData = Object.values(dataMap);

      res.json({ data: responseData });
    } catch (error) {
      console.error("Error fetching exams list:", error);
      res.status(500).json({ message: "Server Error" });
    }
  },
};

//get only selected plan by its _id from choose_plan_list
const getPlanById = {
  handler: async (req, res) => {
    try {
      const { planId } = req.params; // plan _id from URL

      // Find the category that has this plan _id in its choose_plan_list
      const category = await ExamCategory.findOne(
        { "choose_plan_list._id": new ObjectId(planId) },
        { "choose_plan_list.$": 1 } // $ projection returns only the matched subdocument
      );

      if (!category || !category.choose_plan_list || category.choose_plan_list.length === 0) {
        return res.status(httpStatus.NOT_FOUND).json({
          message: "Plan not found",
        });
      }

      const plan = category.choose_plan_list[0];

      return res.status(httpStatus.OK).json({
        message: "Plan retrieved successfully",
        data: plan,
      });
    } catch (error) {
      console.error("Error fetching plan:", error);
      res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message,
      });
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

// const updateExamCategory = {
//   validation: {
//     body: Joi.object().keys({
//       exams: Joi.array().items(
//         Joi.object({
//           _id: Joi.string().optional(),
//           exam_name: Joi.string().trim().required(),
//           country: Joi.string().allow(""),
//           sub_titles: Joi.array().items(Joi.string().trim()).optional(),
//           description: Joi.string().trim().optional(),
//           image: Joi.string().optional(),
//         })
//       ).optional(),

//       choose_plan_list: Joi.array().items(
//         Joi.object({
//           _id: Joi.string().optional(),
//           plan_pricing: Joi.string().trim().required(),
//           plan_day: Joi.number().required(),
//           plan_type: Joi.string().trim().required(),
//           plan_sub_title: Joi.array().items(Joi.string().trim()).required(),
//           // most_popular: Joi.boolean().truthy('true').falsy('false').default(false),
//         })
//       ).optional(),

//       who_can_enroll_title: Joi.string().trim().required(),
//       who_can_enroll_description: Joi.string().trim().required(),
//       who_can_enroll_image: Joi.string().trim().required(),
//     }),
//   },

//   handler: async (req, res) => {
//     try {
//       const { _id } = req.params; // category id
//       const { exams, choose_plan_list } = req.body;


//       // 🔍 Find the category
//       const category = await ExamCategory.findById(_id);
//       if (!category) {
//         throw new ApiError(httpStatus.BAD_REQUEST, "Category not found");
//       }

//       const baseUrl = `${req.protocol}://${req.get("host")}`;

//       // ✅ Handle image upload for the first exam if present
//       if (req.file && Array.isArray(exams) && exams.length > 0) {
//         exams[0].image = req.file?.filename
//           ? `${baseUrl}/uploads/${req.file.filename}`
//           : "";
//       }

//       // ✅ Update exams
//       if (Array.isArray(exams)) {
//         for (const exam of exams) {
//           if (exam._id) {
//             const existingExam = category.exams.id(exam._id);

//             if (existingExam) {
//               existingExam.exam_name = exam.exam_name || existingExam.exam_name;
//               existingExam.title = exam.title || existingExam.title;
//               existingExam.country = exam.country || existingExam.country;
//               existingExam.sub_titles = exam.sub_titles || existingExam.sub_titles;
//               existingExam.description = exam.description || existingExam.description;
//               existingExam.status = exam.status || existingExam.status;
//               existingExam.image = exam.image || existingExam.image;
//             } else {
//               console.warn(`Exam with ID ${exam._id} not found in category.`);
//             }
//           }
//         }
//       }


//       // ✅ Update plans
//       if (Array.isArray(choose_plan_list)) {
//         for (const plan of choose_plan_list) {
//           if (plan._id) {
//             const existingPlan = category.choose_plan_list.id(plan._id);
//             if (existingPlan) {
//               Object.assign(existingPlan, {
//                 plan_pricing: plan.plan_pricing,
//                 plan_day: plan.plan_day,
//                 plan_type: plan.plan_type,
//                 plan_sub_title: plan.plan_sub_title,
//                 most_popular: plan.most_popular,
//               });
//             }
//           }
//         }
//       }

//       await category.save();

//       return res.status(httpStatus.OK).json({
//         message: "Exam category updated successfully.",
//         updatedExam: category,
//       });
//     } catch (err) {
//       console.error("Error updating exam:", err);
//       res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: err.message });
//     }
//   },
// };

const updateExamCategory = {
  validation: {
    body: Joi.object().keys({
      category_name: Joi.string().trim().optional(),

      exams: Joi.array().items(
        Joi.object({
          _id: Joi.string().optional(), // existing exam id (for updates)
          exam_name: Joi.string().trim().required(),
          title: Joi.string().trim().optional(),
          country: Joi.string().allow(""),
          sub_titles: Joi.array().items(Joi.string().trim()).optional(),
          description: Joi.string().trim().optional(),
          image: Joi.string().optional(),
          status: Joi.string().valid("Active", "Inactive").insensitive().default("Active").optional(),
        })
      ).optional(),

      choose_plan_list: Joi.array().items(
        Joi.object({
          _id: Joi.string().optional(),
          plan_pricing: Joi.string().allow("").optional(),
          plan_day: Joi.string(),
          plan_type: Joi.string().trim().required(),
          plan_sub_title: Joi.array(),
          most_popular: Joi.boolean().truthy('true').falsy('false').default(false),
        })
      ).optional(),

      who_can_enroll_title: Joi.string().trim().optional(),
      who_can_enroll_description: Joi.string().trim().optional(),
      who_can_enroll_image: Joi.string().trim().optional(),
    }),
  },

  handler: async (req, res) => {
    try {
      const { _id } = req.params;
      const {
        category_name,
        exams,
        choose_plan_list,
        who_can_enroll_title,
        who_can_enroll_description,
        who_can_enroll_image,
      } = req.body;

      const existingCategory = await ExamCategory.findById(_id);
      if (!existingCategory) {
        return res.status(404).json({ message: "Exam category not found" });
      }

      // Ensure only one plan is marked as most_popular
      if (choose_plan_list) {
        const popularCount = choose_plan_list.filter(p => p.most_popular).length;
        if (popularCount > 1) {
          return res.status(400).json({
            message: "Only one plan can be marked as most_popular = true.",
          });
        }
      }

      const baseUrl = req.protocol + "://" + req.get("host");
      // if (req.file && Array.isArray(exams) && exams.length > 0) {
      //   exams[0].image = req.file.filename ? `${baseUrl}/uploads/${req.file.filename}` : "";
      // }

      // Update category fields dynamically
      if (category_name) existingCategory.category_name = category_name;
      if (Array.isArray(exams)) {
        for (const exam of exams) {
          if (exam._id) {
            const existingExam = existingCategory.exams.id(exam._id);

            if (!existingExam) {
              throw new ApiError(400, "Exam not found in this category");
            }

            existingExam.exam_name = exam.exam_name || existingExam.exam_name;
            existingExam.title = exam.title || existingExam.title;
            existingExam.country = exam.country || existingExam.country;
            existingExam.sub_titles = exam.sub_titles || existingExam.sub_titles;
            existingExam.description = exam.description || existingExam.description;
            existingExam.status = exam.status || existingExam.status;
            // existingExam.image = exam.image || existingExam.image;
            if (req.files && req.files.image && req.files.image[0]) {
              existingExam.image = `${baseUrl}/uploads/${req.files.image[0].filename}`;
            } else if (exam.image) {
              existingExam.image = exam.image;
            }
          }
        }
      }

      if (choose_plan_list && Array.isArray(choose_plan_list)) {
        choose_plan_list.forEach(plan => {
          if (plan._id) {
            const existingPlan = existingCategory.choose_plan_list.id(plan._id);
            if (existingPlan) {
              existingPlan.plan_pricing = plan.plan_pricing || existingPlan.plan_pricing;
              existingPlan.plan_day = plan.plan_day || existingPlan.plan_day;
              existingPlan.plan_type = plan.plan_type || existingPlan.plan_type;
              existingPlan.plan_sub_title = plan.plan_sub_title || existingPlan.plan_sub_title;
              existingPlan.most_popular = plan.most_popular ?? existingPlan.most_popular;
            }
          }
        });
      }

      if (who_can_enroll_title) existingCategory.who_can_enroll_title = who_can_enroll_title;
      if (who_can_enroll_description) existingCategory.who_can_enroll_description = who_can_enroll_description;
      // ✅ properly handle uploaded image
      if (req.files && req.files.who_can_enroll_image && req.files.who_can_enroll_image[0]) {
        existingCategory.who_can_enroll_image = `${baseUrl}/uploads/${req.files.who_can_enroll_image[0].filename}`;
      } else if (who_can_enroll_image) {
        existingCategory.who_can_enroll_image = who_can_enroll_image;
      }

      const updatedCategory = await existingCategory.save();

      return res.status(200).json({
        message: "Exam category updated successfully",
        data: updatedCategory,
      });
    } catch (err) {
      console.error("Error updating category:", err);
      res.status(500).json({ message: err.message });
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
  getPlanById,
  updateExamCategory,
  deleteExamCategory,
};