const express = require('express');
const validate = require('../../middlewares/validate');
const auth = require('../../middlewares/auth');
const catchAsync = require('../../utils/catchAsync');
const { upCommingController } = require('../../controllers');
const upload = require('../../middlewares/upload');

const router = express.Router();

router.post('/create', upload.single("image"), validate(upCommingController.createUpcomingCourse.validation), catchAsync(upCommingController.createUpcomingCourse.handler));
// router.post('/create-question', auth(), validate(upCommingController.createQuestion.validation), catchAsync(upCommingController.createQuestion.handler));
router.get('/getall', catchAsync(upCommingController.getAllUpcomingCourse.handler));
router.get('/getById/:_id', catchAsync(upCommingController.getUpcomingById.handler));
router.put('/update/:_id', upload.single("image"), validate(upCommingController.updateUpComing.validation), catchAsync(upCommingController.updateUpComing.handler));
router.delete('/delete/:_id', catchAsync(upCommingController.deleteUpComing.handler));

module.exports = router;