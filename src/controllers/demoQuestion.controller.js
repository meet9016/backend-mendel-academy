const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { DemoQuestion } = require('../models');

const createDemoQuestion = {
  handler: catchAsync(async (req, res) => {
    const question = await DemoQuestion.create(req.body);
    res.status(httpStatus.CREATED).send(question);
  }),
};

const listDemoQuestions = {
  handler: catchAsync(async (req, res) => {
    const questions = await DemoQuestion.find({}).sort({ createdAt: 1 });
    res.send(questions);
  }),
};

const getDemoQuestion = {
  handler: catchAsync(async (req, res) => {
    const question = await DemoQuestion.findById(req.params.id);
    if (!question) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Demo question not found');
    }
    res.send(question);
  }),
};

const updateDemoQuestion = {
  handler: catchAsync(async (req, res) => {
    const question = await DemoQuestion.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!question) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Demo question not found');
    }
    res.send(question);
  }),
};

const deleteDemoQuestion = {
  handler: catchAsync(async (req, res) => {
    const question = await DemoQuestion.findById(req.params.id);
    if (!question) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Demo question not found');
    }
    await question.deleteOne();
    res.status(httpStatus.NO_CONTENT).send();
  }),
};

module.exports = {
  createDemoQuestion,
  listDemoQuestions,
  getDemoQuestion,
  updateDemoQuestion,
  deleteDemoQuestion,
};

