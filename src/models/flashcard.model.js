const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const flashcardSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        testAttempt: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TestAttempt',
        },
        questionId: {
            type: String,
            required: true,
        },
        front: {
            type: String,
            required: true,
            trim: true,
        },
        back: {
            type: String,
            required: true,
            trim: true,
        },
        tags: {
            type: [String],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

flashcardSchema.plugin(toJSON);

const Flashcard = mongoose.model('Flashcard', flashcardSchema);

module.exports = Flashcard;
