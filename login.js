const crypto = require('crypto');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const OpenStreetMapStrategy = require('passport-openstreetmap').Strategy;

const User = require('./models/user');

function userSetup(app, csrfProtection) {
  // Passport module setup
  app.use(passport.initialize());
  app.use(passport.session());
  passport.use(new OpenStreetMapStrategy({
      consumerKey: process.env.OPENSTREETMAP_CONSUMER_KEY,
      consumerSecret: process.env.OPENSTREETMAP_CONSUMER_SECRET,
      callbackURL: "http://city-namer.herokuapp.com/auth/openstreetmap/callback"
    }, (token, tokenSecret, profile, done) => {
      console.log(profile);
      return done(err, null);
    }
  ));

  // user registration form
  app.get('/register*', csrfProtection, (req, res) => {
    res.render('register', {
      csrfToken: req.csrfToken()
    });
  });

  // respond to user POST
  app.post('/register', csrfProtection, (req, res) => {
    var user_input = {
      osm_id: req.body.osm_id,
      name: req.body.name,
      preferLanguage: req.body.preferLanguage,
      readLanguages: req.body.readLanguages,
      writeLanguages: req.body.writeLanguages
    };
    console.log(user_input);

    var u = new User(user_input);
    u.save((err) => {
      if (err) {
        return res.json(err);
      }
      res.redirect('/login?withname=' + req.body.userName);
    });
  });

  // OSM OAuth
  app.get('/auth/openstreetmap', passport.authenticate('openstreetmap'));
  app.get('/auth/openstreetmap/callback',
    passport.authenticate('openstreetmap', { failureRedirect: '/login' }), (req, res) => {
      res.redirect('/register');
    });
}

module.exports = userSetup;
