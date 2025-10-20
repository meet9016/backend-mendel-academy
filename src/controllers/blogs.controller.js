const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const Joi = require('joi');
const { Blogs } = require('../models');


const createBlogs = {
    validation: {
        body: Joi.object().keys({
            exam_name: Joi.string().trim().required(),
            title: Joi.string().trim().required(),
            sort_description: Joi.string().trim().required(),
            long_description: Joi.string().trim().required(),
            date: Joi.date().required(),
            image: Joi.string(),
            status: Joi.string().valid('Active', 'Inactive').optional(),
        }),
    },
    handler: async (req, res) => {

        const { exam_name } = req.body;

        const blogsExist = await Blogs.findOne({ exam_name });

        if (blogsExist) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Blog already exist');
        }

        const blogs = await Blogs.create(req.body);

        res.status(httpStatus.CREATED).send(blogs);
    }
}

const getAllBlogs = {

    handler: async (req, res) => {
        const blogs = await Blogs.find();
        res.send(blogs);
    }
}

const updateBlogs = {
    validation: {
        body: Joi.object().keys({
            exam_name: Joi.string().trim().required(),
            title: Joi.string().trim().required(),
            sort_description: Joi.string().trim().required(),
            long_description: Joi.string().trim().required(),
            date: Joi.date().required(),
            image: Joi.string(),
            status: Joi.string().valid('Active', 'Inactive').optional(),
        }),
    },
    handler: async (req, res) => {

        const { _id } = req.params;

        const blogsExist = await Blogs.findOne({ _id });

        if (!blogsExist) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Blogs not exist');
        }

        if (req.body?.title) {
            const blogsExist = await Blogs.findOne({ name: req.body.title, _id: { $ne: _id } });
            if (blogsExist) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'Blogs already exist');
            }
        }

        const blogs = await Blogs.findByIdAndUpdate(_id, req.body, { new: true });

        res.send(blogs);
    }

}

const deleteBlogs = {
    handler: async (req, res) => {
        const { _id } = req.params;

        const blogsExist = await Blogs.findOne({ _id });

        if (!blogsExist) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Blogs not exist');
        }

        await Blogs.findByIdAndDelete(_id);

        res.send({ message: 'Blogs deleted successfully' });
    }
}

module.exports = {
    createBlogs,
    getAllBlogs,
    updateBlogs,
    deleteBlogs
};