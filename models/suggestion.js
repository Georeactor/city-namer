const mongoose = require('mongoose');

const suggestionSchema = mongoose.Schema({
  user_id: String,
  osm_user_id: String,
  osm_place_id: String,
  originalName: String,
  suggested: String,
  submitted: Number,
  targetLanguage: String,
  saved: Date,
  test: Boolean
});

module.exports = mongoose.model('Suggestion', suggestionSchema);
