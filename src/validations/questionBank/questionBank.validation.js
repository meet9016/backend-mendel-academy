const Joi = require('joi');
const { objectId } = require('../custom.validation');

const createSubject = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string().allow('', null),
  }),
};

const getSubjects = {
  query: Joi.object().keys({
    search: Joi.string().allow('', null),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getSubject = {
  params: Joi.object().keys({
    subjectId: Joi.string().custom(objectId),
  }),
};

const updateSubject = {
  params: Joi.object().keys({
    subjectId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      description: Joi.string().allow('', null),
    })
    .min(1),
};

const deleteSubject = {
  params: Joi.object().keys({
    subjectId: Joi.string().custom(objectId),
  }),
};

const createChapter = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    subject: Joi.string().required().custom(objectId),
    description: Joi.string().allow('', null),
  }),
};

const getChapters = {
  query: Joi.object().keys({
    search: Joi.string().allow('', null),
    subject: Joi.string().custom(objectId),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getChaptersBySubject = {
  params: Joi.object().keys({
    subjectId: Joi.string().custom(objectId).required(),
  }),
};

const getChapter = {
  params: Joi.object().keys({
    chapterId: Joi.string().custom(objectId),
  }),
};

const updateChapter = {
  params: Joi.object().keys({
    chapterId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      subject: Joi.string().custom(objectId),
      description: Joi.string().allow('', null),
    })
    .min(1),
};

const deleteChapter = {
  params: Joi.object().keys({
    chapterId: Joi.string().custom(objectId),
  }),
};

const createTopic = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    chapter: Joi.string().required().custom(objectId),
    description: Joi.string().allow('', null),
  }),
};

const getTopics = {
  query: Joi.object().keys({
    search: Joi.string().allow('', null),
    chapter: Joi.string().custom(objectId),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getTopicsByChapter = {
  params: Joi.object().keys({
    chapterId: Joi.string().custom(objectId).required(),
  }),
};

const getTopic = {
  params: Joi.object().keys({
    topicId: Joi.string().custom(objectId),
  }),
};

const updateTopic = {
  params: Joi.object().keys({
    topicId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      chapter: Joi.string().custom(objectId),
      description: Joi.string().allow('', null),
    })
    .min(1),
};

const deleteTopic = {
  params: Joi.object().keys({
    topicId: Joi.string().custom(objectId),
  }),
};

const createAcademicQuestion = {
  body: Joi.object().keys({
    search: Joi.string().allow('', null),
    options: Joi.array().items(Joi.string()).min(2).required(),
    question: Joi.string().required(),
    correctAnswer: Joi.string().required(),
    description: Joi.string().allow('', null),
    topic: Joi.string().required().custom(objectId),
  }),
};

const getAcademicQuestions = {
  query: Joi.object().keys({
    topic: Joi.string().custom(objectId),
    search: Joi.string().allow('', null),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getQuestionsByTopic = {
  params: Joi.object().keys({
    topicId: Joi.string().custom(objectId).required(),
  }),
};

const getAcademicQuestion = {
  params: Joi.object().keys({
    questionId: Joi.string().custom(objectId),
  }),
};

const updateAcademicQuestion = {
  params: Joi.object().keys({
    questionId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      question: Joi.string(),
      options: Joi.array().items(Joi.string()).min(2),
      correctAnswer: Joi.string(),
      description: Joi.string().allow('', null),
      topic: Joi.string().custom(objectId),
    })
    .min(1),
};

const deleteAcademicQuestion = {
  params: Joi.object().keys({
    questionId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createSubject,
  getSubjects,
  getSubject,
  updateSubject,
  deleteSubject,
  createChapter,
  getChapters,
  getChaptersBySubject,
  getChapter,
  updateChapter,
  deleteChapter,
  createTopic,
  getTopics,
  getTopicsByChapter,
  getTopic,
  updateTopic,
  deleteTopic,
  createAcademicQuestion,
  getAcademicQuestions,
  getQuestionsByTopic,
  getAcademicQuestion,
  updateAcademicQuestion,
  deleteAcademicQuestion,
};
