const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const Joi = require('joi');
const { LiveCourses } = require('../models');
const { handlePagination } = require('../utils/helper');


const createLiveCourses = {
    validation: {
        body: Joi.object().keys({
            course_title: Joi.string().trim().required(),
            date: Joi.date(),
            instructor_name: Joi.string().trim().required(),
            status: Joi.string().valid('Active', 'Inactive').optional(),
            sub_scribe_student_count: Joi.string().trim().required(),
            zoom_link: Joi.string().trim().required()
        }),
    },
    handler: async (req, res) => {

        // const { exam_name } = req.body;

        // const blogsExist = await LiveCourses.findOne({ exam_name });

        // if (blogsExist) {
        //     throw new ApiError(httpStatus.BAD_REQUEST, 'Pre-Recorded already exist');
        // }

        const pre_recorded = await LiveCourses.create(req.body);

        res.status(httpStatus.CREATED).send(pre_recorded);
    }
}

const getAllLiveCourses = {
    handler: async (req, res) => {
        const { status, search } = req.query;

        const query = {};

        if (status) query.status = status;
        if (search) query.title = { $regex: search, $options: "i" };

        await handlePagination(LiveCourses, req, res, query);
    }
}

const getLiveCoursesById = {

    handler: async (req, res) => {
        try {
            const { _id } = req.params;

            // 🔍 Find blog by MongoDB ID
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
            date: Joi.date(),
            instructor_name: Joi.string().trim().required(),
            status: Joi.string().valid('Active', 'Inactive').optional(),
            sub_scribe_student_count: Joi.string().trim().required(),
            zoom_link: Joi.string().trim().required()
        }),
    },
    handler: async (req, res) => {

        const { _id } = req.params;

        const blogsExist = await LiveCourses.findOne({ _id });

        if (!blogsExist) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'LiveCourses not exist');
        }

        if (req.body?.title) {
            const blogsExist = await LiveCourses.findOne({ name: req.body.title, _id: { $ne: _id } });
            if (blogsExist) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'LiveCourses already exist');
            }
        }

        const blogs = await LiveCourses.findByIdAndUpdate(_id, req.body, { new: true });

        res.send(blogs);
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
    getAllLiveCourses,
    getLiveCoursesById,
    updateLiveCourses,
    deleteLiveCourses
};