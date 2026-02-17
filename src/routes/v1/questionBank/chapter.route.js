const express = require('express');
const validate = require('../../../middlewares/validate');
const { academicValidation } = require('../../../validations');
const {
  chapterController,
} = require('../../../controllers');

const router = express.Router();

// Chapter Routes
router.post("/create", validate(academicValidation.createChapter), chapterController.createChapter.handler);
router.get("/getall", validate(academicValidation.getChapters), chapterController.getChapters.handler);
router.get("/get-by-subject/:subjectId", validate(academicValidation.getChaptersBySubject), chapterController.getChaptersBySubject.handler);
router.get("/get-by-id/:chapterId", validate(academicValidation.getChapter), chapterController.getChapter.handler);
router.patch("/update/:chapterId", validate(academicValidation.updateChapter), chapterController.updateChapter.handler);
router.delete("/delete/:chapterId", validate(academicValidation.deleteChapter), chapterController.deleteChapter.handler);

module.exports = router;