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
      slug: {
        type: String,
        required: true,
        unique: true,
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
      plan_title: {
        type: String,
        trim: true,
        default: '',
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
    elite_mentorship: [{
      name: {
        type: String,
        trim: true,
      },
      subtitle: {
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
    tsunami: {
      name: {
        type: String,
        trim: true,
      },
      included_services: {
        type: String,
        trim: true,
      },
      included_service_price_usd: {
        type: Number,
      },
      included_service_price_inr: {
        type: Number,
      },
      description: {
        type: String,
        trim: true,
      },
    },
    plan_section_title: { type: String, trim: true },
    mentorship_tsunami_section_title: { type: String, trim: true },
    rapid_tools_section_title: { type: String, trim: true },
    is_plan_visible: { type: Boolean, default: true },
    is_rapid_tools_visible: { type: Boolean, default: true },
    who_can_enroll_title: { type: String, trim: true },
    who_can_enroll_description: { type: String, trim: true },
    who_can_enroll_image: { type: String, trim: true },
    galaxy_app_section: {
      section_label: { type: String, trim: true },
      section_title: { type: String, trim: true },
      section_description: { type: String, trim: true },
      tools: [{
        tool_name: { type: String, trim: true },
        section_subtitle: { type: String, trim: true },
        bottom_text: { type: String, trim: true },
        video_link: { type: String, trim: true },
        iphone_video: {
          title: { type: String, trim: true },
          link: { type: String, trim: true },
        },
        ipad_video: {
          title: { type: String, trim: true },
          link: { type: String, trim: true },
        },
        desktop_video: {
          title: { type: String, trim: true },
          link: { type: String, trim: true },
        },
        tagline: { type: String, trim: true },
        description: { type: String, trim: true },
        included_points: [{ type: String, trim: true }],
        sample_question_badge: { type: String, trim: true },
        sample_question_text: { type: String, trim: true },
        sample_question_options: [{
          text: { type: String, trim: true },
          is_correct: { type: Boolean, default: false },
        }],
        sample_questions: [{
          badge: { type: String, trim: true },
          question: { type: String, trim: true },
          options: [{
            text: { type: String, trim: true },
            is_correct: { type: Boolean, default: false },
          }]
        }],
        flashcard_qa: [{
          question: { type: String, trim: true },
          answer: { type: String, trim: true },
        }],
        individual_price: { type: String, trim: true },
        individual_per: { type: String, trim: true },
        galaxy_price: { type: String, trim: true },
        galaxy_per: { type: String, trim: true },
        sample_image: { type: String, trim: true },
        cards: [{
          badge: { type: String, trim: true },
          title: { type: String, trim: true },
          image: { type: String, trim: true },
          card_type: { type: String, trim: true },
          options: [{
            text: { type: String, trim: true },
            is_correct: { type: Boolean, default: false },
          }],
        }],
      }],
    },
    sample_recorded_lectures: [{
      title: { type: String, trim: true },
      video_link: { type: String, trim: true },
      subject: { type: String, trim: true },
      strip_left: { type: String, trim: true },
      strip_right: { type: String, trim: true },
    }],
  },
  {
    timestamps: true,
  }
);

examListSchema.plugin(toJSON);

const ExamList = mongoose.model('ExamList', examListSchema);

module.exports = ExamList;