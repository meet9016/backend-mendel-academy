const express = require('express');
const validate = require('../../middlewares/validate');
const auth = require('../../middlewares/auth');
const catchAsync = require('../../utils/catchAsync');
const { categoryController } = require('../../controllers');

const router = express.Router();
router.post('/create-category', validate(categoryController.createCategory.validation), catchAsync(categoryController.createCategory.handler));
// router.post('/create-category', auth(), validate(categoryController.createCategory.validation), catchAsync(categoryController.createCategory.handler));
router.get('/get-all-category', auth(), catchAsync(categoryController.getAllCategories.handler));

module.exports = router;