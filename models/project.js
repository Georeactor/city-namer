const mongoose = require('mongoose');

const projectSchema = mongoose.Schema({
  founding_user_id: String,
  founding_user_osm_id: String,
  targetLanguage: String,
  directions: String
});

module.exports = mongoose.model('Project', projectSchema);
