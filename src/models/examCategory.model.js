const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const examListSchema = mongoose.Schema(
  {
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
      title: {
        type: String,
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
      image: { type: String },
    }],
    choose_plan_list: [{
      plan_pricing_dollar: {
        type: Number,
      },
      plan_pricing_inr: {
        type: Number,
      },
      plan_month: {
        type: Number, 
      },
      plan_type: {
        type: String,
        required: true,
      },
      plan_sub_title: [{
        type: String,
      }],
      most_popular: {
        type: Boolean,
        default: false,
      },
    }],
    rapid_learning_tools: [{
      tool_type: {
        type: String,
        trim: true,
      },
      price_usd: {
        type: Number,
      },
      price_inr: {
        type: Number,
      },
    }],
    who_can_enroll_title: { type: String, trim: true },
    who_can_enroll_description: { type: String, trim: true },
    who_can_enroll_image: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

examListSchema.plugin(toJSON);

const ExamList = mongoose.model('ExamList', examListSchema);

module.exports = ExamList;