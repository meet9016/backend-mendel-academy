const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const preRecordedSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    vimeo_video_id: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
     duration: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
preRecordedSchema.plugin(toJSON);

/**
 * @typedef PreRecord
 */
const PreRecord = mongoose.model('PreRecord', preRecordedSchema);

module.exports = PreRecord;
