const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const compression = require('compression');
const mongoose = require('mongoose');
const csrf = require('csurf');
const request = require('request');

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

var csrfProtection = csrf({ cookie: true });

// homepage
app.get('/', csrfProtection, function (req, res) {
  res.render('index', {
    csrfToken: req.csrfToken()
  });
});

app.get('/overpass', csrfProtection, function (req, res) {
  console.log(req.query.query)
  request('http://overpass-api.de/api/interpreter?data=' + req.query.query.replace(/\s+/g, ''), function (err, resp, body) {
    if (err) {
      throw err;
    }
    res.send(body);
  });
});

app.listen(process.env.PORT || 8080, function() { });

module.exports = app;
