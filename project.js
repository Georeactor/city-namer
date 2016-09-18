const User = require('./models/user');
const Project = require('./models/project');

const endlangs = {
  'en': 'English',
  'fr': 'French',
  'es': 'Spanish',
  'ne': 'Nepali',
  'ht': 'Haitian Creole',
  'zh': 'Chinese'
};

const hardcodedAdmins = ['mapmeld'];

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
        isAdmin: (hardcodedAdmins.indexOf(req.user.osm_id) > -1),
        rows: rows
      });
    });
  });

  app.get('/projects/new', csrfProtection, (req, res) => {
    if (!req.user) {
      return res.redirect('/login');
    }
    res.render('new-project', {
      csrfToken: req.csrfToken()
    });
  });

  app.post('/projects/new', csrfProtection, (req, res) => {
    if (!req.user) {
      return res.redirect('/login');
    }
    var p = new Project({
      founding_user_id: req.user._id,
      founding_user_osm_id: req.user.osm_id,
      fromLanguages: req.body.fromLanguages,
      toLanguage: req.body.toLanguage,
      directions: req.body.directions,
      saved: new Date(),
      lat: req.body.lat,
      lng: req.body.lng,
      zoom: req.body.zoom
    });
    p.save((err) => {
      if (err) {
        return res.json(err);
      }
      res.redirect('/projects/' + p._id);
    });
  });

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

  app.get('/projects/:id/delete', (req, res) => {
    Project.findById(req.params.id, (err, project) => {
      if (err) {
        return res.json(err);
      }
      if (req.user && hardcodedAdmins.indexOf(req.user.osm_id) > -1) {
        project.delete((err) => {
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
