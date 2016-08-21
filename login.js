const crypto = require('crypto');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const OpenStreetMapStrategy = require('passport-openstreetmap').Strategy;

const User = require('./models/user');

function userSetup(app, csrfProtection) {
  // Passport module setup
  app.use(passport.initialize());
  app.use(passport.session());
  /*
  passport.use(new OpenStreetMapStrategy({
    consumerKey: OPENSTREETMAP_CONSUMER_KEY,
    consumerSecret: OPENSTREETMAP_CONSUMER_SECRET,
    callbackURL: "http://127.0.0.1:3000/auth/openstreetmap/callback"
  }, (token, tokenSecret, profile, done) => {
      User.findOrCreate({ openstreetmapId: profile.id }, (err, user) => {
        return done(err, user);
      });
    }
  ));
  */

  // user registration form
  app.get('/register', csrfProtection, (req, res) => {
    res.render('register', {
      csrfToken: req.csrfToken()
    });
  });

  // respond to user POST
  app.post('/register', csrfProtection, (req, res) => {
    res.redirect('/projects');
  });

  // OSM OAuth
  app.get('/auth/openstreetmap', passport.authenticate('openstreetmap'));
  app.get('/auth/openstreetmap/callback',
    passport.authenticate('openstreetmap', { failureRedirect: '/login' }), (req, res) => {
      res.redirect('/projects');
    });
}

module.exports = userSetup;
