const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createDemoQuestion = {
  body: Joi.object().keys({
    question: Joi.string().required(),
    options: Joi.array().items(Joi.string()).min(2).required(),
    correctAnswer: Joi.string().required(),
    description: Joi.string().allow('', null),
    optionExplanations: Joi.array().items(Joi.string().allow('', null)).optional(),
    active: Joi.boolean().optional(),
  }),
};

const updateDemoQuestion = {
  params: Joi.object().keys({
    id: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      question: Joi.string(),
      options: Joi.array().items(Joi.string()).min(2),
      correctAnswer: Joi.string(),
      description: Joi.string().allow('', null),
      optionExplanations: Joi.array().items(Joi.string().allow('', null)).optional(),
      active: Joi.boolean(),
    })
    .min(1),
};

const getDemoQuestion = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId),
  }),
};

const deleteDemoQuestion = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createDemoQuestion,
  updateDemoQuestion,
  getDemoQuestion,
  deleteDemoQuestion,
};

