const assert = require('chai').assert;
const request = require('supertest');

const app = require('../app');
const common = require('./common');

const FBUser = require('../models/fb-user');
const Project = require('../models/project');
const Place = require('../models/place');
const Suggestion = require('../models/suggestion');

describe('creating an account', () => {
  after(() => {
    common.clear();
  });

  it('welcomes a new user', (done) => {
    request(app)
      .post('/webhook')
      .send({
        test: true,
        entry: [{
          messaging: [{
            sender: {
              id: 'test'
            },
            message: {
              text: 'hello!'
            }
          }]
        }]
      })
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        FBUser.find({ user_id: 'test' }).remove(() => {
          assert.include(res.text, 'Welcome to OSM City Namer');
          done();
        });
      });
  });

  it('saves user language preference', (done) => {
    common.make.FBUser(done, (fb) => {
      request(app)
        .post('/webhook')
        .send({
          test: true,
          entry: [{
            messaging: [{
              sender: {
                id: 'test'
              },
              postback: {
                payload: 'rw:bot:bot'
              }
            }]
          }]
        })
        .expect(200)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          assert.include(res.text, 'no more places for you to translate');
          FBUser.findById(fb._id, (err, refreshUser) => {
            if (err) {
              return done(err);
            }
            assert.equal(refreshUser.readLanguages.length, 1);
            assert.equal(refreshUser.readLanguages[0], 'bot');
            assert.equal(refreshUser.writeLanguages.length, 1);
            assert.equal(refreshUser.writeLanguages[0], 'bot');
            done();
          });
        });
    });
  });
});
