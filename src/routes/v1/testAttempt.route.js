const express = require('express');
const validate = require('../../middlewares/validate');
const auth = require('../../middlewares/auth');
const catchAsync = require('../../utils/catchAsync');
const { testAttemptController } = require('../../controllers');

const router = express.Router();

router.post(
  '/create',
  validate(testAttemptController.createTestAttempt.validation),
  catchAsync(testAttemptController.createTestAttempt.handler)
);

router.get(
  '/list',
  catchAsync(testAttemptController.listTestAttempts.handler)
);

router.get(
  '/getDetail/:id',
  catchAsync(testAttemptController.getTestAttemptDetail.handler)
);

router.patch(
  '/complete/:attemptId',
  validate(testAttemptController.completeTestAttempt.validation),
  catchAsync(testAttemptController.completeTestAttempt.handler)
);

router.patch(
  '/questions/answer/:attemptId',
  validate(testAttemptController.saveQuestionAnswer.validation),
  catchAsync(testAttemptController.saveQuestionAnswer.handler)
);

router.patch(
  '/questions/bulk/:attemptId',
  validate(testAttemptController.bulkSaveAnswers.validation),
  catchAsync(testAttemptController.bulkSaveAnswers.handler)
);

router.patch(
  '/questions/note/:attemptId/:questionId',
  validate(testAttemptController.saveQuestionNote.validation),
  catchAsync(testAttemptController.saveQuestionNote.handler)
);

router.patch(
  '/questions/mark/:attemptId/:questionId',
  validate(testAttemptController.toggleQuestionMark.validation),
  catchAsync(testAttemptController.toggleQuestionMark.handler)
);

module.exports = router;

