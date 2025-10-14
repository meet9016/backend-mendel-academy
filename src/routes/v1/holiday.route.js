const express = require('express');
const validate = require('../../middlewares/validate');
const auth = require('../../middlewares/auth');
const catchAsync = require('../../utils/catchAsync');
const { holidayController } = require('../../controllers');

const router = express.Router();

router.post('/create', auth(), validate(holidayController.createHoliday.validation), catchAsync(holidayController.createHoliday.handler));

router.get('/get', auth(), catchAsync(holidayController.getAllHoliday.handler));

router.put('/update/:_id', auth(), validate(holidayController.updateHoliday.validation), catchAsync(holidayController.updateHoliday.handler));

router.delete('/delete/:_id', auth(), catchAsync(holidayController.deleteHoliday.handler));




module.exports = router;