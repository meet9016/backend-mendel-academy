const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
  },
});

categorySchema.plugin(toJSON); 

/**
 * @typedef Category
 */
const Category = mongoose.model("Category", categorySchema);
module.exports = Category;
