const express = require('express');
const validate = require('../../middlewares/validate');
const auth = require('../../middlewares/auth');
const catchAsync = require('../../utils/catchAsync');
const { liveCoursesController } = require('../../controllers');

const router = express.Router();

router.post('/create', validate(liveCoursesController.createLiveCourses.validation), catchAsync(liveCoursesController.createLiveCourses.handler));
// router.post('/create-question', auth(), validate(liveCoursesController.createQuestion.validation), catchAsync(liveCoursesController.createQuestion.handler));
router.get('/getall', catchAsync(liveCoursesController.getAllLiveCourses.handler));
router.get('/getById/:_id', catchAsync(liveCoursesController.getLiveCoursesById.handler));
router.put('/update/:_id', validate(liveCoursesController.updateLiveCourses.validation), catchAsync(liveCoursesController.updateLiveCourses.handler));
router.delete('/delete/:_id', catchAsync(liveCoursesController.deleteLiveCourses.handler));

module.exports = router;