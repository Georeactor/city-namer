const fs = require('fs');

// express setup
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const compression = require('compression');
const mongoose = require('mongoose');
const csrf = require('csurf');

// my MongoDB models
const Suggestion = require('./models/suggestion');
const Place = require('./models/place');
const User = require('./models/user');
const FBUser = require('./models/fb-user');

console.log('Connecting to MongoDB (required)');
mongoose.connect(process.env.MONGOLAB_URI || process.env.MONGODB_URI || 'localhost');

var app = express();
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express['static'](__dirname + '/static'));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(compression());
app.use(cookieParser());
app.use(session({
  store: new MongoStore({
    mongooseConnection: mongoose.connection
  }),
  secret: process.env.SESSION || 'fj23f90jfoijfl2mfp293i019eoijdoiqwj129',
  resave: false,
  saveUninitialized: false
}));

const csrfProtection = csrf({ cookie: true });

// user registration and management
require('./login')(app, csrfProtection);

// task manager / projects interface
require('./project')(app, csrfProtection);

// Facebook Messenger bot interface
require('./bot')(app, csrfProtection);

// homepage for testing
app.get('/', (req, res) => {
  // include data for leaderboard
  Suggestion.aggregate({ $group: {
    _id: '$name',
    count: { $sum: 1 },
    verified: { $sum: '$submitted' }
  }}).exec((err, results) => {

    // leaderboard should shop top users (web and Facebook)
    var leaders = [];
    results.sort((a, b) => {
      return b.count - a.count;
    });
    results.map((result) => {
      leaders.push({
        name: result._id,
        count: result.count,
        verified: result.verified
      });
    });

    res.render('index', {
      user: req.user,
      leaders: leaders.slice(0, 4)
    });
  });
});

// save a suggested place-name translation to the database
app.post('/name', csrfProtection, (req, res) => {
  if (!req.user) {
    return res.redirect('/login');
  }

  var p = new Suggestion({
    user_id: req.user._id,
    osm_user_id: req.user.osm_id,
    osm_place_id: req.body.osm_place_id,
    originalName: req.body.name,
    suggested: req.body.suggested,
    targetLanguage: req.body.language,
    saved: new Date()
  });
  p.save((err) => {
    // TODO: check for three confirmations on the Place
    return res.json(err || { status: 'success', _id: p._id });
  });
});

app.get('/verify', (req, res) => {
  // temporary data check for whether we are ready to verify any Suggestions
  Place.aggregate({ $group: { _id: "$osm_place_id", count: { $sum: 1 } } }).exec((err, results) => {
    if (results && results.length) {
      results.sort((a, b) => {
        return a.count - b.count;
      });
    }
    res.json(err || results);
  });
});

app.listen(process.env.PORT || 8080, () => {
  console.log('app is running');
});

module.exports = app;
