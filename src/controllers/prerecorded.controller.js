const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const Joi = require('joi');
const { PreRecord } = require('../models');
const { handlePagination } = require('../utils/helper');


const createPreRecorded = {
    validation: {
        body: Joi.object().keys({
            title: Joi.string().trim().required(),
            category: Joi.string(),
            total_reviews: Joi.number(),
            subtitle: Joi.string(),
            vimeo_video_id: Joi.string().trim().required(),
            rating: Joi.number(),
            price: Joi.string().trim().required(),
            duration: Joi.string().trim().required(),
            description: Joi.string().trim().required(),
            date: Joi.date(),
            status: Joi.string().valid('Active', 'Inactive').optional(),
        }),
    },
    handler: async (req, res) => {

        // const { exam_name } = req.body;

        // const blogsExist = await PreRecord.findOne({ exam_name });

        // if (blogsExist) {
        //     throw new ApiError(httpStatus.BAD_REQUEST, 'Pre-Recorded already exist');
        // }

        const pre_recorded = await PreRecord.create(req.body);

        res.status(httpStatus.CREATED).send(pre_recorded);
    }
}

const getAllPreRecorded = {
    handler: async (req, res) => {
        const { status, search } = req.query;

        const query = {};

        if (status) query.status = status;
        if (search) query.title = { $regex: search, $options: "i" };

        await handlePagination(PreRecord, req, res, query);
    }
}

const getPreRecordedById = {

    handler: async (req, res) => {
        try {
            const { _id } = req.params;

            // 🔍 Find blog by MongoDB ID
            const pre_recorded = await PreRecord.findById(_id);

            if (!pre_recorded) {
                return res.status(404).json({ message: "PreRecorded not found" });
            }

            res.status(200).json(pre_recorded);
        } catch (error) {
            console.error("Error fetching blog by ID:", error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }
};

const updatePreRecorded = {
    validation: {
        body: Joi.object().keys({
          title: Joi.string().trim().required(),
            category: Joi.string(),
            total_reviews: Joi.number(),
            subtitle: Joi.string(),
            vimeo_video_id: Joi.string().trim().required(),
            rating: Joi.number(),
            price: Joi.string().trim().required(),
            duration: Joi.string().trim().required(),
            description: Joi.string().trim().required(),
            date: Joi.date(),
            status: Joi.string().valid('Active', 'Inactive').optional(),
        }),
    },
    handler: async (req, res) => {

        const { _id } = req.params;

        const blogsExist = await PreRecord.findOne({ _id });

        if (!blogsExist) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'PreRecord not exist');
        }

        if (req.body?.title) {
            const blogsExist = await PreRecord.findOne({ name: req.body.title, _id: { $ne: _id } });
            if (blogsExist) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'PreRecord already exist');
            }
        }

        const blogs = await PreRecord.findByIdAndUpdate(_id, req.body, { new: true });

        res.send(blogs);
    }

}

const deletePreRecorded = {
    handler: async (req, res) => {
        const { _id } = req.params;

        const blogsExist = await PreRecord.findOne({ _id });

        if (!blogsExist) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'PreRecord not exist');
        }

        await PreRecord.findByIdAndDelete(_id);

        res.send({ message: 'PreRecord deleted successfully' });
    }
}

module.exports = {
    createPreRecorded,
    getAllPreRecorded,
    getPreRecordedById,
    updatePreRecorded,
    deletePreRecorded
};