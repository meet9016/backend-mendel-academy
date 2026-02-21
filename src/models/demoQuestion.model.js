const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const demoQuestionSchema = mongoose.Schema(
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
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

demoQuestionSchema.plugin(toJSON);

const DemoQuestion = mongoose.model('DemoQuestion', demoQuestionSchema);

module.exports = DemoQuestion;

