const assert = require('chai').assert;
const request = require('supertest');

const common = require('./common');
const app = common.app;

const User = require('../models/user');
const Project = require('../models/project');
const Place = require('../models/place');
const Suggestion = require('../models/suggestion');

describe('logged out', () => {
  after(() => {
    common.clear();
  });

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
    common.make.Project(done, () => {
      request(app)
        .get('/projects')
        .expect(200)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          assert.match(res.text, /Chinese, Nepali.*rarr;.*English/);
          assert.notInclude(res.text, 'Create a new project');
          done();
        });
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
          return done(err);
        }
        assert.include(res.text, 'Redirecting to /login')
        done();
      });
  });

  it('cannot submit a Suggestion to a Place', (done) => {
    common.make.Place('101', done, (place) => {
      request(app)
        .post('/name')
        .send({
          osm_place_id: place.osm_place_id,
          originalName: place.name,
          suggested: 'fakename',
          language: 'en',
        })
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
});

describe('logged in', () => {
  const agent = request.agent(app);
  var commonUser;

  after(() => {
    common.clear();
  });

  it('logs in', (done) => {
    common.make.User('mapmeldtest', done, (u) => {
      commonUser = u;
      agent
        .post('/auth/local')
        .send({ username: 'mapmeldtest', password: 'test' })
        .expect(302)
        .end((err, res) => {
          return done(err);
        });
    });
  });

  it('returns homepage with view projects / logout', (done) => {
    agent
      .get('/')
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        assert.include(res.text, 'View Projects');
        assert.include(res.text, 'Log Out');
        done();
      });
  });

  it('returns a project list', (done) => {
    common.make.Project(done, () => {
      agent
        .get('/projects')
        .expect(200)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          assert.match(res.text, /Chinese, Nepali.*rarr;.*English/);
          assert.include(res.text, 'Create a new project');
          done();
        });
    });
  });

  it('shows a /projects/new form', (done) => {
    agent
      .get('/projects/new')
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        assert.include(res.text, 'Creating a City-Namer Project');
        done();
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
          return done(err);
        }
        assert.include(res.text, 'Redirecting to /projects/');
        Project.find({ directions: 'sample' }, (err, projects) => {
          if (err) {
            return done(err);
          }
          Project.find({ directions: 'sample' }).remove(() => {});
          assert.equal(projects.length, 1);
          done();
        });
      });
  });

  it('submits a Suggestion to a Place', (done) => {
    common.make.Place('101', done, (place) => {
      agent
        .post('/name')
        .send({
          osm_place_id: place.osm_place_id,
          originalName: place.name,
          suggested: 'fakename',
          language: 'en',
        })
        .expect(200)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          assert.include(res.text, 'success');
          Suggestion.find({ suggested: 'fakename' }, (err, suggestions) => {
            if (err) {
              return done(err);
            }
            Suggestion.find({ suggested: 'fakename' }).remove(() => {});
            assert.equal(suggestions.length, 1);
            // it hasn't been submitted
            assert.equal(suggestions[0].submitted, 0);
            done();
          });
        });
    });
  });

  it('rejects a 2nd Suggestion by the same user', (done) => {
    common.clear(done, () => {
      common.make.Place('101', done, (place) => {
        common.make.Suggestion(commonUser, place, done, (s1) => {
          agent
            .post('/name')
            .send({
              osm_place_id: place.osm_place_id,
              originalName: place.name,
              suggested: 'fakename',
              language: 'en',
            })
            .expect(200)
            .end((err, res) => {
              if (err) {
                return done(err);
              }
              assert.include(res.text, 'user has already suggested a name for this place');
              done();
            });
        });
      });
    });
  });

  it('submits a third Suggestion for a Place, but there is NO match', (done) => {
    common.clear(done, () => {
      common.make.Place('101', done, (place) => {
        common.make.User('firstguy', done, (u1) => {
          common.make.User('secondguy', done, (u2) => {
            common.make.Suggestion(u1, place, done, (s1) => {
              common.make.Suggestion(u2, place, done, (s2) => {
                agent
                  .post('/name')
                  .send({
                    osm_place_id: place.osm_place_id,
                    originalName: place.name,
                    suggested: 'DifferentStuff',
                    language: 'en',
                  })
                  .expect(200)
                  .end((err, res) => {
                    if (err) {
                      return done(err);
                    }
                    Suggestion.find({ suggested: 'DifferentStuff' }).remove(() => {});
                    assert.include(res.text, 'success');
                    Place.findById(place._id, (err, reviewPlace) => {
                      if (err) {
                        return done(err);
                      }
                      assert.equal(reviewPlace.suggested, '');
                      assert.equal(reviewPlace.submitted, 0);
                      done();
                    });
                  });
              });
            });
          });
        });
      });
    });
  });

  it('submits the third matching Suggestion for a Place, triggering an OSM edit', (done) => {
    common.clear(null, () => {
      common.make.Place('1010', done, (place) => {
        common.make.User('firstguy', done, (u1) => {
          common.make.User('secondguy', done, (u2) => {
            common.make.Suggestion(u1, place, done, (s1) => {
              common.make.Suggestion(u2, place, done, (s2) => {
                agent
                  .post('/name')
                  .send({
                    osm_place_id: place.osm_place_id,
                    originalName: place.name,
                    suggested: 'TestTest',
                    language: 'en',
                  })
                  .expect(200)
                  .end((err, res) => {
                    if (err) {
                      return done(err);
                    }
                    Suggestion.find({ suggested: 'TestTest' }).remove(() => {});
                    assert.include(res.text, 'success');
                    Place.findById(place._id, (err, reviewPlace) => {
                      if (err) {
                        return done(err);
                      }
                      assert.equal(reviewPlace.suggested, 'TestTest');
                      assert.equal(reviewPlace.submitted, 1);
                      done();
                    });
                  });
              });
            });
          });
        });
      });
    });
  });
});

describe('logged in but blocked', () => {
  const agent = request.agent(app);
  var commonUser;

  after(() => {
    common.clear();
  });

  it('logs in', (done) => {
    common.make.User('mapmeldtest', done, (u) => {
      u.blocked = true;
      commonUser = u;
      u.save((err) => {
        if (err) {
          return done(err);
        }
        agent
          .post('/auth/local')
          .send({ username: 'mapmeldtest', password: 'test' })
          .expect(302)
          .end((err, res) => {
            done(err);
          });
      });
    });
  });

  it('cannot create a new Project', (done) => {
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
          return done(err);
        }
        assert.include(res.text, 'Redirecting to /login')
        done();
      });
  });

  it('cannot submit a Suggestion to a Place', (done) => {
    common.make.Place('101', done, (place) => {
      agent
        .post('/name')
        .send({
          osm_place_id: place.osm_place_id,
          originalName: place.name,
          suggested: 'fakename',
          language: 'en',
        })
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
});
