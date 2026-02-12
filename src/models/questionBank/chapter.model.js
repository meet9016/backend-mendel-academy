const mongoose = require('mongoose');
const { toJSON } = require('../plugins');

const chapterSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
chapterSchema.plugin(toJSON);

/**
 * @typedef Chapter
 */
const Chapter = mongoose.model('Chapter', chapterSchema);

module.exports = Chapter;
