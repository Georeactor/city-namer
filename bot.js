const Place = require('./models/place');

function botSetup(app, csrfProtection) {
  app.get('/webhook/', (req, res) => {
    if (req.query['hub.verify_token'] === (process.env.VERIFY_TOKEN || 'my_voice_is_my_password_verify_me')) {
      res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
  });
}

module.exports = botSetup;
