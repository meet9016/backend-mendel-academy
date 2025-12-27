const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const termsConditionsSchema = new mongoose.Schema({
    description: {
        type: String,
        required: true,
    },
},
    {
        timestamps: true,
    }
);

termsConditionsSchema.plugin(toJSON);

/**
 * @typedef TermsConditions
 */
const TermsConditions = mongoose.model("TermsConditions", termsConditionsSchema);
module.exports = TermsConditions;
