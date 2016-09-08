const request = require('request');

const FBUser = require('./models/fb-user');
const Place = require('./models/place');

function sendTextMessage(sender, messageData) {
  if (messageData.length) {
    messageData = {
      text: messageData
    };
  }
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

function sendLanguageChoiceMessage (sender, options) {
  var messageData = {
    attachment: {
      type: 'template',
      payload: {
        template_type: 'generic',
        elements: [{
          title: 'Which map can you translate?',
          buttons: [{
            type: 'postback',
            title: 'English -to-> नेपाली',
            payload: 'rw:en:ne'
          },
          {
            type: 'postback',
            title: 'English -to-> 中文',
            payload: 'rw:en:zh'
          },
          {
            type: 'postback',
            title: '中文 -to-> English',
            payload: 'rw:zh:en'
          }]
        }]
      }
    }
  };
  sendTextMessage(sender, messageData);
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
      FBUser.findOne({ user_id: sender }, (err, user) => {
        if (err) {
          return console.log('FBUser Mongo error: ' + JSON.stringify(err));
        }
        if (!user) {
          // first time seeing this user
          user = new FBUser({
            user_id: sender
          });
          user.save((err) => {
            console.log('FBUser Mongo error: ' + JSON.stringify(err));
            sendTextMessage(sender, 'Welcome to OSM City Namer, an unofficial mapping project! I send you names of places and you can translate them.')
            sendLanguageChoiceMessage(sender, ['English', 'Nepali', 'Chinese']);
          });
        } else if (event.message && event.message.text) {
          var text = event.message.text;
          sendTextMessage(sender, 'Text received, echo: ' + text.substring(0, 100));
        }
      });
    }
    res.sendStatus(200);
  });
}

module.exports = botSetup;
