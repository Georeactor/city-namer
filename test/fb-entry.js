const assert = require('chai').assert;
const common = require('./common');
const app = common.app;

const FBUser = require('../models/fb-user');
const Project = require('../models/project');
const Place = require('../models/place');
const Suggestion = require('../models/suggestion');

// TODO: remember lastPlace

describe('creating an account', () => {
  var commonUser;

  after(() => {
    common.clear();
  });

  it('welcomes a new user', (done) => {
    FBUser.find({ user_id: 'test' }).remove(() => {
      common.fbmessage(app, {message: {text: 'hello!'}}, (err, res) => {
        if (err) {
          return done(err);
        }
        assert.include(res.text, 'Welcome to OSM City Namer');
        FBUser.find({ user_id: 'test' }, (err, users) => {
          if (err) {
            return done(err);
          }
          assert.equal(users.length, 1);
          commonUser = users[0];
          done();
        });
      });
    });
  });

  it('saves user language preference, and returns a placename', (done) => {
    common.make.Place('333', done, (place) => {
      common.fbmessage(app, {postback: {payload: 'rw:en:bot'}}, (err, res) => {
        if (err) {
          return done(err);
        }
        assert.include(res.text, '"' + place.name + '"');

        FBUser.findById(commonUser._id, (err, refreshUser) => {
          if (err) {
            return done(err);
          }
          assert.equal(refreshUser.readLanguages.length, 1);
          assert.equal(refreshUser.readLanguages[0], 'en');
          assert.equal(refreshUser.writeLanguages.length, 1);
          assert.equal(refreshUser.writeLanguages[0], 'bot');

          // assert.equal(refreshUser.lastPlace, '201___en___test');
          done();
        });
      });
    });
  });

/*
  it('creates a Suggestion and asks to set user leaderboard name', (done) => {
    Suggestion.find({ user_id: 'fb:test' }).remove(() => {
      common.fbmessage(app, {message: {text: 'newnamedplace'}}, (err, res) => {
        if (err) {
          return done(err);
        }

        assert.include(res.text, 'What name would you like to have on the leaderboard?');

        Suggestion.find({ user_id: 'fb:test', suggested: 'newnamedplace' }, (err, suggestions) => {
          if (err) {
            return done(err);
          }
          assert.equal(suggestions.length, 1);
          assert.equal(suggestions[0].osm_place_id, '201');
          assert.equal(suggestions[0].targetLanguage, 'en');
          assert.equal(suggestions[0].originalName, 'test');
          assert.equal(suggestions[0].submitted, 0);
          done();
        });
      });
    });
  });

  it('sets user leaderboard name', (done) => {
    common.fbmessage(app, {message: {text: 'leadername'}}, (err, res) => {
      if (err) {
        return done(err);
      }

      FBUser.findById(commonUser._id, (err, refreshUser) => {
        if (err) {
          return done(err);
        }
        assert.equal(refreshUser.name, 'leadername');
        done();
      });
    });
  });
*/

  it('sets up a block on an FBUser', (done) => {
    commonUser.blocked = true;
    commonUser.save((err) => {
      if (err) {
        return done(err);
      }
      common.fbmessage(app, {message: {text: 'rambling'}}, (err, res) => {
        if (err) {
          return done(err);
        }

        assert.include(res.text, 'echo: rambling');
        done();
      });
    });
  });
});
