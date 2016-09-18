const FBUser = require('../models/fb-user');
const Place = require('../models/place');
const Project = require('../models/project');
const Suggestion = require('../models/suggestion');
const User = require('../models/user');

function clear(done, callback) {
  FBUser.find({ test: true }).remove();
  Place.find({ test: true }).remove();
  Project.find({ test: true }).remove();
  Suggestion.find({ test: true }).remove();
  User.find({ test: true }).remove();
  callback();
}

const make = {
  Project: (done, callback) => {
    var p = new Project({
      test: true,
      fromLanguages: ['zh', 'ne'],
      toLanguage: 'en',
      directions: 'Sample',
      saved: new Date(),
      lat: 0,
      lng: 0,
      zoom: 10
    });
    p.save((err) => {
      if (err) {
        return clear(done, () => { done(err); });
      }
      callback(p);
    });
  },

  Suggestion: (user, done, callback) => {
    var s = new Suggestion({
      test: true,
      user_id: user._id,
      osm_user_id: user.osm_id,
      osm_place_id: '1',
      originalName: 'ABC',
      suggested: 'TestTest',
      targetLanguage: 'en',
      saved: new Date()
    });
    s.save((err) => {
      if (err) {
        return clear(done, () => { done(err); });
      }
      callback(s);
    });
  },

  User: (done, callback) => {
    var u = new User({
      test: true,
      user_id: 'mapmeld',
      osm_id: 'mapmeld',
      name: 'Test',
      preferLanguage: 'English',
      readLanguages: ['en'],
      writeLanguages: ['en'],
    });
    u.save((err) => {
      if (err) {
        return clear(done, () => { done(err); });
      }
      callback(u);
    });
  }
};

module.exports = {
  clear: clear,
  make: make
};
