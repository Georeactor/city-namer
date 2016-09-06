const User = require('./models/user');
const Project = require('./models/project');

function projectSetup(app, csrfProtection) {
  app.get('/projects', csrfProtection, (req, res) => {
    var query = Project.find({}).sort('-saved');
    var readLanguages = (req.query.readLanguages || '').split(',');
    var writeLanguages = (req.query.writeLanguages || '').split(',');
    if ((!readLanguages && !writeLanguages) && req.user) {
      readLanguages = req.user.readLanguages;
      writeLanguages = req.user.writeLanguages;
    }

    if (readLanguages) {
      query = query.find({ fromLanguages: { $in: readLanguages } });
    }
    if (writeLanguages) {
      query = query.find({ toLanguage: { $in: writeLanguages } });
    }

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
      res.json(err || project);
    });
  });
}

module.exports = projectSetup;
