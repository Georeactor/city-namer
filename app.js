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

// browser city-renaming
const checkForNameless = require('check-for-nameless');

// my MongoDB models
const Suggestion = require('./models/suggestion');
const Place = require('./models/place');
const User = require('./models/user');
const FBUser = require('./models/fb-user');

var app = express();

app.turnon = function() {
  console.log('Connecting to MongoDB (required)');
  mongoose.connect(process.env.MONGOLAB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/citynamer');
};
app.turnon();

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
  secret: process.env.SESSION || 'fj23f90jfoijfl2mfp293i019eoijdoiqwj129'
}));

const csrfProtection = csrf({ cookie: true });

/* for use in testing only */
function passThrough(req, res, next) {
  if (typeof global.it === 'function') {
    if (req.method === 'POST') {
      next();
    } else {
      return csrfProtection(req, res, next);
    }
  } else {
    throw 'passThrough happening in production';
  }
}
const middleware = ((typeof global.it === 'function') ? passThrough : csrfProtection);

// user registration and management
require('./login')(app, middleware);

// task manager / projects interface
require('./project')(app, middleware);

// Facebook Messenger bot interface
require('./bot')(app, middleware);

// homepage for testing
app.get('/', (req, res) => {
  // include data for leaderboard
  Suggestion.aggregate([{ $group: {
    _id: '$name',
    count: { $sum: 1 },
    verified: { $sum: '$submitted' }
  }}]).exec((err, results) => {
    if (!results) {
      results = [];
    }

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

app.post('/overpass', middleware, (req, res) => {
  checkForNameless({
    north: req.body.north,
    south: req.body.south,
    east: req.body.east,
    west: req.body.west,
    targetLang: req.body.toLanguage
  }, (err, body) => {
    if (err) {
      console.log('Overpass API error');
    }
    return res.send(body || err);
  });
});

// save a suggested place-name translation to the database
app.post('/name', middleware, (req, res) => {
  if (!req.user || req.user.blocked) {
    return res.redirect('/login');
  }
  // check for any previous, overlapping Suggestions
  var uniqueKeys = {
    osm_place_id: req.body.osm_place_id,
    osm_user_id: req.user.osm_id,
    targetLanguage: req.body.language
  };
  Suggestion.findOne(uniqueKeys, (err, s1) => {
    if (err) {
      return res.json(err);
    }
    if (s1) {
      return res.json({ error: 'user has already suggested a name for this place' });
    }
    var normalizeSuggested = req.body.suggested.trim();

    var p = new Suggestion({
      user_id: req.user._id,
      osm_user_id: req.user.osm_id,
      osm_place_id: req.body.osm_place_id,
      originalName: req.body.name,
      suggested: normalizeSuggested,
      targetLanguage: req.body.language,
      submitted: 0,
      saved: new Date()
    });
    p.save((err) => {
      if (err) {
        return res.json(err);
      }

      // now check if enough users agree to make an OSM edit
      var matchingKeys = {
        osm_place_id: req.body.osm_place_id,
        targetLanguage: req.body.language,
        suggested: normalizeSuggested
      };
      Suggestion.countDocuments(matchingKeys, (err, scount) => {
        if (err) {
          return res.json(err);
        }

        // ultimately let user know that their suggestion worked
        function success() {
          res.json({ status: 'success', _id: p._id });
        }

        if (scount === 3) {
          // enough users agree - find an inactive Place
          Place.find({
            osm_place_id: uniqueKeys.osm_place_id,
            language: uniqueKeys.targetLanguage,
            submitted: 0
          }, (err, places) => {
            if (err) {
              return res.json(err);
            }
            if (!places.length) {
              return res.json({ error: 'no matching, unsubmitted Places found' });
            }
            for (var p = 0; p < places.length; p++) {
              console.log('translated ' + places[p].name + ' to ' + normalizeSuggested);
              places[p].submitted = 1;
              places[p].suggested = normalizeSuggested;
              places[p].save((err) => {
                if (err) {
                  console.log(err);
                }
              });
            }
            success();
          });
        } else {
          // not enough users agree yet
          success();
        }
      });
    });
  });
});

app.get('/verify', (req, res) => {
  // temporary data check for whether we are ready to verify any Suggestions
  Place.aggregate([{ $group: { _id: "$osm_place_id", count: { $sum: 1 } } }]).exec((err, results) => {
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

app.turnoff = function() {
  mongoose.connection.close();
  app.close();
};

module.exports = app;
