const assert = require('chai').assert;
const request = require('supertest');

const app = require('../app');
const common = require('./common');

const Project = require('../models/project');
const Suggestion = require('../models/suggestion');

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
          assert.match(res.text, /Chinese, Nepali.*rarr;.*English/);
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

  it('cannot create a new Project', (done) => {
    request(app)
      .post('/projects/new')
      .send({
        fromLanguages: ['fr', 'en'],
        toLanguage: 'ht',
        directions: 'sample',
        north: 1,
        south: -1,
        east: 1,
        west: -1,
        lat: 0,
        lng: 0,
        zoom: 14
      })
      .expect(302)
      .end((err, res) => {
        if (err) {
          return common.clear(done, () => { done(err); });
        }
        assert.include(res.text, 'Redirecting to /login')
        common.clear(done, done);
      });
  });

  it('cannot submit a Suggestion to a Project', (done) => {
    common.make.Project(done, (project) => {
      common.make.Place(project, done, (place) => {
        request(app)
          .post('/name')
          .send({
            osm_place_id: place.osm_place_id,
            originalName: place.name,
            suggested: 'fakename',
            targetLanguage: 'en',
          })
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
  });
});

describe('logged in', () => {
  const agent = request.agent(app);

  it('logs in', (done) => {
    common.make.User(done, (u) => {
      agent
        .post('/auth/local')
        .send({ username: 'mapmeldtest', password: 'test' })
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
          assert.match(res.text, /Chinese, Nepali.*rarr;.*English/);
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

  it('creates a new Project', (done) => {
    agent
      .post('/projects/new')
      .send({
        fromLanguages: ['fr', 'en'],
        toLanguage: 'ht',
        directions: 'sample',
        north: 1,
        south: -1,
        east: 1,
        west: -1,
        lat: 0,
        lng: 0,
        zoom: 14
      })
      .expect(302)
      .end((err, res) => {
        if (err) {
          return common.clear(done, () => { done(err); });
        }
        assert.include(res.text, 'Redirecting to /projects/');
        Project.find({ directions: 'sample' }, (err, projects) => {
          if (err) {
            console.log(err);
            return common.clear(done, () => { done(err); });
          }
          Project.find({ directions: 'sample' }).remove(() => {});
          assert.equal(projects.length, 1);
          common.clear(done, done);
        });
      });
  });

  it('submits a Suggestion to a Project', (done) => {
    common.make.Project(done, (project) => {
      common.make.Place(project, done, (place) => {
        agent
          .post('/name')
          .send({
            osm_place_id: place.osm_place_id,
            originalName: place.name,
            suggested: 'fakename',
            targetLanguage: 'en',
          })
          .expect(200)
          .end((err, res) => {
            if (err) {
              return common.clear(done, () => { done(err); });
            }
            assert.include(res.text, 'success');
            Suggestion.find({ suggested: 'fakename' }, (err, suggestions) => {
              if (err) {
                console.log(err);
                return common.clear(done, () => { done(err); });
              }
              Suggestion.find({ suggested: 'fakename' }).remove(() => {});
              assert.equal(suggestions.length, 1);
              assert.equal(suggestions[0].submitted, 0);
              common.clear(done, done);
            });
          });
      });
    });
  });
});
