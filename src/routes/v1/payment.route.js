const express = require('express');
const validate = require('../../middlewares/validate');
const auth = require('../../middlewares/auth');
const catchAsync = require('../../utils/catchAsync');
const { paymentController } = require('../../controllers');

const router = express.Router();

router.post('/create', validate(paymentController.createPayment.validation), catchAsync(paymentController.createPayment.handler));
router.post("/verify-payment", validate(paymentController.verifyPayment.validation), catchAsync(paymentController.verifyPayment.handler));
// router.get('/getall', catchAsync(paymentController.getAllPreRecorded.handler));
// router.get('/getById/:_id', catchAsync(paymentController.getPreRecordedById.handler));
// router.put('/update/:_id', validate(paymentController.updatePreRecorded.validation), catchAsync(paymentController.updatePreRecorded.handler));
// router.delete('/delete/:_id', catchAsync(paymentController.deletePreRecorded.handler));

module.exports = router;