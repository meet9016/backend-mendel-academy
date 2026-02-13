const httpStatus = require("http-status");
const ApiError = require("../utils/ApiError");
const Joi = require("joi");
const { ExamCategory } = require("../models");
const { handlePagination } = require("../utils/helper");
const { ObjectId } = require("mongoose").Types;
const axios = require("axios");
const { getLiveRates } = require("../utils/exchangeRates.js");
const { uploadToExternalService, updateFileOnExternalService, deleteFileFromExternalService } = require("../utils/fileUpload");

// async function getLiveRates() {
//   try {
//     const { data } = await axios.get("https://open.er-api.com/v6/latest/USD");
//     return data.rates;  // returns dynamic rates
//   } catch (err) {
//     console.error("Currency API Error:", err);
//     return {
//       USD: 1,
//       INR: 83,
//       GBP: 0.79,
//       EUR: 0.92,
//     }; // fallback
//   }
// }

async function getCurrencyFromCountryCode(countryCode) {
  try {
    const { data } = await axios.get(
      `https://restcountries.com/v3.1/alpha/${countryCode}`
    );

    const currencies = data[0].currencies;
    const currencyCode = Object.keys(currencies)[0]; // e.g. CAD, USD, INR

    return currencyCode;
  } catch (err) {
    console.error("Currency lookup failed:", err);
    return "USD"; // fallback
  }
}

const getUserCountryCode = async (ip) => {
  try {
    console.log("🔍 Detecting IP:", ip); // Debug log

    // ✅ For localhost/development, default to India
    if (!ip || ip === '::1' || ip === '127.0.0.1' || ip === 'localhost' || ip.includes('::ffff:127.0.0.1')) {
      console.log("✅ Localhost detected, defaulting to India");
      return {
        country: "India",
        countryCode: "IN",
        currency: "INR" // ✅ Changed from default currency lookup
      };
    }

    // For production, use IP API
    const response = await axios.get(`http://ip-api.com/json/${ip}`);
    const countryCode = response.data.countryCode;

    console.log("🌍 Country detected:", response.data.country, countryCode);

    // ✅ Direct mapping instead of API call
    const currency = countryCode === "IN" ? "INR" : "USD";

    return {
      country: response.data.country,
      countryCode,
      currency
    };

  } catch (err) {
    console.error("❌ IP detection error:", err);
    // ✅ Default to India on error
    return {
      country: "India",
      countryCode: "IN",
      currency: "INR"
    };
  }
};

const createExamCategory = {
  validation: {
    body: Joi.object().keys({
      category_name: Joi.string().trim().required(),

      exams: Joi.array().items(
        Joi.object({
          exam_name: Joi.string().trim().required(),
          slug: Joi.string().trim().required(),
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
          plan_pricing_dollar: Joi.number().allow("").optional(),
          plan_pricing_inr: Joi.number().allow("").optional(),
          plan_month: Joi.number().required(),
          plan_type: Joi.string().trim().required(),
          plan_sub_title: Joi.array(),
          most_popular: Joi.boolean().truthy('true').falsy('false').default(false),
        })
      ).optional(),
      rapid_learning_tools: Joi.array().items(
        Joi.object({
          tool_type: Joi.string().trim().optional(),
          price_usd: Joi.number().allow("").optional(),
          price_inr: Joi.number().allow("").optional(),
        })
      ).optional(),
      who_can_enroll_title: Joi.string().trim().required(),
      who_can_enroll_description: Joi.string().trim().required(),
      who_can_enroll_image: Joi.string().optional(),
    }),
  },

  handler: async (req, res) => {
    try {
      const { category_name, exams, choose_plan_list, rapid_learning_tools, who_can_enroll_title,
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

      let updatedExams = exams;
      let enrollImageUrl = "";

      if (req.files && req.files.image && req.files.image[0]) {
        const examImageUrl = await uploadToExternalService(req.files.image[0], 'exam-category');
        if (Array.isArray(exams) && exams.length > 0) {
          updatedExams = exams.map((exam) => ({
            ...exam,
            image: examImageUrl,
          }));
        }
      }

      if (req.files && req.files.who_can_enroll_image && req.files.who_can_enroll_image[0]) {
        enrollImageUrl = await uploadToExternalService(req.files.who_can_enroll_image[0], 'exam-category');
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
        rapid_learning_tools,
        who_can_enroll_title,
        who_can_enroll_description,
        who_can_enroll_image: enrollImageUrl,
      });

      return res.status(201).json({
        message: "Exam category created successfully",
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

// const getExamCategoryById = {
//   handler: async (req, res) => {
//     try {
//       const { _id } = req.params;
//       const category = await ExamCategory.findById(_id);
//       if (!category)
//         return res.status(404).json({ message: "Category not found" });

//       res.status(200).json(category);
//     } catch (err) {
//       console.error("Error fetching category:", err);
//       res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: err.message });
//     }
//   },
// };

const getExamCategoryById = {
  handler: async (req, res) => {
    try {
      // Extract real client IP
      const ip =
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.socket.remoteAddress;

      console.log("📍 Request IP:", ip); // Debug log

      // Detect country + currency
      const userInfo = await getUserCountryCode(ip);
      console.log("💰 User Info:", userInfo); // Debug log

      const { _id } = req.params;
      
      // 🔍 Find by MongoDB ID or Slug (within exams array)
      let category;
      if (_id.match(/^[0-9a-fA-F]{24}$/)) {
        category = await ExamCategory.findById(_id);
      } else {
        category = await ExamCategory.findOne({ "exams.slug": _id });
        
        // If found by slug, move the matching exam to the front of the array
        // so frontend can consistently use exams[0]
        if (category && category.exams) {
          const matchingExamIndex = category.exams.findIndex(e => e.slug === _id);
          if (matchingExamIndex > 0) {
            const [matchingExam] = category.exams.splice(matchingExamIndex, 1);
            category.exams.unshift(matchingExam);
          }
        }
      }

      if (!category)
        return res.status(404).json({ message: "Category/Exam not found" });

      // If it was found by slug, we might want to return the specific exam context
      // but the current frontend seems to expect the whole category document.
      
      // ✅ Return with user currency info
      res.status(200).json({
        ...category._doc,
        user_country: userInfo.country,
        user_currency: userInfo.currency, // INR or USD
        choose_plan_list: category.choose_plan_list, // Prices stay as is
      });

    } catch (err) {
      console.error("Error fetching category:", err);
      res.status(500).json({ message: err.message });
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
            slug: exam.slug,
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
          plan_pricing_dollar: Joi.number().allow("").optional(),
          plan_pricing_inr: Joi.number().allow("").optional(),
          plan_month: Joi.number().required(),
          plan_type: Joi.string().trim().required(),
          plan_sub_title: Joi.array(),
          most_popular: Joi.boolean().truthy('true').falsy('false').default(false),
        })
      ).optional(),

      rapid_learning_tools: Joi.alternatives().try(
        Joi.array().items(
          Joi.object({
            _id: Joi.string().optional(),
            tool_type: Joi.string().trim().optional(),
            price_usd: Joi.number().allow("").optional(),
            price_inr: Joi.number().allow("").optional(),
          })
        ),
        Joi.string() // Allow JSON string for empty array case
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
        rapid_learning_tools,
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

            if (req.files && req.files.image && req.files.image[0]) {
              if (existingExam.image) {
                existingExam.image = await updateFileOnExternalService(existingExam.image, req.files.image[0]);
              } else {
                existingExam.image = await uploadToExternalService(req.files.image[0], 'exam-category');
              }
            } else if (exam.image) {
              existingExam.image = exam.image;
            }
          }
        }
      }

      if (choose_plan_list && Array.isArray(choose_plan_list)) {
        choose_plan_list.forEach(plan => {

          // 🟢 UPDATE EXISTING PLAN
          if (plan._id) {
            const existingPlan = existingCategory.choose_plan_list.id(plan._id);

            if (existingPlan) {
              if (plan.plan_pricing_dollar !== undefined)
                existingPlan.plan_pricing_dollar = plan.plan_pricing_dollar;

              if (plan.plan_pricing_inr !== undefined)
                existingPlan.plan_pricing_inr = plan.plan_pricing_inr;

              if (plan.plan_month !== undefined)
                existingPlan.plan_month = plan.plan_month;

              if (plan.plan_type !== undefined)
                existingPlan.plan_type = plan.plan_type;

              if (plan.plan_sub_title !== undefined)
                existingPlan.plan_sub_title = plan.plan_sub_title;

              if (plan.most_popular !== undefined)
                existingPlan.most_popular = plan.most_popular;
            }
          }

          // 🟢 ADD NEW PLAN (NO _id)
          else {
            existingCategory.choose_plan_list.push({
              plan_pricing_dollar: plan.plan_pricing_dollar,
              plan_pricing_inr: plan.plan_pricing_inr,
              plan_month: plan.plan_month,
              plan_type: plan.plan_type,
              plan_sub_title: plan.plan_sub_title || [],
              most_popular: plan.most_popular ?? false,
            });
          }
        });
      }

      // Handle rapid_learning_tools (can be array or JSON string for empty array)
      let parsedRapidTools = rapid_learning_tools;
      if (typeof rapid_learning_tools === 'string') {
        try {
          parsedRapidTools = JSON.parse(rapid_learning_tools);
        } catch (e) {
          parsedRapidTools = [];
        }
      }

      if (parsedRapidTools !== undefined && Array.isArray(parsedRapidTools)) {
        // Clear existing tools first
        existingCategory.rapid_learning_tools = [];
        
        // Add new/updated tools
        parsedRapidTools.forEach(tool => {
          if (tool.tool_type && (tool.price_usd || tool.price_inr)) {
            existingCategory.rapid_learning_tools.push({
              ...(tool._id && { _id: tool._id }),
              tool_type: tool.tool_type,
              price_usd: tool.price_usd,
              price_inr: tool.price_inr,
            });
          }
        });
      }

      if (who_can_enroll_title) existingCategory.who_can_enroll_title = who_can_enroll_title;
      if (who_can_enroll_description) existingCategory.who_can_enroll_description = who_can_enroll_description;

      if (req.files && req.files.who_can_enroll_image && req.files.who_can_enroll_image[0]) {
        if (existingCategory.who_can_enroll_image) {
          existingCategory.who_can_enroll_image = await updateFileOnExternalService(existingCategory.who_can_enroll_image, req.files.who_can_enroll_image[0]);
        } else {
          existingCategory.who_can_enroll_image = await uploadToExternalService(req.files.who_can_enroll_image[0], 'exam-category');
        }
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

      // Delete associated images
      if (category.exams && category.exams.length > 0) {
        for (const exam of category.exams) {
          if (exam.image) {
            await deleteFileFromExternalService(exam.image);
          }
        }
      }

      if (category.who_can_enroll_image) {
        await deleteFileFromExternalService(category.who_can_enroll_image);
      }

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