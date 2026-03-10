const express = require('express');
const validate = require('../../middlewares/validate');
const auth = require('../../middlewares/auth');
const catchAsync = require('../../utils/catchAsync');
const { flashcardController } = require('../../controllers');

const router = express.Router();

router
    .route('/')
    .post(auth(), validate(flashcardController.createFlashcard.validation), catchAsync(flashcardController.createFlashcard.handler))
    .get(auth(), catchAsync(flashcardController.getFlashcards.handler));

router
    .route('/:flashcardId')
    .patch(auth(), validate(flashcardController.updateFlashcard.validation), catchAsync(flashcardController.updateFlashcard.handler))
    .delete(auth(), validate(flashcardController.deleteFlashcard.validation), catchAsync(flashcardController.deleteFlashcard.handler));

module.exports = router;
