const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const Joi = require('joi');
const { LiveCourses } = require('../../models');
const { handlePagination, sortAndFormat } = require('../../utils/helper');
const axios = require('axios');

// ===== CURRENCY HELPER FUNCTIONS (Same as PreRecorded) =====
async function getCurrencyFromCountryCode(countryCode) {
    try {
        const { data } = await axios.get(
            `https://restcountries.com/v3.1/alpha/${countryCode}`
        );

        const currencies = data[0].currencies;
        const currencyCode = Object.keys(currencies)[0];

        return currencyCode;
    } catch (err) {
        console.error("Currency lookup failed:", err);
        return "USD";
    }
}

const getUserCountryCode = async (ip) => {
    try {
        // ✅ Handle localhost/development environment
        if (!ip || ip === '::1' || ip === '127.0.0.1' || ip === 'localhost' || ip.includes('::ffff:127.0.0.1')) {
            console.log('⚠️ Development environment detected. Using default India (IN) for testing.');
            return {
                country: "India",
                countryCode: "IN",
                currency: "INR"
            };
        }

        const response = await axios.get(`http://ip-api.com/json/${ip}`);
        const countryCode = response.data.countryCode;

        console.log(`✅ Detected IP: ${ip}, Country: ${response.data.country}, Code: ${countryCode}`);

        const currency = await getCurrencyFromCountryCode(countryCode);

        return {
            country: response.data.country,
            countryCode,
            currency
        };

    } catch (err) {
        console.error('❌ IP detection error:', err.message);
        return { country: "India", countryCode: "IN", currency: "INR" };
    }
};

// ✅ Helper to determine display currency
const getDisplayCurrency = (countryCode) => {
    return countryCode === 'IN' ? 'INR' : 'USD';
};

// ✅ Helper to get price based on currency
const getPriceForCurrency = (priceUsd, priceInr, currency) => {
    return currency === 'INR' ? priceInr : priceUsd;
};

// ===== VALIDATION SCHEMAS =====
const planSchema = Joi.object({
    moduleNumber: Joi.string(),
    title: Joi.string().trim().required(),
    subtitle: Joi.string().trim().allow(""),
    description: Joi.string().trim().allow(""),
    price_usd: Joi.number().required(),
    price_inr: Joi.number().required(),
    features: Joi.array().items(Joi.string().trim()).min(1).required(),
    isMostPopular: Joi.boolean().default(false)
});

const createLiveCourses = {
    validation: {
        body: Joi.object().keys({
            course_title: Joi.string().trim().required(),
            instructor: Joi.object({
                name: Joi.string().trim().required(),
                qualification: Joi.string().trim().allow(""),
                image: Joi.string().trim().allow("", null).optional() // ✅ Added image field
            }).required(),
            tags: Joi.array().items(Joi.string().trim()).optional(),
            date: Joi.date().required(),
            instructor_name: Joi.string().trim().required(),
            status: Joi.string().valid("live", "recorded", "upcoming").default("live"),
            isSoldOut: Joi.boolean().default(false),
            duration: Joi.string().allow("").optional(),
            zoom_link: Joi.string().trim().required(),
            choose_plan_list: Joi.array().items(planSchema).min(1).required()
        })
    },
    handler: async (req, res) => {
        try {
            // ✅ Validate that each plan has both USD and INR prices
            req.body.choose_plan_list = req.body.choose_plan_list.map((plan, index) => {
                if (!plan.price_usd || !plan.price_inr) {
                    throw new Error(`Plan ${index + 1} must have both USD and INR prices`);
                }

                return {
                    ...plan,
                    price_usd: typeof plan.price_usd === 'string' ? parseFloat(plan.price_usd) : plan.price_usd,
                    price_inr: typeof plan.price_inr === 'string' ? parseFloat(plan.price_inr) : plan.price_inr,
                };
            });

            const course = await LiveCourses.create(req.body);

            return res.status(201).json({
                success: true,
                message: "Live course created successfully!",
                data: course,
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: "Failed to create live course",
                error: error.message,
            });
        }
    }
}

const getAllCourses = {
    handler: async (req, res) => {
        try {
            const { status, search } = req.query;

            const ip =
                req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
                req.socket.remoteAddress;

            console.log('🔍 Incoming IP:', ip);

            const user = await getUserCountryCode(ip);
            console.log('🌍 User Location:', user);

            const displayCurrency = getDisplayCurrency(user.countryCode);
            console.log('💰 Display Currency:', displayCurrency);

            const query = {};

            if (status) query.status = status;
            if (search) query.course_title = { $regex: search, $options: "i" };

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            const totalRecords = await LiveCourses.countDocuments(query);
            const data = await LiveCourses.find(query)
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 });

            // ✅ Convert prices for each course
            const convertedData = data.map(course => {
                const courseObj = course.toObject();

                const convertedPlans = courseObj.choose_plan_list.map(plan => {
                    const planPrice = getPriceForCurrency(
                        plan.price_usd,
                        plan.price_inr,
                        displayCurrency
                    );

                    return {
                        moduleNumber: plan.moduleNumber,
                        title: plan.title,
                        subtitle: plan.subtitle,
                        description: plan.description,
                        price: planPrice,
                        price_usd: plan.price_usd, // ✅ Include for alternate display
                        price_inr: plan.price_inr, // ✅ Include for alternate display
                        features: plan.features,
                        isMostPopular: plan.isMostPopular
                    };
                });

                return {
                    ...courseObj,
                    id: courseObj._id.toString(), // ✅ Add explicit id field for frontend
                    currency: displayCurrency,
                    user_country: user.country,
                    choose_plan_list: convertedPlans
                };
            });

            res.status(200).json({
                success: true,
                data: convertedData,
                currency: displayCurrency,
                pagination: {
                    page,
                    limit,
                    totalRecords,
                    totalPages: Math.ceil(totalRecords / limit)
                }
            });

        } catch (error) {
            console.error('❌ Error in getAllCourses:', error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to fetch live courses"
            });
        }
    }
}

// In your controller file, make sure this is working correctly
const getAllLiveCourses = {
    handler: async (req, res) => {
        try {
            const ip =
                req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
                req.socket.remoteAddress;

            const user = await getUserCountryCode(ip);
            const displayCurrency = getDisplayCurrency(user.countryCode);

            const courses = await LiveCourses.find({ status: "live" })
                .sort({ createdAt: -1 }); // ✅ Add sorting

            // ✅ Convert prices
            const convertedCourses = courses.map(course => {
                const courseObj = course.toObject();

                const convertedPlans = courseObj.choose_plan_list.map(plan => ({
                    moduleNumber: plan.moduleNumber,
                    title: plan.title,
                    subtitle: plan.subtitle,
                    description: plan.description,
                    price: getPriceForCurrency(plan.price_usd, plan.price_inr, displayCurrency),
                    price_usd: plan.price_usd, // ✅ Include both
                    price_inr: plan.price_inr,
                    features: plan.features,
                    isMostPopular: plan.isMostPopular
                }));

                return {
                    ...courseObj,
                    id: courseObj._id.toString(), // ✅ Ensure id is string
                    currency: displayCurrency,
                    user_country: user.country,
                    choose_plan_list: convertedPlans
                };
            });

            // ✅ Return in consistent format
            res.status(200).json({
                success: true,
                data: convertedCourses, // Array of courses
                currency: displayCurrency
            });

        } catch (error) {
            console.error('❌ Error in getAllLiveCourses:', error);
            res.status(500).json({
                success: false,
                message: "Internal Server Error"
            });
        }
    }
}

const getLiveCoursesById = {
    handler: async (req, res) => {
        try {
            const { _id } = req.params;

            if (!_id.match(/^[0-9a-fA-F]{24}$/)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid ID format"
                });
            }

            const ip =
                req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
                req.socket.remoteAddress;

            const user = await getUserCountryCode(ip);
            const displayCurrency = getDisplayCurrency(user.countryCode);

            const course = await LiveCourses.findById(_id);

            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: "Live course not found"
                });
            }

            const courseObj = course.toObject();

            // ✅ For editing: keep both USD and INR prices
            const plansWithBothPrices = courseObj.choose_plan_list.map(plan => ({
                moduleNumber: plan.moduleNumber,
                title: plan.title,
                subtitle: plan.subtitle,
                description: plan.description,
                price_usd: plan.price_usd,  // Keep original USD price
                price_inr: plan.price_inr,  // Keep original INR price
                features: plan.features,
                isMostPopular: plan.isMostPopular
            }));

            res.status(200).json({
                success: true,
                data: {
                    ...courseObj,
                    currency: displayCurrency,
                    user_country: user.country,
                    user_currency: displayCurrency,
                    choose_plan_list: plansWithBothPrices // ✅ Send both prices for editing
                }
            });
        } catch (error) {
            console.error("❌ Error fetching course by ID:", error);
            res.status(500).json({
                success: false,
                message: "Internal Server Error",
                error: error.message
            });
        }
    }
};

const updateLiveCourses = {
    validation: {
        body: Joi.object().keys({
            course_title: Joi.string().trim().optional(),
            instructor: Joi.object({
                name: Joi.string().trim().required(),
                qualification: Joi.string().trim().allow(""),
                image: Joi.string().trim().allow("", null).optional() // ✅ Added image field
            }).optional(),
            tags: Joi.array().items(Joi.string().trim()).optional(),
            date: Joi.date().optional(),
            instructor_name: Joi.string().trim().optional(),
            status: Joi.string().valid("live", "recorded", "upcoming").optional(),
            isSoldOut: Joi.boolean().optional(),
            duration: Joi.string().allow("").optional(),
            zoom_link: Joi.string().trim().optional(),
            choose_plan_list: Joi.array().items(planSchema).optional()
        })
    },
    handler: async (req, res) => {
        try {
            const { _id } = req.params;

            const liveCoursesExist = await LiveCourses.findOne({ _id });

            if (!liveCoursesExist) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'Live course does not exist');
            }

            if (req.body?.course_title && req.body.course_title !== liveCoursesExist.course_title) {
                const titleExist = await LiveCourses.findOne({
                    course_title: req.body.course_title,
                    _id: { $ne: _id }
                });
                if (titleExist) {
                    throw new ApiError(httpStatus.BAD_REQUEST, 'Live course with this title already exists');
                }
            }

            // ✅ Validate dual currency pricing
            if (req.body.choose_plan_list && Array.isArray(req.body.choose_plan_list)) {
                req.body.choose_plan_list = req.body.choose_plan_list.map((plan, index) => {
                    if (!plan.price_usd || !plan.price_inr) {
                        throw new Error(`Plan ${index + 1} must have both USD and INR prices`);
                    }

                    return {
                        ...plan,
                        price_usd: typeof plan.price_usd === 'string' ? parseFloat(plan.price_usd) : plan.price_usd,
                        price_inr: typeof plan.price_inr === 'string' ? parseFloat(plan.price_inr) : plan.price_inr,
                    };
                });
            }

            const liveCourses = await LiveCourses.findByIdAndUpdate(_id, req.body, {
                new: true,
                runValidators: true
            });

            res.send({
                success: true,
                message: "Live course updated successfully!",
                data: liveCourses
            });
        } catch (error) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Failed to update live course"
            });
        }
    }
}

const deleteLiveCourses = {
    handler: async (req, res) => {
        try {
            const { _id } = req.params;

            const courseExist = await LiveCourses.findOne({ _id });

            if (!courseExist) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'Live course does not exist');
            }

            await LiveCourses.findByIdAndDelete(_id);

            res.send({
                success: true,
                message: 'Live course deleted successfully'
            });
        } catch (error) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Failed to delete live course"
            });
        }
    }
}

module.exports = {
    createLiveCourses,
    getAllCourses,
    getAllLiveCourses,
    getLiveCoursesById,
    updateLiveCourses,
    deleteLiveCourses
};