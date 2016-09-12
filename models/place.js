const mongoose = require('mongoose');

const placeSchema = mongoose.Schema({
  osm_place_id: String,
  name: String,
  suggested: String,
  language: String,
  saved: Date,
  submitted: Date,
  user_id: String
});

module.exports = mongoose.model('Place', placeSchema);
