const express = require('express');
const validate = require('../../middlewares/validate');
const { demoQuestionValidation } = require('../../validations');
const { demoQuestionController } = require('../../controllers');

const router = express.Router();

router.post(
  '/create',
  validate(demoQuestionValidation.createDemoQuestion),
  demoQuestionController.createDemoQuestion.handler
);

router.get(
  '/list',
  demoQuestionController.listDemoQuestions.handler
);

router.get(
  '/:id',
  validate(demoQuestionValidation.getDemoQuestion),
  demoQuestionController.getDemoQuestion.handler
);

router.patch(
  '/:id',
  validate(demoQuestionValidation.updateDemoQuestion),
  demoQuestionController.updateDemoQuestion.handler
);

router.delete(
  '/:id',
  validate(demoQuestionValidation.deleteDemoQuestion),
  demoQuestionController.deleteDemoQuestion.handler
);

module.exports = router;
