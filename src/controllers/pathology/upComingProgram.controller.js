const httpStatus = require('http-status');
// const ApiError = require('../utils/ApiError');
const Joi = require('joi');
const UpCommingProgram = require('../../models/pathology/upComingProgram.model');
const ApiError = require('../../utils/ApiError');
const { handlePagination } = require('../../utils/helper');

const createUpcomingProgram = {
    validation: {
        body: Joi.object().keys({
            title: Joi.string().trim().required(),
            waitlistCount: Joi.number(),
            description: Joi.string(),
            date: Joi.date().required(),
            image: Joi.string().allow(),
            course_types: Joi.string(),
            // status: Joi.string().trim(),
        }),
    },
    handler: async (req, res) => {
        try {
            // Create blog document
            const baseUrl = req.protocol + "://" + req.get("host");
            const imageUrl = req.file?.filename
                ? `${baseUrl}/uploads/${req.file.filename}`
                : "";

            // Create blog document
            const course = await UpCommingProgram.create({
                ...req.body,
                image: imageUrl, // store as 'image' in DB
            });

            return res.status(201).json({
                success: true,
                message: "Upcoming program created successfully!",
                data: course
            });
        } catch (error) {
            console.error("Error creating course:", error);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
        }
    }
};

const getAllUpcomingProgram = {
    handler: async (req, res) => {
        const { status, search } = req.query;

        const query = {};

        if (status) query.status = status;
        if (search) query.title = { $regex: search, $options: "i" };

        await handlePagination(UpCommingProgram, req, res, query);
    }
}

const getUpcomingProgramById = {

    handler: async (req, res) => {
        try {
            const { _id } = req.params;

            // 🔍 Find blog by MongoDB ID
            const up_comming = await UpCommingProgram.findById(_id);

            if (!up_comming) {
                return res.status(404).json({ message: "UpCommingProgram not found" });
            }

            res.status(200).json(up_comming);
        } catch (error) {
            console.error("Error fetching blog by ID:", error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }
};

const updateUpComingProgram = {
    validation: {
        body: Joi.object().keys({
            title: Joi.string().trim().required(),
            waitlistCount: Joi.number(),
            description: Joi.string(),
            date: Joi.date().required(),
            image: Joi.string().allow(),
            course_types: Joi.string(),
        }),
    },

    handler: async (req, res) => {

        const { _id } = req.params;

        const courseExist = await UpCommingProgram.findOne({ _id });

        if (!courseExist) {
            throw new ApiError(httpStatus.NOT_FOUND, "FAQ not found");
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

        const course = await UpCommingProgram.findByIdAndUpdate(_id, updateData, { new: true });

        res.send({
            success: true,
            message: "Upcoming program updated successfully!",
            course
        });
    },
};

const deleteUpComingProgram = {
    handler: async (req, res) => {
        const { _id } = req.params;

        const upComingRecordExist = await UpCommingProgram.findOne({ _id });

        if (!upComingRecordExist) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'UpCommingProgram not exist');
        }

        await UpCommingProgram.findByIdAndDelete(_id);

        res.send({ message: 'UpCommingProgram deleted successfully' });
    }
}

module.exports = {
    createUpcomingProgram,
    getAllUpcomingProgram,
    getUpcomingProgramById,
    updateUpComingProgram,
    deleteUpComingProgram
};