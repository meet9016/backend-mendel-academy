const mongoose = require('mongoose');
const { toJSON } = require('../plugins');

const optionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['record-book', 'video', 'writing-book'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  features: [{
    type: String,
    required: true
  }],
  is_available: {
    type: Boolean,
    default: true
  }
}, { _id: false });

const preRecordedSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    category: {
      type: String,
    },
    total_reviews: {
      type: Number,
    },
    subtitle: {
      type: String,
    },
    vimeo_video_id: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
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
    options: {
      type: [optionSchema],
      default: []
    }
  },
  {
    timestamps: true,
  }
);

preRecordedSchema.plugin(toJSON);

const PreRecord = mongoose.model('PreRecord', preRecordedSchema);

module.exports = PreRecord;