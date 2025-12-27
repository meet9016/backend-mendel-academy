const express = require('express');
const validate = require('../../middlewares/validate');
const auth = require('../../middlewares/auth');
const catchAsync = require('../../utils/catchAsync');
const { termsConditionsController } = require('../../controllers');

const router = express.Router();

router.post('/create', validate(termsConditionsController.createOrUpdateTermsConditions.validation), catchAsync(termsConditionsController.createOrUpdateTermsConditions.handler));
router.get('/get', catchAsync(termsConditionsController.getTermsConditions.handler));

module.exports = router;