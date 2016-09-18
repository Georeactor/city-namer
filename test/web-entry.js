const assert = require('chai').assert;
const request = require('supertest');

const app = require('../app');
const common = require('./common');

const Project = require('../models/project');

describe('logged out', () => {
  it('returns homepage with login button', (done) => {
    request(app)
      .get('/')
      .expect(200)
      .end((err, res) => {
        if (err) {
          return common.clear(done, () => { done(err); });
        }
        assert.include(res.text, 'Log In');
        common.clear(done, done);
      });
  });

  it('returns a project list', (done) => {
    common.make.Project(done, () => {
      request(app)
        .get('/projects')
        .expect(200)
        .end((err, res) => {
          if (err) {
            return common.clear(done, () => { done(err); });
          }
          assert.match(res.text, /zh, ne.*rarr;.*en/);
          assert.notInclude(res.text, 'Create a new project');
          common.clear(done, done);
        });
    });
  });

  it('redirects /projects/new to /login', (done) => {
    request(app)
      .get('/projects/new')
      .expect(302)
      .end((err, res) => {
        if (err) {
          return common.clear(done, () => { done(err); });
        }
        assert.include(res.text, 'Redirecting to /login')
        common.clear(done, done);
      });
  });
});

describe('logged in', () => {
  const agent = request.agent(app);

  it('logs in', (done) => {
    common.make.User(done, (u) => {
      agent
        .post('/auth/local')
        .send({ username: 'mapmeld', password: 'test' })
        .expect(302)
        .end((err, res) => {
          if (err) {
            return common.clear(done, () => { done(err); });
          }
          common.clear(done, done);
        });
    });
  });

  it('returns homepage with view projects / logout', (done) => {
    agent
      .get('/')
      .expect(200)
      .end((err, res) => {
        if (err) {
          return common.clear(done, () => { done(err); });
        }
        assert.include(res.text, 'View Projects');
        assert.include(res.text, 'Log Out');
        common.clear(done, done);
      });
  });

  it('returns a project list', (done) => {
    common.make.Project(done, () => {
      agent
        .get('/projects')
        .expect(200)
        .end((err, res) => {
          if (err) {
            return common.clear(done, () => { done(err); });
          }
          assert.match(res.text, /zh, ne.*rarr;.*en/);
          assert.include(res.text, 'Create a new project');
          common.clear(done, done);
        });
    });
  });

  it('shows a /projects/new form', (done) => {
    agent
      .get('/projects/new')
      .expect(200)
      .end((err, res) => {
        if (err) {
          return common.clear(done, () => { done(err); });
        }
        assert.include(res.text, 'Creating a City-Namer Project');
        common.clear(done, done);
      });
  });
});
