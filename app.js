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

// querying Overpass
const checkForNameless = require('check-for-nameless');

// my MongoDB data
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
  Place.aggregate({ $group: { _id: "$user_id", count: { $sum: 1 } } }).exec(err, results) =>
    var leaders = [];
    results = results.sort((a, b) => {
      return a.count - b.count;
    });
    results.map((result) => {
      leaders.push({
        name: result._id,
        count: result.count
      });
    });

    res.render('index', {
      user: req.user,
      leaders: leaders
    });
  });
});

// map for naming
app.get('/app', csrfProtection, (req, res) => {
  res.render('naming', {
    lat: 39.8985,
    lng: 116.3989,
    zoom: 12,
    fromLanguages: ['es', 'fr'],
    toLanguage: 'en',
    endlang: 'English',
    csrfToken: req.csrfToken()
  });
});

// JSON to check which places are already named in the database
/*
app.post('/named', csrfProtection, (req, res) => {
  Place.find({ osm_id: { $in: req.body.osm_ids } }).select('osm_id').exec((err, places) => {
    return res.json(err || places);
  });
});
*/

app.post('/overpass', csrfProtection, (req, res) => {
  // this query should return a string with OSM XML
  checkForNameless({
    north: req.body.north,
    south: req.body.south,
    east: req.body.east,
    west: req.body.west,
    targetLang: req.body.targetLang
  }, (err, body) =>
    if (err) {
      console.log('Overpass API error');
      return res.json(err);
    }
    res.send(body);
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
    return res.json(err || { status: 'success', _id: p._id });
  });
});

app.listen(process.env.PORT || 8080, () => {
  console.log('app is running');
});

module.exports = app;
