const express = require("express");
const validate = require("../../middlewares/validate");
const catchAsync = require("../../utils/catchAsync");
const { examCategoryController } = require("../../controllers");
const upload = require("../../middlewares/upload");

const router = express.Router();

router.post(
  "/create",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "who_can_enroll_image", maxCount: 1 },
  ]),
  validate(examCategoryController.createExamCategory.validation),
  catchAsync(examCategoryController.createExamCategory.handler)
);

router.get("/getall", catchAsync(examCategoryController.getAllExamCategories.handler));
router.get("/getById/:_id", catchAsync(examCategoryController.getExamCategoryById.handler));
router.get("/exam-category-list", catchAsync(examCategoryController.getAllExamsList.handler));
router.get("/get-plan/:planId", catchAsync(examCategoryController.getPlanById.handler));
router.put(
  "/update/:_id",
  upload.fields([
    { name: "who_can_enroll_image", maxCount: 1 },
    { name: "image", maxCount: 1 },
  ]),
  validate(examCategoryController.updateExamCategory.validation),
  catchAsync(examCategoryController.updateExamCategory.handler)
);

router.delete(
  "/delete/:_id",
  catchAsync(examCategoryController.deleteExamCategory.handler)
);

module.exports = router;
