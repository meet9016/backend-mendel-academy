const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const Joi = require('joi');
const { Upcomming } = require('../models');
const { handlePagination } = require('../utils/helper');

const createUpcomingCourse = {
    validation: {
        body: Joi.object().keys({
            title: Joi.string().trim().required(),
            level: Joi.string().valid("Beginner", "Intermediate", "Advanced Level").required(),
            type: Joi.string().trim().required(),
            description: Joi.string().trim().required(),
            startDate: Joi.string().trim().required(),
            waitlistSpots: Joi.number().default(0),
            status: Joi.string().valid("open", "closed", "waitlist").default("waitlist"),
            image: Joi.string().trim(),
        }),
    },

    handler: async (req, res) => {
        try {
            const baseUrl = req.protocol + "://" + req.get("host");
            const imageUrl = req.file?.filename
                ? `${baseUrl}/uploads/${req.file.filename}`
                : "";

            // Create blog document
            const course = await Upcomming.create({
                ...req.body,
                image: imageUrl, // store as 'image' in DB
            });
            res.status(httpStatus.CREATED).send(course);
        } catch (error) {
            console.error("Error creating course:", error);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
        }
    }
};

const getAllUpcomingCourse = {
    handler: async (req, res) => {
        const { status, search } = req.query;

        const query = {};

        if (status) query.status = status;
        if (search) query.title = { $regex: search, $options: "i" };

        await handlePagination(Upcomming, req, res, query);
    }
}

const getUpcomingById = {

    handler: async (req, res) => {
        try {
            const { _id } = req.params;

            // 🔍 Find blog by MongoDB ID
            const up_comming = await Upcomming.findById(_id);

            if (!up_comming) {
                return res.status(404).json({ message: "Upcomming not found" });
            }

            res.status(200).json(up_comming);
        } catch (error) {
            console.error("Error fetching blog by ID:", error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }
};

const updateUpComing = {
    validation: {
        body: Joi.object().keys({
            title: Joi.string().trim().required(),
            level: Joi.string().valid("Beginner", "Intermediate", "Advanced Level").required(),
            type: Joi.string().trim().required(),
            description: Joi.string().trim().required(),
            startDate: Joi.string().trim().required(),
            waitlistSpots: Joi.number(),
            status: Joi.string().valid("open", "closed", "waitlist").optional(),
            image: Joi.string().trim(),
        }),
    },

    handler: async (req, res) => {

        const { _id } = req.params;

        // Check if course exists
        const courseExist = await Upcomming.findOne({ _id });

        if (!courseExist) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Upcoming course does not exist");
        }

        
        let imageUrl = courseExist.image;
        if (req.file?.filename) {
            const baseUrl = req.protocol + "://" + req.get("host");
            imageUrl = `${baseUrl}/uploads/${req.file.filename}`;
        }
        const updateData = {
            ...req.body,
            image: imageUrl,
        };

        // Update course
        const updated = await Upcomming.findByIdAndUpdate(_id, updateData, { new: true });

        res.send({
            success: true,
            message: "Course updated successfully",
            data: updated,
        });
    },
};

const deleteUpComing = {
    handler: async (req, res) => {
        const { _id } = req.params;

        const upComingRecordExist = await Upcomming.findOne({ _id });

        if (!upComingRecordExist) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Upcomming not exist');
        }

        await Upcomming.findByIdAndDelete(_id);

        res.send({ message: 'Upcomming deleted successfully' });
    }
}

module.exports = {
    createUpcomingCourse,
    getAllUpcomingCourse,
    getUpcomingById,
    updateUpComing,
    deleteUpComing
};