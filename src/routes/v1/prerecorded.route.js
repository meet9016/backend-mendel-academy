const express = require('express');
const validate = require('../../middlewares/validate');
const auth = require('../../middlewares/auth');
const catchAsync = require('../../utils/catchAsync');
const { preRecordedController } = require('../../controllers');

const router = express.Router();

router.post('/create', validate(preRecordedController.createPreRecorded.validation), catchAsync(preRecordedController.createPreRecorded.handler));
// router.post('/create-question', auth(), validate(preRecordedController.createQuestion.validation), catchAsync(preRecordedController.createQuestion.handler));
router.get('/getall', catchAsync(preRecordedController.getAllPreRecorded.handler));
router.get('/getById/:_id', catchAsync(preRecordedController.getPreRecordedById.handler));
router.put('/update/:_id', validate(preRecordedController.updatePreRecorded.validation), catchAsync(preRecordedController.updatePreRecorded.handler));
router.delete('/delete/:_id', catchAsync(preRecordedController.deletePreRecorded.handler));

module.exports = router;