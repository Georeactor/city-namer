const mongoose = require('mongoose');

const fbUserSchema = mongoose.Schema({
  user_id: String,
  osm_id: String,
  name: String,
  preferLanguage: String,
  readLanguages: [String],
  writeLanguages: [String]
});

module.exports = mongoose.model('FBUser', fbUserSchema);
