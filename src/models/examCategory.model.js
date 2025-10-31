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

    // Sub exams for that category (array of objects)
    exams: [
      {
        exam_name: {
          type: String,
          required: true,
          trim: true,
        },
        country: {
          type: String,
          trim: true,
        },
        // description: {
        //   type: String,
        //   trim: true,
        // },
        // status: {
        //   type: String,
        //   enum: ["Active", "Inactive"],
        //   default: "Active",
        // },
      },
    ],
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
