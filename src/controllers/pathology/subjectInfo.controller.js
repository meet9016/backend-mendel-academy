const httpStatus = require('http-status');
const Joi = require('joi');
const { SubjectInfo } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { uploadToExternalService, updateFileOnExternalService, deleteFileFromExternalService } = require('../../utils/fileUpload');

// Validation schemas
const lessonSchema = Joi.object({
  name: Joi.string().trim().required(),
  video_link: Joi.string().trim().allow('', null).optional(),
  image: Joi.string().allow('', null).optional(),
  tags: Joi.array().items(Joi.string().trim()).default([]),
  full_title: Joi.string().trim().allow('', null).optional(),
  description: Joi.string().trim().allow('', null).optional()
});

const topicSchema = Joi.object({
  title: Joi.string().trim().required(),
  lessons: Joi.array().items(lessonSchema).default([])
});

const chapterSchema = Joi.object({
  title: Joi.string().trim().required(),
  image: Joi.string().allow('', null).optional(),
  long_title: Joi.string().trim().allow('', null).optional(),
  topics: Joi.array().items(topicSchema).default([])
});

const createSubjectInfo = {
  validation: {
    body: Joi.object().keys({
      exam_id: Joi.string().required(),
      name: Joi.string().trim().required(),
      sku: Joi.string().trim().allow('', null).optional(),
      title: Joi.string().trim().allow('', null).optional(),
      description: Joi.string().trim().allow('', null).optional(),
      slogan: Joi.string().trim().allow('', null).optional(),
      chapters: Joi.string().required()
    }),
  },
  handler: async (req, res) => {
    try {
      console.log('Received request body:', req.body);
      console.log('Received files:', req.files?.length || 0);

      let imageUrl = '';
      if (req.files) {
        const mainImage = req.files.find(file => file.fieldname === 'image');
        if (mainImage) {
          imageUrl = await uploadToExternalService(mainImage, 'subject-info');
        }
      }

      let chapters = req.body.chapters ? JSON.parse(req.body.chapters) : [];
      console.log('Parsed chapters:', chapters);
      console.log('Exam ID:', req.body.exam_id);

      // Handle chapter and lesson images
      if (req.files) {
        for (const file of req.files) {
          if (file.fieldname.startsWith('chapter_image_')) {
            const index = parseInt(file.fieldname.replace('chapter_image_', ''));
            if (!isNaN(index) && chapters[index]) {
              const chapterImageUrl = await uploadToExternalService(file, 'subject-info-chapters');
              chapters[index].image = chapterImageUrl;
            }
          } else if (file.fieldname.startsWith('lesson_image_')) {
            // Format: lesson_image_{chapterIndex}_{topicIndex}_{lessonIndex}
            const parts = file.fieldname.split('_');
            if (parts.length === 5) {
              const chapterIndex = parseInt(parts[2]);
              const topicIndex = parseInt(parts[3]);
              const lessonIndex = parseInt(parts[4]);

              if (!isNaN(chapterIndex) && !isNaN(topicIndex) && !isNaN(lessonIndex) &&
                  chapters[chapterIndex] && chapters[chapterIndex].topics[topicIndex] &&
                  chapters[chapterIndex].topics[topicIndex].lessons[lessonIndex]) {
                const lessonImageUrl = await uploadToExternalService(file, 'subject-info-lessons');
                chapters[chapterIndex].topics[topicIndex].lessons[lessonIndex].image = lessonImageUrl;
              }
            }
          }
        }
      }

      const dataToSave = {
        exam_id: req.body.exam_id,
        name: req.body.name,
        sku: req.body.sku,
        title: req.body.title,
        description: req.body.description,
        slogan: req.body.slogan,
        image: imageUrl,
        chapters: chapters
      };

      console.log('Data to save:', dataToSave);

      const subjectInfo = await SubjectInfo.findOneAndUpdate(
        { exam_id: dataToSave.exam_id },
        dataToSave,
        { upsert: true, new: true, runValidators: true }
      );

      const isCreated = !subjectInfo.createdAt || subjectInfo.createdAt === subjectInfo.updatedAt;

      return res.status(isCreated ? 201 : 200).json({
        success: true,
        message: isCreated ? "Subject info created successfully!" : "Subject info updated successfully!",
        data: subjectInfo
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to create subject info",
        error: error.message
      });
    }
  }
};

const getAllSubjectInfo = {
  handler: async (req, res) => {
    try {
      const { exam_id } = req.query;

      const query = {};
      if (exam_id) query.exam_id = exam_id;

      const data = await SubjectInfo.find(query).populate('exam_id', 'category_name exams.exam_name').sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        data: data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch subject info"
      });
    }
  }
};

const getSubjectInfoByExamId = {
  handler: async (req, res) => {
    try {
      const { exam_id } = req.params;

      const subjectInfo = await SubjectInfo.find({ exam_id }).populate('exam_id', 'category_name exams.exam_name');

      if (!subjectInfo) {
        return res.status(404).json({
          success: false,
          message: "Subject info not found"
        });
      }

      res.status(200).json({
        success: true,
        data: subjectInfo
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: error.message
      });
    }
  }
};

const getByIdSubjectInfo = {
  handler: async (req, res) => {
    try {
      const { id } = req.params;

      const subjectInfo = await SubjectInfo.findById(id).populate('exam_id', 'category_name exams.exam_name');

      if (!subjectInfo) {
        return res.status(404).json({
          success: false,
          message: "Subject info not found"
        });
      }

      res.status(200).json({
        success: true,
        data: subjectInfo
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: error.message
      });
    }
  }
};

const updateSubjectInfo = {
  validation: {
    body: Joi.object().keys({
      id: Joi.string().required(),
      exam_id: Joi.string().optional(),
      name: Joi.string().trim().optional(),
      sku: Joi.string().trim().allow('', null).optional(),
      title: Joi.string().trim().allow('', null).optional(),
      description: Joi.string().trim().allow('', null).optional(),
      slogan: Joi.string().trim().allow('', null).optional(),
      chapters: Joi.string().optional()
    }),
  },
  handler: async (req, res) => {
    try {
      const { id } = req.body;

      const subjectInfoExist = await SubjectInfo.findById(id);

      if (!subjectInfoExist) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Subject info does not exist');
      }

      let imageUrl = subjectInfoExist.image;
      if (req.files) {
        const mainImage = req.files.find(file => file.fieldname === 'image');
        if (mainImage) {
          if (subjectInfoExist.image) {
            imageUrl = await updateFileOnExternalService(subjectInfoExist.image, mainImage);
          } else {
            imageUrl = await uploadToExternalService(mainImage, 'subject-info');
          }
        }
      }

      let chapters = req.body.chapters ? JSON.parse(req.body.chapters) : subjectInfoExist.chapters;

      // Handle chapter and lesson images
      if (req.files) {
        for (const file of req.files) {
          if (file.fieldname.startsWith('chapter_image_')) {
            const index = parseInt(file.fieldname.replace('chapter_image_', ''));
            if (!isNaN(index) && chapters[index]) {
              // Delete old chapter image if exists
              if (chapters[index].image) {
                await deleteFileFromExternalService(chapters[index].image);
              }
              const chapterImageUrl = await uploadToExternalService(file, 'subject-info-chapters');
              chapters[index].image = chapterImageUrl;
            }
          } else if (file.fieldname.startsWith('lesson_image_')) {
            // Format: lesson_image_{chapterIndex}_{topicIndex}_{lessonIndex}
            const parts = file.fieldname.split('_');
            if (parts.length === 5) {
              const chapterIndex = parseInt(parts[2]);
              const topicIndex = parseInt(parts[3]);
              const lessonIndex = parseInt(parts[4]);

              if (!isNaN(chapterIndex) && !isNaN(topicIndex) && !isNaN(lessonIndex) &&
                  chapters[chapterIndex] && chapters[chapterIndex].topics[topicIndex] &&
                  chapters[chapterIndex].topics[topicIndex].lessons[lessonIndex]) {

                // Delete old lesson image if exists
                if (chapters[chapterIndex].topics[topicIndex].lessons[lessonIndex].image) {
                  await deleteFileFromExternalService(chapters[chapterIndex].topics[topicIndex].lessons[lessonIndex].image);
                }

                const lessonImageUrl = await uploadToExternalService(file, 'subject-info-lessons');
                chapters[chapterIndex].topics[topicIndex].lessons[lessonIndex].image = lessonImageUrl;
              }
            }
          }
        }
      }

      const updateData = {
        ...req.body,
        image: imageUrl,
        chapters: chapters
      };

      const subjectInfo = await SubjectInfo.findByIdAndUpdate(id, updateData, { new: true });

      res.send({
        success: true,
        message: "Subject info updated successfully!",
        data: subjectInfo
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to update subject info"
      });
    }
  }
};

const deleteSubjectInfo = {
  handler: async (req, res) => {
    try {
      const { id } = req.params;

      const subjectInfoExist = await SubjectInfo.findById(id);

      if (!subjectInfoExist) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Subject info does not exist');
      }

      // Delete images
      if (subjectInfoExist.image) {
        await deleteFileFromExternalService(subjectInfoExist.image);
      }

      // Delete chapter images
      for (const chapter of subjectInfoExist.chapters) {
        if (chapter.image) {
          await deleteFileFromExternalService(chapter.image);
        }

        // Delete lesson images
        for (const topic of chapter.topics) {
          for (const lesson of topic.lessons) {
            if (lesson.image) {
              await deleteFileFromExternalService(lesson.image);
            }
          }
        }
      }

      await SubjectInfo.findByIdAndDelete(id);

      res.send({
        success: true,
        message: 'Subject info deleted successfully'
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to delete subject info"
      });
    }
  }
};

module.exports = {
  createSubjectInfo,
  getAllSubjectInfo,
  getSubjectInfoByExamId,
  getByIdSubjectInfo,
  updateSubjectInfo,
  deleteSubjectInfo
};