const mongoose = require('mongoose');
const { toJSON } = require('../plugins');

const upComingProgramSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    waitlistCount: { type: Number, default: 0 },
    // progress: { type: Number, default: 0 },          // e.g., 79%
    duration: { type: String },                      // "6-week program"
    features: [{ type: String }],                    // list of feature strings
    status: { type: String, default: "Launching Soon" },
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