const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const { Subject, Chapter, Topic, AcademicQuestion } = require('../../models');
const pick = require('../../utils/pick');

const createSubject = {
  handler: catchAsync(async (req, res) => {
    const subject = await Subject.create(req.body);
    res.status(httpStatus.CREATED).send(subject);
  }),
};

const getSubjects = {
  handler: catchAsync(async (req, res) => {
    const filter = pick(req.query, ['name']);
    if (filter.search) {
      filter.search = { $regex: filter.search, $options: 'i' };
    }
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const subjects = await Subject.find(filter, null, options);
    res.send(subjects);
  }),
};

const getSubject = {
  handler: catchAsync(async (req, res) => {
    const subject = await Subject.findById(req.params.subjectId);
    if (!subject) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Subject not found');
    }
    res.send(subject);
  }),
};

const updateSubject = {
  handler: catchAsync(async (req, res) => {
    const subject = await Subject.findByIdAndUpdate(req.params.subjectId, req.body, { new: true });
    if (!subject) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Subject not found');
    }
    res.send(subject);
  }),
};

const deleteSubject = {
  handler: catchAsync(async (req, res) => {
    const subject = await Subject.findById(req.params.subjectId);
    if (!subject) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Subject not found');
    }
    const chapters = await Chapter.find({ subject: req.params.subjectId });
    const chapterIds = chapters.map((chapter) => chapter._id);
    const topics = await Topic.find({ chapter: { $in: chapterIds } });
    const topicIds = topics.map((topic) => topic._id);
    await AcademicQuestion.deleteMany({ topic: { $in: topicIds } });
    await Topic.deleteMany({ chapter: { $in: chapterIds } });
    await Chapter.deleteMany({ subject: req.params.subjectId });
    await subject.deleteOne();
    res.status(httpStatus.NO_CONTENT).send();
  }),
};

module.exports = {
  createSubject,
  getSubjects,
  getSubject,
  updateSubject,
  deleteSubject,
};
