const crypto = require('crypto');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const OpenStreetMapStrategy = require('passport-openstreetmap').Strategy;

const User = require('./models/user');

function userSetup(app, middleware) {
  // Passport module setup
  app.use(passport.initialize());
  app.use(passport.session());

  if (typeof global.it === 'function') {
    /* in a test */
    passport.use(new LocalStrategy(
      (username, password, done) => {
        User.findOne({ osm_id: username, test: true }, function (err, user) {
          if (err) { return done(err); }
          if (!user) { return done(null, false); }
          return done(null, user);
        });
      }
    ));
  }
  else if (process.env.OPENSTREETMAP_CONSUMER_KEY && process.env.OPENSTREETMAP_CONSUMER_SECRET) {
    passport.use(
      new OpenStreetMapStrategy({
        consumerKey: process.env.OPENSTREETMAP_CONSUMER_KEY,
        consumerSecret: process.env.OPENSTREETMAP_CONSUMER_SECRET,
        callbackURL: "http://names.georeactor.com/auth/openstreetmap/callback"
      }, (token, tokenSecret, profile, done) => {
        var osm_user_name = profile._xml2js.user['@'].display_name;
        User.findOne({ osm_id: osm_user_name }, (err, user) => {
          if (err || user) {
            return done(err, user);
          }
          var u = new User({
            osm_id: osm_user_name,
            user_id: osm_user_name,
            name: 'unset'
          });
          u.save((err) => {
            done(err, u);
          });
        });
      })
    );
  }

  passport.serializeUser(function(user, done) {
    done(null, user);
  });
  passport.deserializeUser(function(obj, done) {
    done(null, obj);
  });

  // user registration form
  app.get('/register', middleware, (req, res) => {
    res.render('register', {
      user: req.user,
      csrfToken: req.csrfToken()
    });
  });

  // user login form
  app.get('/login', middleware, (req, res) => {
    res.render('login', {
      csrfToken: req.csrfToken()
    });
  });

  app.post('/login', middleware, (req, res) => {
    res.redirect('/projects');
  });

  app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/?loggedout');
  });

  // respond to user POST
  app.post('/register', middleware, (req, res) => {
    if (!req.user) {
      return res.redirect('/login');
    }

    User.findById(req.user._id, (err, u) => {
      if (err) {
        return res.json(err);
      }

      u.name = req.body.name;
      u.preferLanguage = req.body.preferLanguage;
      u.readLanguages = req.body.readLanguages;
      u.writeLanguages = req.body.writeLanguages;
      u.save((err) => {
        if (err) {
          return res.json(err);
        }
        req.user.name = u.name;
        res.redirect('/projects');
      });
    });
  });

  // OSM OAuth
  app.get('/auth/openstreetmap', passport.authenticate('openstreetmap'));
  app.get('/auth/openstreetmap/callback',
    passport.authenticate('openstreetmap', { failureRedirect: '/login?fail=true' }), (req, res) => {
      if (req.user.name === 'unset') {
        res.redirect('/register');
      } else {
        res.redirect('/projects');
      }
    });

  // local oauth test
  app.post('/auth/local', passport.authenticate('local', { failureRedirect: '/login?fail=true' }), (req, res) => {
    if (req.user.name === 'unset') {
      res.redirect('/register');
    } else {
      res.redirect('/projects');
    }
  });
}

module.exports = userSetup;
