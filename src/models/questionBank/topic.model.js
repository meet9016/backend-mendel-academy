const mongoose = require('mongoose');
const { toJSON } = require('../plugins');

const topicSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    chapter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chapter',
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
topicSchema.plugin(toJSON);

/**
 * @typedef Topic
 */
const Topic = mongoose.model('Topic', topicSchema);

module.exports = Topic;
