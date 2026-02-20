const httpStatus = require('http-status');
const mongoose = require('mongoose');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const { AcademicQuestion, Topic } = require('../../models');
const pick = require('../../utils/pick');

const createAcademicQuestion = {
  handler: catchAsync(async (req, res) => {
    const topic = await Topic.findById(req.body.topic);
    if (!topic) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Topic not found');
    }
    const question = await AcademicQuestion.create(req.body);
    res.status(httpStatus.CREATED).send(question);
  }),
};

const getAcademicQuestions = {
  handler: catchAsync(async (req, res) => {
    let filter ={};
    if (req.query.search) {
      filter.search = { $regex: req.query.search, $options: 'i' };
    }
    // const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const questions = await AcademicQuestion.find(filter).populate('topic', 'name');
    res.send(questions);
  }),
};

const getQuestionsByTopic = {
  handler: catchAsync(async (req, res) => {
    const filter = { topic: req.params.topicId };
    if (req.query.search) {
      filter.search = { $regex: req.query.search, $options: 'i' };
    }
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const questions = await AcademicQuestion.find(filter, null, options).populate('topic', 'name');
    res.send(questions);
  }),
};

const getAcademicQuestion = {
  handler: catchAsync(async (req, res) => {
    const question = await AcademicQuestion.findById(req.params.questionId).populate('topic', 'name');
    if (!question) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Question not found');
    }
    res.send(question);
  }),
};

const updateAcademicQuestion = {
  handler: catchAsync(async (req, res) => {
    if (req.body.topic) {
      const topic = await Topic.findById(req.body.topic);
      if (!topic) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Topic not found');
      }
    }
    const question = await AcademicQuestion.findByIdAndUpdate(req.params.questionId, req.body, { new: true }).populate('topic', 'name');
    if (!question) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Question not found');
    }
    res.send(question);
  }),
};

const deleteAcademicQuestion = {
  handler: catchAsync(async (req, res) => {
    const question = await AcademicQuestion.findById(req.params.questionId);
    if (!question) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Question not found');
    }
    await question.deleteOne();
    res.status(httpStatus.NO_CONTENT).send();
  }),
};

const getSubjectQuestionStats = {
  handler: catchAsync(async (req, res) => {
    const pipeline = [
      {
        $lookup: {
          from: 'topics',
          localField: 'topic',
          foreignField: '_id',
          as: 'topic',
        },
      },
      { $unwind: '$topic' },
      {
        $lookup: {
          from: 'chapters',
          localField: 'topic.chapter',
          foreignField: '_id',
          as: 'chapter',
        },
      },
      { $unwind: '$chapter' },
      {
        $lookup: {
          from: 'subjects',
          localField: 'chapter.subject',
          foreignField: '_id',
          as: 'subject',
        },
      },
      { $unwind: '$subject' },
      {
        $group: {
          _id: '$subject._id',
          name: { $first: '$subject.name' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { name: 1 },
      },
    ];

    const result = await AcademicQuestion.aggregate(pipeline);
    const totalQuestions = result.reduce((sum, row) => sum + row.count, 0);

    const subjects = result.map((row) => ({
      subjectId: row._id,
      name: row.name,
      count: row.count,
    }));

    res.send({ totalQuestions, subjects });
  }),
};

const getChapterAndTopicStatsBySubject = {
  handler: catchAsync(async (req, res) => {
    const { subjectId } = req.params;

    const subjectObjectId = new mongoose.Types.ObjectId(subjectId);

    const pipeline = [
      {
        $lookup: {
          from: 'topics',
          localField: 'topic',
          foreignField: '_id',
          as: 'topic',
        },
      },
      { $unwind: '$topic' },
      {
        $lookup: {
          from: 'chapters',
          localField: 'topic.chapter',
          foreignField: '_id',
          as: 'chapter',
        },
      },
      { $unwind: '$chapter' },
      {
        $match: {
          'chapter.subject': subjectObjectId,
        },
      },
      {
        $group: {
          _id: {
            chapterId: '$chapter._id',
            chapterName: '$chapter.name',
            topicId: '$topic._id',
            topicName: '$topic.name',
          },
          count: { $sum: 1 },
        },
      },
    ];

    const rows = await AcademicQuestion.aggregate(pipeline);

    const chaptersMap = new Map();

    for (const row of rows) {
      const chapterId = row._id.chapterId.toString();
      const chapterName = row._id.chapterName;
      const topicId = row._id.topicId.toString();
      const topicName = row._id.topicName;
      const count = row.count || 0;

      if (!chaptersMap.has(chapterId)) {
        chaptersMap.set(chapterId, {
          chapterId,
          name: chapterName,
          count: 0,
          topics: [],
        });
      }

      const chapter = chaptersMap.get(chapterId);
      chapter.count += count;
      chapter.topics.push({
        topicId,
        name: topicName,
        count,
      });
    }

    const chapters = Array.from(chaptersMap.values());

    res.send({
      subjectId,
      chapters,
    });
  }),
};

module.exports = {
  createAcademicQuestion,
  getAcademicQuestions,
  getQuestionsByTopic,
  getAcademicQuestion,
  updateAcademicQuestion,
  deleteAcademicQuestion,
   getSubjectQuestionStats,
   getChapterAndTopicStatsBySubject,
};
