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
            duration: Joi.string(),
            features: Joi.array().items(Joi.string()),
            status: Joi.string().trim(),
        }),
    },
    handler: async (req, res) => {
        try {
            // Create blog document
            const course = await UpCommingProgram.create(req.body);
            res.status(httpStatus.CREATED).send(course);
             return res.status(201).json({
                success: true,
                message: "UpComing Program created successfully",
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
            duration: Joi.string(),
            features: Joi.array().items(Joi.string()),
            status: Joi.string().trim(),
        }),
    },

    handler: async (req, res) => {

        const { _id } = req.params;

       const updates = req.body;

            const faq = await UpCommingProgram.findByIdAndUpdate(_id, updates, { new: true });

            if (!faq) {
                throw new ApiError(httpStatus.NOT_FOUND, "FAQ not found");
            }


        res.send({
                success: true,
                message: "UpComming Program updated successfully",
                faq
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