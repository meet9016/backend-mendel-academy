const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { Flashcard } = require('../models');
const ApiError = require('../utils/ApiError');
const Joi = require('joi');

const createFlashcard = {
    validation: {
        body: Joi.object().keys({
            testAttempt: Joi.string().required(),
            questionId: Joi.string().required(),
            front: Joi.string().required(),
            back: Joi.string().required(),
            tags: Joi.array().items(Joi.string()),
        }),
    },
    handler: async (req, res) => {
        const flashcard = await Flashcard.create({
            ...req.body,
            user: req.user.id,
        });
        res.status(httpStatus.CREATED).send(flashcard);
    },
};

const getFlashcards = {
    handler: async (req, res) => {
        const { testAttempt, questionId } = req.query;
        const filter = { user: req.user.id };
        if (testAttempt) filter.testAttempt = testAttempt;
        if (questionId) filter.questionId = questionId;

        const flashcards = await Flashcard.find(filter).sort({ createdAt: -1 });
        res.send(flashcards);
    },
};

const updateFlashcard = {
    validation: {
        params: Joi.object().keys({
            flashcardId: Joi.string().required(),
        }),
        body: Joi.object()
            .keys({
                front: Joi.string(),
                back: Joi.string(),
                tags: Joi.array().items(Joi.string()),
                testAttempt: Joi.string(),
                questionId: Joi.string(),
            })
            .min(1),
    },
    handler: async (req, res) => {
        const flashcard = await Flashcard.findOne({ _id: req.params.flashcardId, user: req.user.id });
        if (!flashcard) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Flashcard not found');
        }
        Object.assign(flashcard, req.body);
        await flashcard.save();
        res.send(flashcard);
    },
};

const deleteFlashcard = {
    validation: {
        params: Joi.object().keys({
            flashcardId: Joi.string().required(),
        }),
    },
    handler: async (req, res) => {
        const flashcard = await Flashcard.findOne({ _id: req.params.flashcardId, user: req.user.id });
        if (!flashcard) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Flashcard not found');
        }
        await Flashcard.findByIdAndDelete(req.params.flashcardId);
        res.status(httpStatus.NO_CONTENT).send();
    },
};

module.exports = {
    createFlashcard,
    getFlashcards,
    updateFlashcard,
    deleteFlashcard,
};
