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
// const saveQuestionAnswer = {
//   validation: {
//     body: Joi.object().keys({
//       questionId: Joi.string().trim().required(),
//       selectedOption: Joi.string().allow(null).optional(),
//       isCorrect: Joi.boolean().allow(null).optional(),
//       timeSpentSeconds: Joi.number().integer().min(0).optional(),
//       note: Joi.string().allow('').optional(),
//       isMarked: Joi.boolean().optional(),
//     }),
//   },

//   handler: async (req, res) => {
//     try {
//       const { attemptId } = req.params;
//       const { questionId, selectedOption, isCorrect, timeSpentSeconds, note, isMarked } = req.body;

//       const attempt = await TestAttempt.findById(attemptId);

//       if (!attempt) {
//         throw new ApiError(httpStatus.NOT_FOUND, 'Test attempt not found');
//       }

//       if (attempt.status === 'completed') {
//         throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot modify completed test attempt');
//       }

//       // Find if question entry already exists in perQuestion array
//       const existingQuestionIndex = attempt.perQuestion.findIndex(
//         (item) => item.questionId === questionId
//       );

//       const questionData = {
//         questionId,
//         selectedOption: selectedOption || null,
//         isCorrect: isCorrect === null ? undefined : isCorrect,
//         timeSpentSeconds: timeSpentSeconds || 0,
//         note: note !== undefined ? note : '',
//         isMarked: isMarked !== undefined ? isMarked : false,
//         lastUpdatedAt: new Date(),
//       };

//       if (existingQuestionIndex >= 0) {
//         // Update existing entry
//         attempt.perQuestion[existingQuestionIndex] = {
//           ...attempt.perQuestion[existingQuestionIndex].toObject(),
//           ...questionData,
//         };
//       } else {
//         // Add new entry
//         attempt.perQuestion.push(questionData);
//       }

//       // Optionally update counts if isCorrect is provided
//       if (isCorrect !== null && isCorrect !== undefined) {
//         // Recalculate totals (optional - you might want to do this at the end)
//         const correctCount = attempt.perQuestion.filter(item => item.isCorrect === true).length;
//         const incorrectCount = attempt.perQuestion.filter(item => item.isCorrect === false).length;
//         const answeredCount = attempt.perQuestion.filter(item => item.selectedOption).length;

//         attempt.correctCount = correctCount;
//         attempt.incorrectCount = incorrectCount;
//         attempt.omittedCount = attempt.totalQuestions - answeredCount;
//       }

//       await attempt.save();

//       return res.status(httpStatus.OK).send({
//         success: true,
//         message: 'Answer saved successfully',
//         data: attempt.perQuestion[existingQuestionIndex >= 0 ? existingQuestionIndex : attempt.perQuestion.length - 1],
//       });
//     } catch (error) {
//       if (error instanceof ApiError) {
//         throw error;
//       }
//       throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to save answer');
//     }
//   },
// };



const saveQuestionAnswer = {
  validation: {
    body: Joi.object().keys({
      questionId: Joi.string().trim().required(),
      selectedOption: Joi.string().allow(null).optional(),
      isCorrect: Joi.boolean().allow(null).optional(),
      timeSpentSeconds: Joi.number().integer().min(0).optional(),
      note: Joi.string().allow('').optional(),
      isMarked: Joi.boolean().optional(),
    }),
  },

  handler: async (req, res) => {
    try {
      const { attemptId } = req.params;
      const { questionId, selectedOption, isCorrect, timeSpentSeconds, note, isMarked } = req.body;

      const attempt = await TestAttempt.findById(attemptId);

      if (!attempt) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Test attempt not found');
      }

      if (attempt.status === 'completed') {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot modify completed test attempt');
      }

      // Find if question entry already exists in perQuestion array
      const existingQuestionIndex = attempt.perQuestion.findIndex(
        (item) => item.questionId === questionId
      );

      // Check if the question is answered
      const isAnswered = selectedOption !== null && selectedOption !== undefined && selectedOption !== '';

      const questionData = {
        questionId,
        selectedOption: selectedOption || null,
        isCorrect: isCorrect !== null && isCorrect !== undefined ? isCorrect : null,
        isAnswered: isAnswered,
        timeSpentSeconds: timeSpentSeconds || 0,
        note: note !== undefined ? note : '',
        isMarked: isMarked !== undefined ? isMarked : false,
        lastUpdatedAt: new Date(),
      };

      let updatedQuestionData;

      if (existingQuestionIndex >= 0) {
        // Update existing entry
        attempt.perQuestion[existingQuestionIndex] = {
          ...attempt.perQuestion[existingQuestionIndex].toObject(),
          ...questionData,
        };
        updatedQuestionData = attempt.perQuestion[existingQuestionIndex];
      } else {
        // Add new entry
        attempt.perQuestion.push(questionData);
        updatedQuestionData = questionData;
      }

      // Update counts if isCorrect is provided
      if (isCorrect !== null && isCorrect !== undefined) {
        // Recalculate totals
        const correctCount = attempt.perQuestion.filter(item => item.isCorrect === true).length;
        const incorrectCount = attempt.perQuestion.filter(item => item.isCorrect === false).length;
        const answeredCount = attempt.perQuestion.filter(item => item.isAnswered === true).length;

        attempt.correctCount = correctCount;
        attempt.incorrectCount = incorrectCount;
        attempt.omittedCount = attempt.totalQuestions - answeredCount;
      }

      await attempt.save();

      return res.status(httpStatus.OK).send({
        success: true,
        message: 'Answer saved successfully',
        data: updatedQuestionData,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to save answer');
    }
  },
};
// Controller for bulk save (when moving between questions or ending test)
const bulkSaveAnswers = {
  validation: {
    body: Joi.object().keys({
      answers: Joi.array().items(
        Joi.object({
          questionId: Joi.string().trim().required(),
          selectedOption: Joi.string().allow(null).optional(),
          isCorrect: Joi.boolean().allow(null).optional(),
          timeSpentSeconds: Joi.number().integer().min(0).optional(),
          note: Joi.string().allow('').optional(),
          isMarked: Joi.boolean().optional(),
        })
      ).required(),
    }),
  },

  handler: async (req, res) => {
    try {
      const { attemptId } = req.params;
      const { answers } = req.body;

      const attempt = await TestAttempt.findById(attemptId);

      if (!attempt) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Test attempt not found');
      }

      if (attempt.status === 'completed') {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot modify completed test attempt');
      }

      // Process each answer
      for (const answer of answers) {
        const existingIndex = attempt.perQuestion.findIndex(
          (item) => item.questionId === answer.questionId
        );

        const questionData = {
          questionId: answer.questionId,
          selectedOption: answer.selectedOption || null,
          isAnswered: true,
          isCorrect: answer.isCorrect === null ? undefined : answer.isCorrect,
          timeSpentSeconds: answer.timeSpentSeconds || 0,
          note: answer.note !== undefined ? answer.note : '',
          isMarked: answer.isMarked !== undefined ? answer.isMarked : false,
          lastUpdatedAt: new Date(),
        };

        if (existingIndex >= 0) {
          attempt.perQuestion[existingIndex] = {
            ...attempt.perQuestion[existingIndex].toObject(),
            ...questionData,
          };
        } else {
          attempt.perQuestion.push(questionData);
        }
      }

      // Recalculate totals
      const correctCount = attempt.perQuestion.filter(item => item.isCorrect === true).length;
      const incorrectCount = attempt.perQuestion.filter(item => item.isCorrect === false).length;
      const answeredCount = attempt.perQuestion.filter(item => item.selectedOption).length;

      attempt.correctCount = correctCount;
      attempt.incorrectCount = incorrectCount;
      attempt.omittedCount = attempt.totalQuestions - answeredCount;

      await attempt.save();

      return res.status(httpStatus.OK).send({
        success: true,
        message: 'Answers saved successfully',
        data: {
          correctCount: attempt.correctCount,
          incorrectCount: attempt.incorrectCount,
          omittedCount: attempt.omittedCount,
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to save answers');
    }
  },
};

// Controller to save/update note only
const saveQuestionNote = {
  validation: {
    body: Joi.object().keys({
      note: Joi.string().allow('').required(),
    }),
  },

  handler: async (req, res) => {
    try {
      const { attemptId, questionId } = req.params;
      const { note } = req.body;

      const attempt = await TestAttempt.findById(attemptId);

      if (!attempt) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Test attempt not found');
      }

      if (attempt.status === 'completed') {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot modify completed test attempt');
      }

      // Find if question entry exists
      const existingIndex = attempt.perQuestion.findIndex(
        (item) => item.questionId === questionId
      );

      if (existingIndex >= 0) {
        // Update existing entry
        attempt.perQuestion[existingIndex].note = note;
        attempt.perQuestion[existingIndex].lastUpdatedAt = new Date();
      } else {
        // Create new entry just for the note
        attempt.perQuestion.push({
          questionId,
          note,
          selectedOption: null,
          isCorrect: null,
          timeSpentSeconds: 0,
          isMarked: false,
          lastUpdatedAt: new Date(),
        });
      }

      await attempt.save();

      return res.status(httpStatus.OK).send({
        success: true,
        message: 'Note saved successfully',
        note: note,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to save note');
    }
  },
};

// Controller to toggle mark status
const toggleQuestionMark = {
  validation: {
    body: Joi.object().keys({
      isMarked: Joi.boolean().required(),
    }),
  },

  handler: async (req, res) => {
    try {
      const { attemptId, questionId } = req.params;
      const { isMarked } = req.body;

      const attempt = await TestAttempt.findById(attemptId);

      if (!attempt) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Test attempt not found');
      }

      if (attempt.status === 'completed') {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot modify completed test attempt');
      }

      const existingIndex = attempt.perQuestion.findIndex(
        (item) => item.questionId === questionId
      );

      if (existingIndex >= 0) {
        attempt.perQuestion[existingIndex].isMarked = isMarked;
        attempt.perQuestion[existingIndex].lastUpdatedAt = new Date();
      } else {
        attempt.perQuestion.push({
          questionId,
          isMarked,
          selectedOption: null,
          isCorrect: null,
          timeSpentSeconds: 0,
          note: '',
          lastUpdatedAt: new Date(),
        });
      }

      await attempt.save();

      return res.status(httpStatus.OK).send({
        success: true,
        message: 'Mark status updated successfully',
        isMarked,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update mark status');
    }
  },
};

// Update the completeTestAttempt validation to match new schema
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
            selectedOption: Joi.string().allow(null).optional(),
            isCorrect: Joi.boolean().allow(null).required(),
            isAnswered: Joi.boolean().required(),
            timeSpentSeconds: Joi.number().integer().min(0).optional(),
            note: Joi.string().allow('').optional(),
            isMarked: Joi.boolean().optional(),
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

      // Merge existing perQuestion data with new data
      const existingPerQuestion = attempt.perQuestion || [];
      const mergedPerQuestion = perQuestion.map(newItem => {
        const existing = existingPerQuestion.find(e => e.questionId === newItem.questionId);
        return {
          ...(existing?.toObject ? existing.toObject() : existing),
          ...newItem,
          lastUpdatedAt: new Date(),
        };
      });

      // Add any existing items that weren't in the update
      const existingIds = new Set(perQuestion.map(p => p.questionId));
      const additionalItems = existingPerQuestion.filter(e => !existingIds.has(e.questionId));

      attempt.perQuestion = [...mergedPerQuestion, ...additionalItems];
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

const getTestAttemptDetail = {
  handler: async (req, res) => {
    try {
      const { id } = req.params;
      const attempt = await TestAttempt.findById(id).lean();

      if (!attempt) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Test attempt not found');
      }

      // Populate questions array
      const { AcademicQuestion, DemoQuestion } = require('../models');
      const questionIds = attempt.questionIds || [];
      const questions = [];

      if (questionIds.length > 0) {
        let qRecords = [];
        if (AcademicQuestion) {
          qRecords = await AcademicQuestion.find({ _id: { $in: questionIds } }).lean();
        }

        const foundIds = qRecords.map(q => q._id.toString());
        const missingIds = questionIds.filter(qId => !foundIds.includes(qId));

        let demoRecords = [];
        if (missingIds.length > 0 && DemoQuestion) {
          demoRecords = await DemoQuestion.find({ _id: { $in: missingIds } }).lean();
        }

        const allQuestions = [...qRecords, ...demoRecords];

        // Maintain original order
        for (const qId of questionIds) {
          const q = allQuestions.find(item => item._id.toString() === qId);
          if (q) {
            q.id = q._id.toString();
            questions.push(q);
          }
        }
      }

      attempt.questions = questions;
      attempt.id = attempt._id.toString();

      return res.status(httpStatus.OK).send(attempt);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to fetch test attempt');
    }
  },
};

// Export all controllers
module.exports = {
  createTestAttempt,
  listTestAttempts,
  getTestAttemptDetail,
  completeTestAttempt,
  saveQuestionAnswer,
  bulkSaveAnswers,
  saveQuestionNote,
  toggleQuestionMark,
};