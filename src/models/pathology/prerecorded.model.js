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
  price_usd: {
    type: Number,
    required: true
  },
  price_inr: {
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
    // Auto-calculated from minimum option price
    price_usd: {
      type: Number,
      required: true,
    },
    price_inr: {
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

// Middleware to auto-calculate main price from minimum option price
preRecordedSchema.pre('save', function (next) {
  if (this.options && this.options.length > 0) {
    const minPriceUSD = Math.min(...this.options.map(opt => opt.price_usd));
    const minPriceINR = Math.min(...this.options.map(opt => opt.price_inr));

    this.price_usd = minPriceUSD;
    this.price_inr = minPriceINR;
  }
  next();
});

preRecordedSchema.plugin(toJSON);

const PreRecord = mongoose.model('PreRecord', preRecordedSchema);

module.exports = PreRecord;