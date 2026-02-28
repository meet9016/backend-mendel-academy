const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const plansSchema = mongoose.Schema(
  {
    name: {
      type: String
    },
    description: {
      type: String
    },
    price_inr: {
      type: Number,
    },
    price_usd: {
      type: Number,
    },
    duration: {
      type: String,
    },
    duration_months: {
      type: Number,
    },
    features: {
      type: [String],
    },
    icon_type: {
      type: String
    },

    is_popular: {
      type: Boolean,
      default: false,
    },
    is_best_value: {
      type: Boolean,
      default: false,
    },
    button_text: {
      type: String,
      default: 'Choose Plan',
    },

    sort_order: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    }
  },
  {
    timestamps: true,
  }
);

// Add plugin that converts mongoose to json
plansSchema.plugin(toJSON);

// Index for better query performance
plansSchema.index({ status: 1, sort_order: 1 });

/**
 * @typedef Plans
 */
const Plans = mongoose.model('Plans', plansSchema);

module.exports = Plans;