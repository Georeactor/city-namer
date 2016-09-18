const assert = require('chai').assert;
const request = require('supertest');

const app = require('../app');

describe('logged out', () => {
  it('returns homepage with login button', (done) => {
    request(app)
      .get('/')
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        assert.include(res.text, 'Log In');
        done();
      });
  });

  it('returns a project list', (done) => {
    // TODO: create a test project

    request(app)
      .get('/projects')
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        assert.include(res.text, 'en');
        assert.notInclude(res.text, 'Create a new project');
        done();
      });
  });

  it('redirects /projects/new to /login', (done) => {
    request(app)
      .get('/projects/new')
      .expect(302)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        assert.include(res.text, 'Redirecting to /login')
        done();
      });
  });
});

describe('logged in', () => {

});
