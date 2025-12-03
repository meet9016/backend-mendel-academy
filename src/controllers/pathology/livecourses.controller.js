const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const Joi = require('joi');
const { LiveCourses } = require('../../models');
const { handlePagination, sortAndFormat } = require('../../utils/helper');


const createLiveCourses = {
    validation: {
        body: Joi.object().keys({
            course_title: Joi.string().trim().required(),
            instructor: Joi.object({
                name: Joi.string().trim().required(),
                qualification: Joi.string().trim().allow(""),
                // image: Joi.string().trim().allow("")
            }).required(),
            tags: Joi.array().items(Joi.string().trim()).optional(),
            date: Joi.date().required(),
            instructor_name: Joi.string().trim().required(),
            status: Joi.string().valid("live", "recorded", "upcoming").default("live"),
            isSoldOut: Joi.boolean().default(false),
            duration: Joi.string().allow("").optional(),
            zoom_link: Joi.string().trim().required(),
            choose_plan_list: Joi.array()
                .items(
                    Joi.object({
                        moduleNumber: Joi.string(),
                        title: Joi.string().trim().required(),
                        subtitle: Joi.string().trim().allow(""),
                        description: Joi.string().trim().allow(""),
                        // 👉 YOUR SCHEMA USES SINGLE NUMBER PRICE
                        price: Joi.number().required(),
                        features: Joi.array()
                            .items(Joi.string().trim())
                            .min(1)
                            .required(),
                        isMostPopular: Joi.boolean().default(false)
                    })
                )
                .min(1)
                .required()
        })
    },
    handler: async (req, res) => {

        try {
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
        const { status, search } = req.query;

        const query = {};

        if (status) query.status = status;
        if (search) query.title = { $regex: search, $options: "i" };

        await handlePagination(LiveCourses, req, res, query);
    }
}

const getAllLiveCourses = {
    handler: async (req, res) => {
        // const { search } = req.query;

        // // Always show only live courses
        // const query = { status: "live" };

        // // Search filter
        // if (search) {
        //     query.title = { $regex: search, $options: "i" };
        // }

        // await handlePagination(LiveCourses, req, res, query);
        try {
              const courses = await LiveCourses.find({ status: "live" });

            const result = sortAndFormat(courses, "date");

            res.status(200).json(result);

        } catch (error) {
            res.status(500).json({ message: "Internal Server Error" });
        }
    }
}

const getLiveCoursesById = {

    handler: async (req, res) => {
        try {
            const { _id } = req.params;

            // Find blog by MongoDB ID
            const pre_recorded = await LiveCourses.findById(_id);

            if (!pre_recorded) {
                return res.status(404).json({ message: "LiveCourses not found" });
            }

            res.status(200).json(pre_recorded);
        } catch (error) {
            console.error("Error fetching blog by ID:", error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }
};

const updateLiveCourses = {
    validation: {
        body: Joi.object().keys({
            course_title: Joi.string().trim().required(),
            instructor: Joi.object({
                name: Joi.string().trim().required(),
                qualification: Joi.string().trim().allow(""),
                image: Joi.string().trim().allow("")
            }).required(),
            tags: Joi.array().items(Joi.string().trim()).optional(),
            date: Joi.date().required(),
            instructor_name: Joi.string().trim().required(),
            status: Joi.string().valid("live", "recorded", "upcoming").default("live"),
            isSoldOut: Joi.boolean().default(false),
            duration: Joi.string().allow("").optional(),
            zoom_link: Joi.string().trim().required(),
            choose_plan_list: Joi.array()
                .items(
                    Joi.object({
                        moduleNumber: Joi.number().required(),
                        title: Joi.string().trim().required(),
                        subtitle: Joi.string().trim().allow(""),
                        description: Joi.string().trim().allow(""),
                        // 👉 YOUR SCHEMA USES SINGLE NUMBER PRICE
                        price: Joi.number().required(),
                        features: Joi.array()
                            .items(Joi.string().trim())
                            .min(1)
                            .required(),
                        isMostPopular: Joi.boolean().default(false)
                    })
                )
                .min(1)
                .required()
        })
    },
    handler: async (req, res) => {

        const { _id } = req.params;

        const liveCoursesExist = await LiveCourses.findOne({ _id });

        if (!liveCoursesExist) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'LiveCourses not exist');
        }

        if (req.body?.title) {
            const liveCoursesExist = await LiveCourses.findOne({ name: req.body.title, _id: { $ne: _id } });
            if (liveCoursesExist) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'LiveCourses already exist');
            }
        }

        const liveCourses = await LiveCourses.findByIdAndUpdate(_id, req.body, { new: true });

        res.send(liveCourses);
        res.send({
            success: true,
            message: "Live Courses updated successfully!",
            liveCourses
        });
    }

}

const deleteLiveCourses = {
    handler: async (req, res) => {
        const { _id } = req.params;

        const blogsExist = await LiveCourses.findOne({ _id });

        if (!blogsExist) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'LiveCourses not exist');
        }

        await LiveCourses.findByIdAndDelete(_id);

        res.send({ message: 'LiveCourses deleted successfully' });
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