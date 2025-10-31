const express = require("express");
const validate = require("../../middlewares/validate");
const catchAsync = require("../../utils/catchAsync");
const { examCategoryController } = require("../../controllers");

const router = express.Router();

router.post(
  "/create",
  validate(examCategoryController.createExamCategory.validation),
  catchAsync(examCategoryController.createExamCategory.handler)
);

router.get("/getall", catchAsync(examCategoryController.getAllExamCategories.handler));

router.get("/getById/:_id", catchAsync(examCategoryController.getExamCategoryById.handler));

router.put(
  "/update/:_id",
  validate(examCategoryController.updateExamCategory.validation),
  catchAsync(examCategoryController.updateExamCategory.handler)
);

router.delete(
  "/delete/:_id",
  catchAsync(examCategoryController.deleteExamCategory.handler)
);

module.exports = router;
