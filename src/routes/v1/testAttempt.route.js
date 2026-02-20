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

module.exports = router;

