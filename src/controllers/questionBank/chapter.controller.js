const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const { Chapter, Subject } = require('../../models');
const pick = require('../../utils/pick');

const createChapter = {
  handler: catchAsync(async (req, res) => {
    const subject = await Subject.findById(req.body.subject);
    if (!subject) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Subject not found');
    }
    const chapter = await Chapter.create(req.body);
    res.status(httpStatus.CREATED).send(chapter);
  }),
};

const getChapters = {
  handler: catchAsync(async (req, res) => {
    const filter = pick(req.query, ['name', 'subject']);
    if (filter.search) {
      filter.search = { $regex: filter.search, $options: 'i' };
    }
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const chapters = await Chapter.find(filter, null, options).populate('subject', 'name');
    res.send(chapters);
  }),
};
const getChaptersBySubject = {
  handler: catchAsync(async (req, res) => {
    const filter = { subject: req.params.subjectId };
    if (req.query.search) {
      filter.search = { $regex: req.query.search, $options: 'i' };
    }
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const chapters = await Chapter.find(filter, null, options).populate('subject', 'name');
    res.send(chapters);
  }),
};

const getChapter = {
  handler: catchAsync(async (req, res) => {
    const chapter = await Chapter.findById(req.params.chapterId).populate('subject', 'name');
    if (!chapter) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Chapter not found');
    }
    res.send(chapter);
  }),
};

const updateChapter = {
  handler: catchAsync(async (req, res) => {
    if (req.body.subject) {
      const subject = await Subject.findById(req.body.subject);
      if (!subject) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Subject not found');
      }
    }
    const chapter = await Chapter.findByIdAndUpdate(req.params.chapterId, req.body, { new: true }).populate('subject', 'name');
    if (!chapter) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Chapter not found');
    }
    res.send(chapter);
  }),
};

const deleteChapter = {
  handler: catchAsync(async (req, res) => {
    const chapter = await Chapter.findById(req.params.chapterId);
    if (!chapter) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Chapter not found');
    }
    await chapter.deleteOne();
    res.status(httpStatus.NO_CONTENT).send();
  }),
};

module.exports = {
  createChapter,
  getChapters,
  getChaptersBySubject,
  getChapter,
  updateChapter,
  deleteChapter,
};
