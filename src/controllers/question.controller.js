const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const Joi = require('joi');
const { Question } = require('../models');


const createQuestion = {
  validation: {
    body: Joi.object().keys({
      title: Joi.string().trim().required(),
      description: Joi.string().allow('').required(),
      price: Joi.allow(''),
      duration: Joi.string().allow('').required(),
    }),
  },
  handler: async (req, res) => {

    const { title } = req.body;

    const questionExist = await Question.findOne({ title });

    if (questionExist) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Question already exist');
    }

    const question = await Question.create(req.body);

    res.status(httpStatus.CREATED).send(question);
  }
}

const getAllQuestion = {

  handler: async (req, res) => {
    const question = await Question.find();
    res.send(question);
  }
}

const getLiveCoursesById = {

    handler: async (req, res) => {
        try {
            const { _id } = req.params;

            // 🔍 Find blog by MongoDB ID
            const pre_recorded = await Question.findById(_id);

            if (!pre_recorded) {
                return res.status(404).json({ message: "Question not found" });
            }

            res.status(200).json(pre_recorded);
        } catch (error) {
            console.error("Error fetching blog by ID:", error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }
};

const updateQuestion = {
  validation: {
    body: Joi.object().keys({
      title: Joi.string().trim().required(),
      description: Joi.string().allow('').required(),
      price: Joi.allow(''),
      duration: Joi.string().allow('').required()
    }),
  },
  handler: async (req, res) => {

    const { _id } = req.params;

    const questionExist = await Question.findOne({ _id });

    if (!questionExist) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Question not exist');
    }

    if (req.body?.title) {
      const questionExist = await Question.findOne({ name: req.body.title, _id: { $ne: _id } });
      if (questionExist) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Question already exist');
      }
    }

    const question = await Question.findByIdAndUpdate(_id, req.body, { new: true });

    res.send(question);
  }

}

const deleteQuestion = {
  handler: async (req, res) => {
    const { _id } = req.params;

    const questionExist = await Question.findOne({ _id });

    if (!questionExist) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Question not exist');
    }

    await Question.findByIdAndDelete(_id);

    res.send({ message: 'Question deleted successfully' });
  }
}

module.exports = {
  createQuestion,
  getAllQuestion,
  getLiveCoursesById,
  updateQuestion,
  deleteQuestion
};