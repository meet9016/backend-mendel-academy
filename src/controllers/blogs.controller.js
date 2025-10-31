const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const Joi = require('joi');
const { Blogs } = require('../models');
const { handlePagination } = require('../utils/helper');

const createBlogs = {
    validation: {
        body: Joi.object().keys({
            exam_name: Joi.string().trim().required(),
            title: Joi.string().trim().required(),
            sort_description: Joi.string().trim().required(),
            long_description: Joi.string().trim().required(),
            date: Joi.date().required(),
            image: Joi.string().allow(),
            status: Joi.string().valid('Active', 'Inactive').optional(),
        }),
    },
    handler: async (req, res) => {
        try {
            const { exam_name } = req.body;
           
            // Check if blog exists
            const blogsExist = await Blogs.findOne({ exam_name });
           
            if (blogsExist) {
                return res.status(httpStatus.BAD_REQUEST).json({ message: 'Blog already exists' });
            }

            // Build image URL if file uploaded
            const baseUrl = req.protocol + "://" + req.get("host");
            const imageUrl = req.file?.filename
                ? `${baseUrl}/uploads/${req.file.filename}`
                : "";

            // Create blog document
            const blogs = await Blogs.create({
                ...req.body,
                image: imageUrl, // store as 'image' in DB
            });

            res.status(httpStatus.CREATED).json(blogs);

        } catch (error) {
            console.error("Error creating blog:", error);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
        }
    }

}

// const getAllBlogs = {

//     handler: async (req, res) => {
//         const blogs = await Blogs.find();
//         res.send(blogs);
//     }
// }

const getAllBlogs = {
    handler: async (req, res) => {
        const { status, search } = req.query;
        const query = {};

        if (status) query.status = status;
        if (search) query.title = { $regex: search, $options: "i" };
        
        await handlePagination(Blogs, req, res, query);
    },
};


const getBlogById = {

    handler: async (req, res) => {
        try {
            const { _id } = req.params;

            // 🔍 Find blog by MongoDB ID
            const blog = await Blogs.findById(_id);

            if (!blog) {
                return res.status(404).json({ message: "Blog not found" });
            }

            res.status(200).json(blog);
        } catch (error) {
            console.error("Error fetching blog by ID:", error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }
};

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
    getBlogById,
    updateBlogs,
    deleteBlogs
};