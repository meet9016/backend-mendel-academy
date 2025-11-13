const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const Joi = require('joi');
const { ContactUs } = require('../models');
const { handlePagination } = require('../utils/helper');

const createContact = {
    validation: {
        body: Joi.object().keys({
            first_name: Joi.string().trim().required(),
            last_name: Joi.string().trim().required(),
            email: Joi.string().trim().required(),
            medical_school: Joi.string().trim().required(),
            graduation_year: Joi.date().required(),
        }),
    },
    handler: async (req, res) => {
        try {
            const { email } = req.body;

            // Check if blog exists
            // const contactusExist = await ContactUs.findOne({ email });

            const pre_recorded = await ContactUs.create(req.body);

            res.status(httpStatus.CREATED).send(pre_recorded);
        } catch (error) {
            console.error("Error creating blog:", error);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
        }
    }

}

const getAllContactUs = {
    handler: async (req, res) => {
        const { status, search } = req.query;

        const query = {};

        if (status) query.status = status;
        if (search) query.title = { $regex: search, $options: "i" };

        await handlePagination(ContactUs, req, res, query);
    }
}

const deleteContactUs = {
    handler: async (req, res) => {
        const { _id } = req.params;

        const contactUsExist = await ContactUs.findOne({ _id });

        if (!contactUsExist) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'ContactUs not exist');
        }

        await ContactUs.findByIdAndDelete(_id);

        res.send({ message: 'ContactUs deleted successfully' });
    }
}

module.exports = {
    createContact,
    getAllContactUs,
    deleteContactUs
};