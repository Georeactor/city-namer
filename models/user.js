const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
  user_id: String,
  osm_id: String,
  name: String,
  preferLanguage: String,
  readLanguages: [String],
  writeLanguages: [String],
  blocked: Boolean,
  test: Boolean
});

module.exports = mongoose.model('User', userSchema);
