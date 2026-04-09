const mongoose = require('mongoose');
const { toJSON } = require('../plugins');

// Lesson schema
const lessonSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  video_link: {
    type: String,
    trim: true
  },
  image: {
    type: String,
    default: ''
  },
  tags: [{
    type: String,
    trim: true
  }],
  full_title: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  }
}, { _id: true });

// Topic schema
const topicSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  lessons: [lessonSchema]
}, { _id: false });

// Chapter schema
const chapterSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String,
    default: ''
  },
  long_title: {
    type: String,
    trim: true
  },
  topics: [topicSchema]
}, { _id: true });

// Subject info schema
const subjectInfoSchema = mongoose.Schema(
  {
    exam_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamList',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    sku: {
      type: String,
      trim: true
    },
    title: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    image: {
      type: String,
      default: ''
    },
    slogan: {
      type: String,
      trim: true
    },
    chapters: [chapterSchema]
  },
  {
    timestamps: true,
  }
);

subjectInfoSchema.plugin(toJSON);

const SubjectInfo = mongoose.model('SubjectInfo', subjectInfoSchema);

module.exports = SubjectInfo;