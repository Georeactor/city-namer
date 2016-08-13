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
const request = require('request');

// my MongoDB data
const Place = require('./models/place');

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

// homepage for testing
app.get('/', csrfProtection, function (req, res) {
  res.render('index', {
    csrfToken: req.csrfToken()
  });
});

// JSON to check which places are already named in the database
app.post('/named', csrfProtection, function (req, res) {
  Place.find({ osm_id: { $in: req.body.osm_ids } }).select('osm_id').exec(function(err, places) {
    return res.json(err || places);
  });
});

app.post('/overpass', csrfProtection, function (req, res) {
  // this query should return a string with OSM XML
  request('http://overpass-api.de/api/interpreter?data=' + req.body.query.replace(/\s+/g, ''), function (err, resp, body) {
    if (err) {
      console.log('Overpass API error');
      return res.json(err);
    }
    res.send(body);
  });
});

// save a suggested place-name translation to the database
app.post('/name', csrfProtection, function (req, res) {
  var p = new Place({
    user_id: '',
    osm_id: req.body.osm_id,
    name: req.body.name,
    suggested: req.body.suggested,
    language: req.body.language,
    saved: new Date()
  });
  p.save(function(err) {
    return res.json(err || { status: 'success', _id: p._id });
  });
});

// browse to verify everything makes sense
app.get('/names', function (req, res) {
  Place.find({}).sort('-saved').limit(10).exec(function(err, places) {
    return res.json(err || places);
  });
});

app.listen(process.env.PORT || 8080, function() { });

module.exports = app;
