const request = require('request');

const Place = require('./models/place');

function sendTextMessage(sender, text) {
  var messageData = {
    text: text
  };
  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {
      access_token: process.env.PAGE_TOKEN
    },
    method: 'POST',
    json: {
      recipient: {
        id: sender
      },
      message: messageData
    }
  }, (error, response, body) => {
    if (error) {
      console.log('Error sending messages: ', error);
    } else if (response.body.error) {
      console.log('Error: ', response.body.error);
    }
  });
}

function botSetup(app, csrfProtection) {
  app.get('/webhook/', (req, res) => {
    if (req.query['hub.verify_token'] === (process.env.VERIFY_TOKEN || 'my_voice_is_my_password_verify_me')) {
      res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
  });

  app.post('/webhook', (req, res) => {
    var messaging_events = req.body.entry[0].messaging;
    for (var i = 0; i < messaging_events.length; i++) {
      var event = req.body.entry[0].messaging[i];
      var sender = event.sender.id;
      if (event.message && event.message.text) {
        var text = event.message.text;
        sendTextMessage(sender, 'Text received, echo: ' + text.substring(0, 100));
      }
    }
    res.sendStatus(200);
  });
}

module.exports = botSetup;
