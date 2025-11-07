const express = require('express');
const validate = require('../../middlewares/validate');
const auth = require('../../middlewares/auth');
const catchAsync = require('../../utils/catchAsync');
const { faqController } = require('../../controllers');

const router = express.Router();

router.post('/create', validate(faqController.createFaq.validation), catchAsync(faqController.createFaq.handler));
router.get('/getAll', catchAsync(faqController.getAllFaq.handler));
router.get('/getById/:_id', catchAsync(faqController.getFaqById.handler));
router.put('/update/:_id', validate(faqController.updateFaq.validation), catchAsync(faqController.updateFaq.handler));
router.delete('/delete/:_id', catchAsync(faqController.deleteFaq.handler));

module.exports = router;