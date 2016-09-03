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
      query = query.find({ readLanguage: { $in: readLanguages } });
    }
    if (writeLanguages) {
      query = query.find({ writeLanguage: { $in: writeLanguages } });
    }

    query.exec( (err, projects) => {
      if (err) {
        return res.json(err);
      }

      if (!projects.length) {
        // insert test projects
        projects = [{
          _id: 1,
          title: 'Nepal',
          lng: -71,
          lat: 43,
          readLanguages: ['en', 'fr'],
          writeLanguages: ['ne']
        }];
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
    
  });

  app.get('/projects/:id', csrfProtection, (req, res) => {
    Project.findById(req.params.id, (err, project) => {
      res.json(err || project);
    });
  });
}

module.exports = projectSetup;
