const httpStatus = require('http-status');
const Joi = require('joi');
const ExcelJS = require('exceljs');
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

      // FIX: Use save() for creating new document instead of findOneAndUpdate with upsert
      const subjectInfo = new SubjectInfo(dataToSave);
      await subjectInfo.save();

      return res.status(201).json({
        success: true,
        message: "Subject info created successfully!",
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

// Helper: parse one worksheet into array of row objects
// Empty cell = inherit value from row above (fill-down)
const parseSheet = (worksheet) => {
  const rows = [];
  const headers = [];
  const lastValues = {};

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell) => headers.push(cell.value?.toString().trim() || ''));
    } else {
      const rowData = {};
      headers.forEach((header, idx) => {
        const cell = row.getCell(idx + 1);
        const val = cell.value?.toString().trim() || '';
        if (val) {
          lastValues[header] = val;
        }
        rowData[header] = lastValues[header] || '';
      });
      // Only push if subtopic_name has a value (last column drives rows)
      const lastCol = headers[headers.length - 1];
      if (rowData[lastCol]) rows.push(rowData);
    }
  });
  return rows;
};

const bulkUploadSubjectInfo = {
  handler: async (req, res) => {
    try {
      const { exam_id } = req.body;
      if (!exam_id) {
        return res.status(400).json({ success: false, message: 'exam_id is required' });
      }

      const excelFile = req.files && req.files.find(f => f.fieldname === 'file');
      if (!excelFile) {
        return res.status(400).json({ success: false, message: 'Excel file is required' });
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(excelFile.buffer);
      const worksheet = workbook.worksheets[0];

      const rows = parseSheet(worksheet);

      if (rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Excel file has no data rows' });
      }

      // Build subject -> chapter -> topic -> subtopic hierarchy
      const subjectMap = new Map();
      for (const row of rows) {
        const subjectName = row['subject_name'];
        if (!subjectName) continue;

        if (!subjectMap.has(subjectName)) {
          subjectMap.set(subjectName, {
            exam_id,
            name:        subjectName,
            sku:         row['subject_sku']    || '',
            title:       row['subject_title']  || '',
            slogan:      row['subject_slogan'] || '',
            description: '',
            image:       '',
            chapters:    [],
          });
        }

        const subject = subjectMap.get(subjectName);
        const chapterTitle = row['chapter_title'];
        if (!chapterTitle) continue;

        let chapter = subject.chapters.find(c => c.title === chapterTitle);
        if (!chapter) {
          chapter = {
            title:      chapterTitle,
            long_title: row['chapter_long_title'] || '',
            image:      '',
            topics:     [],
          };
          subject.chapters.push(chapter);
        }

        const topicTitle = row['topic_title'];
        if (!topicTitle) continue;

        let topic = chapter.topics.find(t => t.title === topicTitle);
        if (!topic) {
          topic = { title: topicTitle, lessons: [] };
          chapter.topics.push(topic);
        }

        const subtopicName = row['subtopic_name'];
        if (subtopicName) {
          topic.lessons.push({
            name:        subtopicName,
            video_link:  '',
            image:       '',
            tags:        [],
            full_title:  '',
            description: '',
          });
        }
      }

      const subjects = Array.from(subjectMap.values());
      if (subjects.length === 0) {
        return res.status(400).json({ success: false, message: 'No valid data found. Required columns: subject_name, subject_sku, subject_title, subject_slogan, chapter_title, chapter_long_title, topic_title, subtopic_name' });
      }

      const saved = [];
      for (const subjectData of subjects) {
        const subjectInfo = new SubjectInfo(subjectData);
        await subjectInfo.save();
        saved.push(subjectInfo);
      }

      return res.status(201).json({
        success: true,
        message: `${saved.length} subject(s) uploaded successfully!`,
        data: saved,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to bulk upload subjects',
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
  deleteSubjectInfo,
  bulkUploadSubjectInfo
};