// querying Overpass
const cheerio = require('cheerio');
const checkForNameless = require('check-for-nameless');

// MongoDB models
const User = require('./models/user');
const Project = require('./models/project');
const Place = require('./models/place');

// language codes
const endlangs = {
  'en': 'English',
  'fr': 'French',
  'es': 'Spanish',
  'ne': 'Nepali',
  'ht': 'Haitian Creole',
  'zh': 'Mandarin Chinese',
  'ja': 'Japanese'
};

// order of importance for a place=___ tag (translate a country before a state before a city)
const placeRelevance = ['hamlet', 'village', 'town', 'plot', 'city_block', 'neighborhood',
  'neighbourhood', 'quarter', 'island', 'suburb', 'borough', 'city', 'municipality', 'county',
  'district', 'province', 'region', 'state', 'country'];

// can delete Projects
const hardcodedAdmins = ['mapmeld'];

function processPlaces(xmlbody, project, callback) {
  // response contains OSM XML place nodes
  var $ = cheerio.load(xmlbody);
  var pts = $('node');

  for (var p = 0; p < pts.length; p++) {
    var target = $(pts[p]);
    var pl = new Place({
      osm_place_id: target.attr('id'),
      name: target.find('tag[k="name"]').attr('v'),
      osm_size: target.find('tag[k="place"]').attr('v'),
      language: project.toLanguage,
      project: project._id,
      saved: new Date(),
      submitted: 0
    });
    pl.save();
  }
  callback();
}

function projectSetup(app, csrfProtection) {
  app.get('/projects', csrfProtection, (req, res) => {
    var query = Project.find({}).sort('-saved');
    var readLanguages = (req.query.readLanguages || '').split(',');
    var writeLanguages = (req.query.writeLanguages || '').split(',');
    if ((!readLanguages && !writeLanguages) && req.user) {
      readLanguages = req.user.readLanguages;
      writeLanguages = req.user.writeLanguages;
    }

/*
    if (readLanguages) {
      query = query.find({ fromLanguages: { $in: readLanguages } });
    }
    if (writeLanguages) {
      query = query.find({ toLanguage: { $in: writeLanguages } });
    }
    */

    query.exec( (err, projects) => {
      if (err) {
        return res.json(err);
      }

      var rows = [];
      while (projects.length) {
        rows.push(projects.splice(0, 3));
      }

      res.render('projects', {
        user: req.user,
        isAdmin: (hardcodedAdmins.indexOf((req.user || {}).osm_id) > -1),
        rows: rows,
        endlangs: endlangs
      });
    });
  });

  app.get('/projects/new', csrfProtection, (req, res) => {
    if (!req.user) {
      return res.redirect('/login');
    }

    // new Project form, easy
    res.render('new-project', {
      csrfToken: req.csrfToken()
    });
  });

  app.post('/projects/new', csrfProtection, (req, res) => {
    if (!req.user) {
      return res.redirect('/login');
    }

    // ready to create a new Project
    var p = new Project({
      founding_user_id: req.user._id,
      founding_user_osm_id: req.user.osm_id,
      fromLanguages: req.body.fromLanguages,
      toLanguage: req.body.toLanguage,
      directions: req.body.directions,
      saved: new Date(),
      north: req.body.north,
      south: req.body.south,
      east: req.body.east,
      west: req.body.west,
      lat: req.body.lat,
      lng: req.body.lng,
      zoom: req.body.zoom
    });
    p.save((err) => {
      if (err) {
        return res.json(err);
      }

      // one-time Overpass query for Places
      checkForNameless({
        north: req.body.north,
        south: req.body.south,
        east: req.body.east,
        west: req.body.west,
        targetLang: req.body.toLanguage
      }, (err, body) => {
        if (err) {
          console.log('Overpass API error');
          return res.json(err);
        }
        processPlaces(body, p, (err) => {
          if (err) {
            return res.json(err);
          }
          res.redirect('/projects/' + p._id);
        });
      });
    });
  });

  // naming app screen
  app.get('/projects/:id', csrfProtection, (req, res) => {
    Project.findById(req.params.id, (err, project) => {
      if (err) {
        return res.json(err);
      }
      res.render('naming', {
        lat: project.lat,
        lng: project.lng,
        zoom: project.zoom,
        fromLanguages: project.fromLanguages,
        toLanguage: project.toLanguage,
        endlang: endlangs[project.toLanguage],
        csrfToken: req.csrfToken()
      });
    });
  });

  // hardcoded-admin-only delete a Project
  app.get('/projects/:id/delete', (req, res) => {
    Project.findById(req.params.id, (err, project) => {
      if (err) {
        return res.json(err);
      }
      if (!project) {
        return res.json({ error: 'not valid project id' });
      }
      if (req.user && hardcodedAdmins.indexOf(req.user.osm_id) > -1) {
        project.remove((err) => {
          if (err) {
            return res.json(err);
          }
          res.redirect('/projects');
        });
      } else {
        res.json({ error: 'not valid admin' });
      }
    });
  });
}

module.exports = projectSetup;
