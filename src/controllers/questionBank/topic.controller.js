const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const { Topic, Chapter, AcademicQuestion } = require('../../models');
const pick = require('../../utils/pick');

const createTopic = {
  handler: catchAsync(async (req, res) => {
    const chapter = await Chapter.findById(req.body.chapter);
    if (!chapter) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Chapter not found');
    }
    const topic = await Topic.create(req.body);
    res.status(httpStatus.CREATED).send(topic);
  }),
};

const getTopics = {
  handler: catchAsync(async (req, res) => {
    const filter = pick(req.query, ['name', 'chapter']);
    if (filter.search) {
      filter.search = { $regex: filter.search, $options: 'i' };
    }
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const topics = await Topic.find(filter, null, options).populate('chapter', 'name');
    res.send(topics);
  }),
};

const getTopicsByChapter = {
  handler: catchAsync(async (req, res) => {
    const filter = { chapter: req.params.chapterId };
    if (req.query.search) {
      filter.search = { $regex: req.query.search, $options: 'i' };
    }
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const topics = await Topic.find(filter, null, options).populate('chapter', 'name');
    res.send(topics);
  }),
};

const getTopic = {
  handler: catchAsync(async (req, res) => {
    const topic = await Topic.findById(req.params.topicId).populate('chapter', 'name');
    if (!topic) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Topic not found');
    }
    res.send(topic);
  }),
};

const updateTopic = {
  handler: catchAsync(async (req, res) => {
    if (req.body.chapter) {
      const chapter = await Chapter.findById(req.body.chapter);
      if (!chapter) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Chapter not found');
      }
    }
    const topic = await Topic.findByIdAndUpdate(req.params.topicId, req.body, { new: true }).populate('chapter', 'name');
    if (!topic) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Topic not found');
    }
    res.send(topic);
  }),
};

const deleteTopic = {
  handler: catchAsync(async (req, res) => {
    const topic = await Topic.findById(req.params.topicId);
    if (!topic) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Topic not found');
    }
    await AcademicQuestion.deleteMany({ topic: req.params.topicId });
    await topic.deleteOne();
    res.status(httpStatus.NO_CONTENT).send();
  }),
};

module.exports = {
  createTopic,
  getTopics,
  getTopicsByChapter,
  getTopic,
  updateTopic,
  deleteTopic,
};
