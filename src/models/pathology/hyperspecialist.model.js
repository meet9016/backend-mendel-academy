const mongoose = require('mongoose');
const { toJSON } = require('../plugins');

const hyperspecialistSchema = mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        tags: [
            {
                type: String,
            },
        ],
        price_dollar: {
            type: Number,
            // required: true,
        },
        price_inr: {
            type: Number,
            // required: true,
        },
    },
    {
        timestamps: true,
    }
);

// add plugin that converts mongoose to json
hyperspecialistSchema.plugin(toJSON);

/**
 * @typedef HyperSpecialist
 */
const HyperSpecialist = mongoose.model('HyperSpecialist', hyperspecialistSchema);

module.exports = HyperSpecialist;
