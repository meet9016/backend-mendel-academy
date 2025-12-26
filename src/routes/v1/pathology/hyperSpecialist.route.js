const express = require('express');
const validate = require('../../../middlewares/validate');
const auth = require('../../../middlewares/auth');
const catchAsync = require('../../../utils/catchAsync');
const { hyperSpecialistController } = require('../../../controllers');

const router = express.Router();

router.post('/create', validate(hyperSpecialistController.createHyperSpecialist.validation), catchAsync(hyperSpecialistController.createHyperSpecialist.handler));
router.get('/getall', catchAsync(hyperSpecialistController.getAllHyperSpecialist.handler));
router.get('/getById/:_id', catchAsync(hyperSpecialistController.getHyperSpecialistById.handler));
router.put('/update/:_id', validate(hyperSpecialistController.updateHyperSpecialist.validation), catchAsync(hyperSpecialistController.updateHyperSpecialist.handler));
router.delete('/delete/:_id', catchAsync(hyperSpecialistController.deleteHyperSpecialist.handler));

module.exports = router;