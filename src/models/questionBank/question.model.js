const mongoose = require('mongoose');
const { toJSON } = require('../plugins');

const academicQuestionSchema = mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [String],
      required: true,
      validate(value) {
        if (value.length < 2) {
          throw new Error('Question must have at least 2 options');
        }
      },
    },
    optionExplanations: {
      type: [String],
      default: [],
    },
    correctAnswer: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
academicQuestionSchema.plugin(toJSON);

/**
 * @typedef AcademicQuestion
 */
const AcademicQuestion = mongoose.model('AcademicQuestion', academicQuestionSchema);

module.exports = AcademicQuestion;
