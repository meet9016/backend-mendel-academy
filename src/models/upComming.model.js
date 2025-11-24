const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const upCommingSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },
    level: {
      type: String,
      required: true,
      enum: ["Beginner", "Intermediate", "Advanced Level"]
    },
    type: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    startDate: {
      type: String,
      required: true
    },
    waitlistSpots: {
      type: Number,
    },
    status: {
      type: String,
      enum: ["open", "closed", "waitlist"],
    },
    image: {
      type: String,
    }
  },
  {
    timestamps: true
  }
);

// add plugin that converts mongoose to json
upCommingSchema.plugin(toJSON);

/**
 * @typedef Upcomming
 */
const Upcomming = mongoose.model('Upcomming', upCommingSchema);

module.exports = Upcomming;
