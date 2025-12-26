const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const Joi = require('joi');
const { HyperSpecialist } = require('../../models');
const { handlePagination, sortAndFormat } = require('../../utils/helper');

const createHyperSpecialist = {
    validation: {
        body: Joi.object().keys({
            title: Joi.string().trim().required(),
            description: Joi.string().trim().required(),
            tags: Joi.array().items(Joi.string().trim()).optional(),
            price_dollar: Joi.number().required(),
            price_inr: Joi.number().required(),
        })
    },
    handler: async (req, res) => {

        try {
            const course = await HyperSpecialist.create(req.body);

            return res.status(201).json({
                success: true,
                message: "HyperSpecialist created successfully!",
                data: course,
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: "Failed to create HyperSpecialist",
                error: error.message,
            });
        }
    }
}

const getAllHyperSpecialist = {
    handler: async (req, res) => {
        const { status, search } = req.query;

        const query = {};

        if (status) query.status = status;
        if (search) query.title = { $regex: search, $options: "i" };

        await handlePagination(HyperSpecialist, req, res, query);
    }
}

const getHyperSpecialistById = {

    handler: async (req, res) => {
        try {
            const { _id } = req.params;

            // Find blog by MongoDB ID
            const data = await HyperSpecialist.findById(_id);

            if (!data) {
                return res.status(404).json({ message: "HyperSpecialist not found" });
            }

            res.status(200).json(data);
        } catch (error) {
            console.error("Error fetching blog by ID:", error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }
};

const updateHyperSpecialist = {
    validation: {
        body: Joi.object().keys({
            title: Joi.string().trim().required(),
            description: Joi.string().trim().required(),
            tags: Joi.array().items(Joi.string().trim()).optional(),
            price_dollar: Joi.number().required(),
            price_inr: Joi.number().required(),
        })
    },
    handler: async (req, res) => {

        const { _id } = req.params;

        const Exist = await HyperSpecialist.findOne({ _id });

        if (!Exist) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'HyperSpecialist not exist');
        }

        if (req.body?.title) {
            const Exist = await HyperSpecialist.findOne({ name: req.body.title, _id: { $ne: _id } });
            if (Exist) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'HyperSpecialist already exist');
            }
        }

        const liveCourses = await HyperSpecialist.findByIdAndUpdate(_id, req.body, { new: true });

        res.send({
            success: true,
            message: "HyperSpecialist updated successfully!",
            liveCourses
        });
    }

}

const deleteHyperSpecialist = {
    handler: async (req, res) => {
        const { _id } = req.params;

        const HyperSpecialistExist = await HyperSpecialist.findOne({ _id });

        if (!HyperSpecialistExist) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'HyperSpecialist not exist');
        }

        await HyperSpecialist.findByIdAndDelete(_id);

        res.send({ message: 'HyperSpecialist deleted successfully' });
    }
}

module.exports = {
    createHyperSpecialist,
    getAllHyperSpecialist,
    getHyperSpecialistById,
    updateHyperSpecialist,
    deleteHyperSpecialist
};