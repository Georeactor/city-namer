const mongoose = require('mongoose');

const placeSchema = mongoose.Schema({
  osm_place_id: String,
  name: String,
  osm_size: String, // city, hamlet, etc
  suggested: String,
  language: String,
  saved: Date,
  submitted: Number,
  user_id: String,
  project: String,
  test: Boolean
});

module.exports = mongoose.model('Place', placeSchema);
