const express = require('express');
const validate = require('../../../middlewares/validate');
const catchAsync = require('../../../utils/catchAsync');
const { subjectInfoController } = require('../../../controllers');
const upload = require('../../../middlewares/upload');
const { uploadToExternalService } = require('../../../utils/fileUpload');

const router = express.Router();

// Upload single image and return URL (for Excel image URL helper)
router.post('/upload-image', upload.single('file'), catchAsync(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  const fileUrl = await uploadToExternalService(req.file, 'subject-info');
  return res.status(200).json({ success: true, file_url: fileUrl });
}));

router.post('/create', upload.any(), validate(subjectInfoController.createSubjectInfo.validation), catchAsync(subjectInfoController.createSubjectInfo.handler));
router.post('/bulk-upload', upload.any(), catchAsync(subjectInfoController.bulkUploadSubjectInfo.handler));
router.get('/getall', catchAsync(subjectInfoController.getAllSubjectInfo.handler));
router.get('/getByExamId/:exam_id', catchAsync(subjectInfoController.getSubjectInfoByExamId.handler));
router.get('/getById/:id', catchAsync(subjectInfoController.getByIdSubjectInfo.handler));
router.put('/update', upload.any(), validate(subjectInfoController.updateSubjectInfo.validation), catchAsync(subjectInfoController.updateSubjectInfo.handler));
router.delete('/delete/:id', catchAsync(subjectInfoController.deleteSubjectInfo.handler));

module.exports = router;