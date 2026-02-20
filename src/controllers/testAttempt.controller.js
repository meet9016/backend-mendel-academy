const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const Joi = require('joi');
const { TestAttempt } = require('../models');

const createTestAttempt = {
  validation: {
    body: Joi.object().keys({
      mode: Joi.string().valid('tutor', 'timed').required(),
      subjects: Joi.array().items(Joi.string().trim()).default([]),
      chapters: Joi.array().items(Joi.string().trim()).default([]),
      totalQuestions: Joi.number().integer().min(1).required(),
      startedAt: Joi.date().iso().required(),
      questionIds: Joi.array().items(Joi.string().trim()).min(1).required(),
    }),
  },

  handler: async (req, res) => {
    try {
      const { mode, subjects, chapters, totalQuestions, startedAt, questionIds } = req.body;

      const attempt = await TestAttempt.create({
        mode,
        subjects,
        chapters,
        totalQuestions,
        startedAt,
        questionIds,
        status: 'in_progress',
      });

      return res.status(httpStatus.CREATED).send(attempt);
    } catch (error) {
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
        success: false,
        message: error.message,
      });
    }
  },
};

const listTestAttempts = {
  handler: async (req, res) => {
    try {
      const attempts = await TestAttempt.find().sort({ createdAt: -1 });
      return res.status(httpStatus.OK).send(attempts);
    } catch (error) {
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
        success: false,
        message: error.message,
      });
    }
  },
};

const getTestAttemptDetail = {
  handler: async (req, res) => {
    try {
      const { id } = req.params;
      const attempt = await TestAttempt.findById(id);

      if (!attempt) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Test attempt not found');
      }

      return res.status(httpStatus.OK).send(attempt);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to fetch test attempt');
    }
  },
};

const completeTestAttempt = {
  validation: {
    body: Joi.object().keys({
      correctCount: Joi.number().integer().min(0).required(),
      incorrectCount: Joi.number().integer().min(0).required(),
      omittedCount: Joi.number().integer().min(0).required(),
      perQuestion: Joi.array()
        .items(
          Joi.object({
            questionId: Joi.string().trim().required(),
            isCorrect: Joi.boolean().required(),
            isAnswered: Joi.boolean().required(),
          })
        )
        .default([]),
      completedAt: Joi.date().iso().optional(),
    }),
  },

  handler: async (req, res) => {
    try {
      const { attemptId } = req.params;
      const { correctCount, incorrectCount, omittedCount, perQuestion, completedAt } = req.body;

      const attempt = await TestAttempt.findById(attemptId);

      if (!attempt) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Test attempt not found');
      }

      attempt.correctCount = correctCount;
      attempt.incorrectCount = incorrectCount;
      attempt.omittedCount = omittedCount;
      attempt.perQuestion = perQuestion || [];
      attempt.completedAt = completedAt || new Date();
      attempt.status = 'completed';

      await attempt.save();

      return res.status(httpStatus.OK).send(attempt);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to complete test attempt');
    }
  },
};

module.exports = {
  createTestAttempt,
  listTestAttempts,
  getTestAttemptDetail,
  completeTestAttempt,
};

