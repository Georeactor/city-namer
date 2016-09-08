const mongoose = require('mongoose');

const placeSchema = mongoose.Schema({
  user_id: String,
  osm_user_id: String,
  osm_place_id: String,
  name: String,
  suggested: String,
  language: String,
  saved: Date
});

module.exports = mongoose.model('Place', placeSchema);
