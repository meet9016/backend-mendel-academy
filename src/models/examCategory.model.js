const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const examListSchema = mongoose.Schema(
  {
    // Example: "USMLE Program" / "International Exams"
    category_name: {
      type: String,
      required: true,
      trim: true,
    },
    exams: [{
      exam_name: {
        type: String,
        required: true,
        trim: true,
      },
      country: {
        type: String,
        trim: true,
      },
      sub_titles: [
        {
          type: String,
          trim: true,
        },
      ],
      description: {
        type: String,
        trim: true,
      },
      status: {
        type: String,
        enum: ["Active", "Inactive"],
        default: "Active",
      },
    },],
    choose_plan_list: [{
      plan_pricing: {
        type: String,
        required: true,
      },
      plan_day: {
        type: Number,
        required: true,
      },
      plan_type: {
        type: String,
        required: true,
      },
      plan_sub_title: [{
        type: String,
        required: true,
      }],
      most_popular: {
        type: Boolean,
        default: false,
      },
    }],
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
examListSchema.plugin(toJSON);

/**
 * @typedef ExamList
 */
const ExamList = mongoose.model('ExamList', examListSchema);

module.exports = ExamList;
