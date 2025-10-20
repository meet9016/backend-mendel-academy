const express = require('express');
const validate = require('../../middlewares/validate');
const auth = require('../../middlewares/auth');
const catchAsync = require('../../utils/catchAsync');
const { blogsController } = require('../../controllers');

const router = express.Router();

router.post('/create-blogs', validate(blogsController.createBlogs.validation), catchAsync(blogsController.createBlogs.handler));
// router.post('/create-question', auth(), validate(blogsController.createQuestion.validation), catchAsync(blogsController.createQuestion.handler));
router.get('/getall', catchAsync(blogsController.getAllBlogs.handler));
router.put('/update/:_id', validate(blogsController.updateBlogs.validation), catchAsync(blogsController.updateBlogs.handler));
router.delete('/delete/:_id', catchAsync(blogsController.deleteBlogs.handler));

module.exports = router;