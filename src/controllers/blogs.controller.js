const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const Joi = require('joi');
const { Blogs } = require('../models');
const { handlePagination } = require('../utils/helper');
const { uploadToExternalService, updateFileOnExternalService, deleteFileFromExternalService } = require('../utils/fileUpload');

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

            const blogsExist = await Blogs.findOne({ exam_name });

            if (blogsExist) {
                return res.status(httpStatus.BAD_REQUEST).json({ message: 'Blog already exists' });
            }

            let imageUrl = '';
            if (req.file) {
                imageUrl = await uploadToExternalService(req.file, 'blogs');
            }

            const blogs = await Blogs.create({
                ...req.body,
                image: imageUrl,
            });

            return res.status(201).json({
                success: true,
                message: "Blog created successfully!",
                blogs
            });
        } catch (error) {
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
            image: Joi.string().allow(),
            status: Joi.string().valid('Active', 'Inactive').optional(),
        })
            .prefs({ convert: true }),
    },
    handler: async (req, res) => {

        const { _id } = req.params;

        const blogsExist = await Blogs.findOne({ _id });

        if (!blogsExist) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Blogs not exist');
        }

        let imageUrl = blogsExist.image;
        if (req.file) {
            if (blogsExist.image) {
                imageUrl = await updateFileOnExternalService(blogsExist.image, req.file);
            } else {
                imageUrl = await uploadToExternalService(req.file, 'blogs');
            }
        }

        const updateData = {
            ...req.body,
            image: imageUrl,
        };

        const blogs = await Blogs.findByIdAndUpdate(_id, updateData, { new: true });

        res.send({
            success: true,
            message: "Blog updated successfully!",
            data: blogs,
        });
    }

}

const deleteBlogs = {
    handler: async (req, res) => {
        const { _id } = req.params;

        const blogsExist = await Blogs.findOne({ _id });

        if (!blogsExist) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Blogs not exist');
        }

        if (blogsExist.image) {
            await deleteFileFromExternalService(blogsExist.image);
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