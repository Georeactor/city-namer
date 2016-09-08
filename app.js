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

// user registration and management
require('./login')(app, csrfProtection);

// official task manager / projects interface
require('./project')(app, csrfProtection);

// homepage for testing
app.get('/', (req, res) => {
  res.render('index', {
    user: req.user
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
    csrfToken: req.csrfToken()
  });
});

// JSON to check which places are already named in the database
app.post('/named', csrfProtection, (req, res) => {
  Place.find({ osm_id: { $in: req.body.osm_ids } }).select('osm_id').exec((err, places) => {
    return res.json(err || places);
  });
});

app.post('/overpass', csrfProtection, (req, res) => {
  // this query should return a string with OSM XML
  var query =
    "node \
      [place] \
      [name] \
      ['name:TARGETLANG'!~'.'] \
      (SOUTH,WEST,NORTH,EAST); \
    (._;>;); \
    out;";
  query = query.replace('NORTH', req.body.north);
  query = query.replace('SOUTH', req.body.south);
  query = query.replace('EAST', req.body.east);
  query = query.replace('WEST', req.body.west);
  query = query.replace('TARGETLANG', req.body.targetLang);

  request('http://overpass-api.de/api/interpreter?data=' + query.replace(/\s+/g, ''), (err, resp, body) => {
    if (err) {
      console.log('Overpass API error');
      return res.json(err);
    }
    res.send(body);
  });
});

// save a suggested place-name translation to the database
app.post('/name', csrfProtection, (req, res) => {
  var p = new Place({
    user_id: '',
    osm_id: req.body.osm_id,
    name: req.body.name,
    suggested: req.body.suggested,
    language: req.body.language,
    saved: new Date()
  });
  p.save((err) => {
    return res.json(err || { status: 'success', _id: p._id });
  });
});

// browse to verify everything makes sense
app.get('/names', csrfProtection, (req, res) => {
  Place.find({}).sort('-saved').limit(10).exec( (err, places) => {
    return res.json(err || places);
  });
});

app.listen(process.env.PORT || 8080, () => {
  console.log('app is running');
});

module.exports = app;
