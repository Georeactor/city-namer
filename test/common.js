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
      zoom: 10,
      test: Boolean
    });
    p.save((err) => {
      if (err) {
        return clear(done, () => { done(err); });
      }
      callback(p);
    });
  }
};

module.exports = {
  clear: clear,
  make: make
};
