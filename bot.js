const request = require('request');

const FBUser = require('./models/fb-user');
const Place = require('./models/place');
const Suggestion = require('./models/suggestion');

var replyToTest = null;

function sendLabelTo(user) {
  var criteria = {
    language: "ne"
  };
  if (replyToTest) {
    criteria.test = true;
  }
  Place.find(criteria).limit(40).exec((err, places) => {
    if (err) {
      return console.log(err);
    }
    if (!places.length) {
      return sendReply(user.user_id, { text: 'no more places for you to translate :(' });
    }
    var selectPlace = places[Math.floor(places.length * Math.random())];

    user.lastPlace = [selectPlace.osm_place_id, selectPlace.language, selectPlace.name].join('___');
    user.save((err) => {
      if (err) {
        return console.log(err);
      }
      sendReply(user.user_id, { text: selectPlace.name });
    });
  });
}

function sendReply(sender, messageData) {
  if (replyToTest) {
    replyToTest.json({
      recipient: {
        id: sender
      },
      message: messageData
    });
  } else {
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
}

function sendLanguageChoiceMessage (sender, options) {
  var messageData = {
    attachment: {
      type: 'template',
      payload: {
        template_type: 'generic',
        elements: [{
          title: 'Which maps can you translate?',
          buttons: [{
            type: 'postback',
            title: 'English -to-> नेपाली',
            payload: 'rw:en:ne'
          },
          {
            type: 'postback',
            title: '日本語 -to-> English',
            payload: 'rw:ja:en'
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
  sendReply(sender, messageData);
}

function botSetup(app, middleware) {
  app.get('/webhook/', (req, res) => {
    if (req.query['hub.verify_token'] === (process.env.VERIFY_TOKEN || 'my_voice_is_my_password_verify_me')) {
      res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
  });

  app.post('/webhook', (req, res) => {
    if (req.body.test) {
      replyToTest = res;
    }
    var messaging_events = req.body.entry[0].messaging;
    for (var i = 0; i < messaging_events.length; i++) {
      var event = messaging_events[i];
      var sender = event.sender.id;
      FBUser.findOne({ user_id: sender }, (err, user) => {
        if (err) {
          return console.log('FBUser Mongo error: ' + JSON.stringify(err));
        }
        if (!user) {
          // first time seeing this user
          user = new FBUser({
            user_id: sender,
            blocked: false
          });
          user.save((err) => {
            if (err) {
              console.log('FBUser Mongo error: ' + JSON.stringify(err));
            }
            sendReply(sender, {
              text: 'Welcome to OSM City Namer, an unofficial crowd-mapping project! I send you names of places and you can translate them.'
            });
            if (!replyToTest) {
              sendLanguageChoiceMessage(sender, ['English', 'Nepali', 'Chinese']);
            }
          });
        } else if (event.postback) {
          var code = event.postback.payload.split(':');
          if (code.length === 3 && code[0] === 'rw') {
            if (user.readLanguages.indexOf(code[1]) === -1) {
              user.readLanguages.push(code[1]);
            }
            if (user.writeLanguages.indexOf(code[2]) === -1) {
              user.writeLanguages.push(code[2]);
            }
            user.save((err) => {
              if (err) {
                return console.log(err);
              }
              return sendLabelTo(user);
            });
          }
        } else if (event.message && event.message.text) {
          var text = event.message.text;
          if (user.lastPlace && !user.blocked) {
            var lastPlace = user.lastPlace.split('___');
            var p = new Suggestion({
              user_id: 'fb:' + user.user_id,
              osm_place_id: lastPlace[0],
              originalName: lastPlace[2],
              suggested: text.trim(),
              submitted: 0,
              targetLanguage: lastPlace[1],
              saved: new Date()
            });
            p.save((err) => {
              if (err) {
                return console.log(err);
              }
              if (user.name) {
                sendLabelTo(user);
              } else {
                user.lastPlace = '';
                user.name = 'set-me-plz';
                user.save((err) => {
                  if (err) {
                    return console.log(err);
                  }
                  sendReply(sender, {
                    text: 'Thanks! What name would you like to have on the leaderboard?'
                  });
                });
              }
            });
          } else if (user.name === 'set-me-plz') {
            // sets name for leaderboard
            user.name = text.trim();
            user.save((err) => {
              if (err) {
                return console.log(err);
              }
              sendLabelTo(user);
            });
          } else {
            sendReply(sender, {
              text: 'Text received, echo: ' + text.substring(0, 100)
            });
          }
        }
      });
    }
    if (!replyToTest) {
      res.sendStatus(200);
    }
  });
}

module.exports = botSetup;
