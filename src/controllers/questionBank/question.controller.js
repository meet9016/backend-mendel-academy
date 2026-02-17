const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const { AcademicQuestion, Topic } = require('../../models');
const pick = require('../../utils/pick');

const createAcademicQuestion = {
  handler: catchAsync(async (req, res) => {
    const topic = await Topic.findById(req.body.topic);
    if (!topic) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Topic not found');
    }
    const question = await AcademicQuestion.create(req.body);
    res.status(httpStatus.CREATED).send(question);
  }),
};

const getAcademicQuestions = {
  handler: catchAsync(async (req, res) => {
    let filter ={};
    if (req.query.search) {
      filter.search = { $regex: req.query.search, $options: 'i' };
    }
    // const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const questions = await AcademicQuestion.find(filter).populate('topic', 'name');
    res.send(questions);
  }),
};

const getQuestionsByTopic = {
  handler: catchAsync(async (req, res) => {
    const filter = { topic: req.params.topicId };
    if (req.query.search) {
      filter.search = { $regex: req.query.search, $options: 'i' };
    }
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const questions = await AcademicQuestion.find(filter, null, options).populate('topic', 'name');
    res.send(questions);
  }),
};

const getAcademicQuestion = {
  handler: catchAsync(async (req, res) => {
    const question = await AcademicQuestion.findById(req.params.questionId).populate('topic', 'name');
    if (!question) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Question not found');
    }
    res.send(question);
  }),
};

const updateAcademicQuestion = {
  handler: catchAsync(async (req, res) => {
    if (req.body.topic) {
      const topic = await Topic.findById(req.body.topic);
      if (!topic) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Topic not found');
      }
    }
    const question = await AcademicQuestion.findByIdAndUpdate(req.params.questionId, req.body, { new: true }).populate('topic', 'name');
    if (!question) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Question not found');
    }
    res.send(question);
  }),
};

const deleteAcademicQuestion = {
  handler: catchAsync(async (req, res) => {
    const question = await AcademicQuestion.findById(req.params.questionId);
    if (!question) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Question not found');
    }
    await question.deleteOne();
    res.status(httpStatus.NO_CONTENT).send();
  }),
};

module.exports = {
  createAcademicQuestion,
  getAcademicQuestions,
  getQuestionsByTopic,
  getAcademicQuestion,
  updateAcademicQuestion,
  deleteAcademicQuestion,
};
