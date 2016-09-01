const User = require('./models/user');
const Project = require('./models/project');

function projectSetup(app, csrfProtection) {
  app.get('/projects', csrfProtection, (req, res) => {
    var query = Project.find({}).sort('-saved');
    if (req.user) {
      query = query.find({
        readLanguage: { $in: req.user.readLanguages },
        writeLanguage: { $in: req.user.writeLanguages }
      });
    }

    query.exec( (err, projects) => {
      if (err) {
        return res.json(err);
      }
      res.render('projects', {
        user: req.user,
        projects: projects
      });
    });
  });
}

module.exports = projectSetup;
