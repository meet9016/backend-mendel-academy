const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const holidaySchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    description: {
      type: String
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
holidaySchema.plugin(toJSON);

/**
 * @typedef Holiday
 */
const Holiday = mongoose.model('Holiday', holidaySchema);

module.exports = Holiday;
