const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const perQuestionSchema = mongoose.Schema(
  {
    questionId: {
      type: String,
      required: true,
      trim: true,
    },
    selectedOption: {
      type: String,
      default: null,
    },
    isCorrect: {
      type: Boolean,
      default: null,
    },
    isAnswered: {
      type: Boolean,
      default: false,
    },
    timeSpentSeconds: {
      type: Number,
      default: 0,
    },
    note: {
      type: String,
      default: '',
    },
    isMarked: {
      type: Boolean,
      default: false,
    },
    lastUpdatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const testAttemptSchema = mongoose.Schema(
  {
    mode: {
      type: String,
      enum: ['tutor', 'timed'],
      required: true,
    },
    subjects: {
      type: [String],
      default: [],
    },
    chapters: {
      type: [String],
      default: [],
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    correctCount: {
      type: Number,
      default: 0,
    },
    incorrectCount: {
      type: Number,
      default: 0,
    },
    omittedCount: {
      type: Number,
      default: 0,
    },
    startedAt: {
      type: Date,
      required: true,
    },
    completedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed'],
      default: 'in_progress',
    },
    questionIds: {
      type: [String],
      default: [],
    },
    perQuestion: {
      type: [perQuestionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

testAttemptSchema.plugin(toJSON);

const TestAttempt = mongoose.model('TestAttempt', testAttemptSchema);

module.exports = TestAttempt;

