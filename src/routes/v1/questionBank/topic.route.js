const express = require('express');
const validate = require('../../../middlewares/validate');
const { academicValidation } = require('../../../validations');
const { topicController } = require('../../../controllers');

const router = express.Router();


// Topic Routes
router.post("/create", validate(academicValidation.createTopic), topicController.createTopic.handler);
router.get("/getall", validate(academicValidation.getTopics), topicController.getTopics.handler);
router.get("/get-by-chapter/:chapterId", validate(academicValidation.getTopicsByChapter), topicController.getTopicsByChapter.handler);
router.get("/get-by-id/:topicId", validate(academicValidation.getTopic), topicController.getTopic.handler);
router.patch("/update/:topicId", validate(academicValidation.updateTopic), topicController.updateTopic.handler);
router.delete("/delete/:topicId", validate(academicValidation.deleteTopic), topicController.deleteTopic.handler);

module.exports = router;