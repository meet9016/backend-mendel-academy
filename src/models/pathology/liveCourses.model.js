const mongoose = require('mongoose');
const { toJSON } = require('../plugins');

const liveCoursesSchema = mongoose.Schema(
    {
        course_title: {
            type: String,
            required: true,
        },
        instructor: {
            name: { type: String, required: true },
            qualification: { type: String },
            image: { type: String }, // optional
        },
        tags: [
            {
                type: String,
            },
        ],
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
            enum: ["live", "recorded", "upcoming"],
            default: "recorded",
        },
        isSoldOut: {
            type: Boolean,
            default: false,
        },
        duration: {
            type: String, // e.g., "8 weeks"
        },
        zoom_link: {
            type: String,
            required: true,
        },
        choose_plan_list: [{
            moduleNumber: {
                type: String,
            },
            title: {
                type: String,
                required: true,
            },
            subtitle: {
                type: String,
            },
            description: {
                type: String,
            },
            // ✅ DUAL CURRENCY SUPPORT
            price_usd: {
                type: Number,
                required: true
            },
            price_inr: {
                type: Number,
                required: true
            },
            // ⚠️ DEPRECATED: Keep for backward compatibility during migration
            price: {
                type: Number,
                required: false // Made optional for migration period
            },
            features: [
                {
                    type: String,
                    required: true,
                },
            ],
            isMostPopular: {
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
liveCoursesSchema.plugin(toJSON);

/**
 * @typedef LiveCourses
 */
const LiveCourses = mongoose.model('LiveCourses', liveCoursesSchema);

module.exports = LiveCourses;