const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const liveCoursesSchema = mongoose.Schema(
    {
        course_title: {
            type: String,
            required: true,
        },
        date: {
            type: Date,
            required: true,
        },
        instructor_name: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ['Active', 'Inactive'],
            default: 'Active',
        },
        sub_scribe_student_count: {
            type: String,
            required: true,
        },
        zoom_link: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// add plugin that converts mongoose to json
liveCoursesSchema.plugin(toJSON);

/**
 * @typedef LiveCourses
 */
const LiveCourses = mongoose.model('LiveCourses', liveCoursesSchema);

module.exports = LiveCourses;
