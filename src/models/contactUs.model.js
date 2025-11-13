const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const contactUsSchema = mongoose.Schema(
    {
        first_name: {
            type: String,
            required: true,
        },
        last_name: {
            type: String
        },
         email: {
            type: String,
            required: true,
        },
        medical_school: {
            type: String
        },
        graduation_year: {
            type: Number
        },
    },
    {
        timestamps: true,
    }
);

// add plugin that converts mongoose to json
contactUsSchema.plugin(toJSON);

/**
 * @typedef Contactus
 */
const Contactus = mongoose.model('Contactus', contactUsSchema);

module.exports = Contactus;
