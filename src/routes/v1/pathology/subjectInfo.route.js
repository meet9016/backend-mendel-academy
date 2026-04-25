const express = require('express');
const validate = require('../../../middlewares/validate');
const catchAsync = require('../../../utils/catchAsync');
const { subjectInfoController } = require('../../../controllers');
const upload = require('../../../middlewares/upload');

const router = express.Router();

router.post('/create', upload.any(), validate(subjectInfoController.createSubjectInfo.validation), catchAsync(subjectInfoController.createSubjectInfo.handler));
router.post('/bulk-upload', upload.any(), catchAsync(subjectInfoController.bulkUploadSubjectInfo.handler));
router.get('/getall', catchAsync(subjectInfoController.getAllSubjectInfo.handler));
router.get('/getByExamId/:exam_id', catchAsync(subjectInfoController.getSubjectInfoByExamId.handler));
router.get('/getById/:id', catchAsync(subjectInfoController.getByIdSubjectInfo.handler));
router.put('/update', upload.any(), validate(subjectInfoController.updateSubjectInfo.validation), catchAsync(subjectInfoController.updateSubjectInfo.handler));
router.delete('/delete/:id', catchAsync(subjectInfoController.deleteSubjectInfo.handler));

module.exports = router;