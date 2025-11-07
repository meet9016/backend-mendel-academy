const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const faqSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
},
    {
        timestamps: true,
    }
);

faqSchema.plugin(toJSON);

/**
 * @typedef Faq
 */
const Faq = mongoose.model("Faq", faqSchema);
module.exports = Faq;
