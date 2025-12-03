const express = require('express');
const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const catchAsync = require('../../../utils/catchAsync');
const { upCommingProgramController } = require('../../../controllers');
const upload = require('../../../middlewares/upload');

const router = express.Router();

router.post('/create', upload.single("image"), validate(upCommingProgramController.createUpcomingProgram.validation), catchAsync(upCommingProgramController.createUpcomingProgram.handler));
// router.post('/create-question', auth(), validate(upCommingProgramController.createQuestion.validation), catchAsync(upCommingProgramController.createQuestion.handler));
router.get('/getall', catchAsync(upCommingProgramController.getAllUpcomingProgram.handler));
router.get('/getById/:_id', catchAsync(upCommingProgramController.getUpcomingProgramById.handler));
router.put('/update/:_id', upload.single("image"), validate(upCommingProgramController.updateUpComingProgram.validation), catchAsync(upCommingProgramController.updateUpComingProgram.handler));
router.delete('/delete/:_id', catchAsync(upCommingProgramController.deleteUpComingProgram.handler));

module.exports = router;