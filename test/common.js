const assert = require('assert');
const request = require('supertest');

const app = require('../app');
const FBUser = require('../models/fb-user');
const Place = require('../models/place');
const Project = require('../models/project');
const Suggestion = require('../models/suggestion');
const User = require('../models/user');

function clear(done, callback) {
  FBUser.find({ test: true }).remove(() => {
    //console.log('cleared fbusers');
  });
  Place.find({ test: true }).remove(() => {
    //console.log('cleared places');
  });
  Project.find({ test: true }).remove(() => {
    //console.log('cleared projects');
  });
  Suggestion.find({ test: true }).remove(() => {
    //console.log('cleared suggestions');
  });
  User.find({ test: true }).remove(() => {
    //console.log('cleared users');
  });
  if (callback) {
    callback();
  } else if (typeof done === 'function') {
    done();
  }
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
        return done(err);
      }
      callback(p);
    });
  },

  Place: (project, done, callback) => {
    var p = new Place({
      test: true,
      osm_place_id: '201',
      name: 'test',
      osm_size: 'city',
      suggested: '',
      submitted: 0,
      language: 'en',
      saved: new Date(),
      project: project._id,
    });
    p.save((err) => {
      if (err) {
        return done(err);
      }
      callback(p);
    });
  },

  Suggestion: (user, place, done, callback) => {
    var s = new Suggestion({
      test: true,
      user_id: user._id,
      osm_user_id: user.osm_id,
      osm_place_id: place.osm_place_id,
      originalName: place.name,
      suggested: 'TestTest',
      targetLanguage: 'en',
      saved: new Date()
    });
    s.save((err) => {
      if (err) {
        return done(err);
      }
      callback(s);
    });
  },

  FBUser: (done, callback) => {
    var f = new FBUser({
      test: true,
      user_id: 'test',
      blocked: false
    });
    f.save((err) => {
      if (err) {
        return done(err);
      }
      callback(f);
    });
  },

  User: (name, done, callback) => {
    var u = new User({
      test: true,
      user_id: name,
      osm_id: name,
      name: name,
      preferLanguage: 'English',
      readLanguages: ['en', 'zh', 'ne'],
      writeLanguages: ['en', 'zh', 'ne'],
      blocked: false
    });
    u.save((err) => {
      if (err) {
        return done(err);
      }
      callback(u);
    });
  }
};

const fbmessage = (app, msg, callback) => {
  var combinedMessage = msg;
  msg.sender = {
    id: 'test'
  };
  request(app)
    .post('/webhook')
    .send({
      test: true,
      entry: [{
        messaging: [combinedMessage]
      }]
    })
    .expect(200)
    .end(callback);
};

setTimeout(app.turnoff, 40000);

module.exports = {
  clear: clear,
  make: make,
  fbmessage: fbmessage,
  app: app
};
