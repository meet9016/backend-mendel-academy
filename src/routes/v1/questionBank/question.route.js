const express = require('express');
const validate = require('../../../middlewares/validate');
const { academicValidation } = require('../../../validations');
const {
  academicQuestionController
} = require('../../../controllers');

const router = express.Router();

// Academic Question Routes
router.post("/create", validate(academicValidation.createAcademicQuestion), academicQuestionController.createAcademicQuestion.handler);
router.get("/getall", validate(academicValidation.getAcademicQuestions), academicQuestionController.getAcademicQuestions.handler);
router.get("/get-by-topic/:topicId", validate(academicValidation.getQuestionsByTopic), academicQuestionController.getQuestionsByTopic.handler);
router.get("/get-by-id/:questionId", validate(academicValidation.getAcademicQuestion), academicQuestionController.getAcademicQuestion.handler);
router.patch("/update/:questionId", validate(academicValidation.updateAcademicQuestion), academicQuestionController.updateAcademicQuestion.handler);
router.delete("/delete/:questionId", validate(academicValidation.deleteAcademicQuestion), academicQuestionController.deleteAcademicQuestion.handler);

router.get("/stats/subjects", academicQuestionController.getSubjectQuestionStats.handler);
router.get("/stats/chapters-by-subject/:subjectId", academicQuestionController.getChapterAndTopicStatsBySubject.handler);

module.exports = router;
