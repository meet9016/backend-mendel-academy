const mongoose = require('mongoose');
const { toJSON } = require('../plugins');

const upComingProgramSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    waitlistCount: { type: Number, default: 0 },
    description: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    image: {
      type: String
    },
    course_types: { type: String },
  },
  { timestamps: true }
);

// add plugin that converts mongoose to json
upComingProgramSchema.plugin(toJSON);

/**
 * @typedef UpCommingProgram
 */
const UpCommingProgram = mongoose.model('UpCommingProgram', upComingProgramSchema);

module.exports = UpCommingProgram;