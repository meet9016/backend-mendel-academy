const express = require('express');
const validate = require('../../middlewares/validate');
const auth = require('../../middlewares/auth');
const catchAsync = require('../../utils/catchAsync');
const { contactUsController } = require('../../controllers');

const router = express.Router();

router.post('/create', validate(contactUsController.createContact.validation), catchAsync(contactUsController.createContact.handler));
router.get('/getall', catchAsync(contactUsController.getAllContactUs.handler));
router.delete('/delete/:_id', catchAsync(contactUsController.deleteContactUs.handler));

module.exports = router;