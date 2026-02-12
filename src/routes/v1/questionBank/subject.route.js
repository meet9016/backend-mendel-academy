const express = require('express');
const validate = require('../../../middlewares/validate');
const { academicValidation } = require('../../../validations');
const {
  subjectController
} = require('../../../controllers');

const router = express.Router();

// Subject Routes
router.post("/create", validate(academicValidation.createSubject), subjectController.createSubject.handler);
router.get("/getall", validate(academicValidation.getSubjects), subjectController.getSubjects.handler);
router.get("/get-by-id/:subjectId", validate(academicValidation.getSubject), subjectController.getSubject.handler);
router.patch("/update/:subjectId", validate(academicValidation.updateSubject), subjectController.updateSubject.handler);
router.delete("/delete/:subjectId", validate(academicValidation.deleteSubject), subjectController.deleteSubject.handler);

module.exports = router;