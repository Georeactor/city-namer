const request = require('request');
const cheerio = require('cheerio');

const FBUser = require('./models/fb-user');
const Suggestion = require('./models/suggestion');

/*
// activate test
sendLabelTo({
  readLanguages: ['en'],
  writeLanguages: ['ne']
});
*/

function sendLabelTo(user) {
  function sendPlaceName(placeName) {
    sendReply(user.user_id, { text: placeName });
  }

  function checkOverpass(north, south, east, west, targetLang) {
    var query =
      "node \
        [place] \
        [name] \
        ['name:TARGETLANG'!~'.'] \
        (SOUTH,WEST,NORTH,EAST); \
      (._;>;); \
      out;";
    query = query.replace('NORTH', north);
    query = query.replace('SOUTH', south);
    query = query.replace('EAST', east);
    query = query.replace('WEST', west);
    query = query.replace('TARGETLANG', targetLang);

    request('http://overpass-api.de/api/interpreter?data=' + query.replace(/\s+/g, ''), (err, resp, body) => {
      if (err) {
        return console.log('Overpass API error' + JSON.stringify(err));
      }

      var $ = cheerio.load(body);
      var pts = $('node');
      var pt = $(pts.get(Math.floor(Math.random() * pts.length)));
      var osm_place_id = pt.attr('id');
      var name = pt.find('tag[k="name"]').attr('v');

      user.lastPlace = [osm_place_id, targetLang, name].join('___');
      user.save((err) => {
        if (err) {
          return console.log(err);
        }
        sendPlaceName(name);
      });
    });
  }

  if (user.readLanguages.indexOf('en') > -1) {
    if (user.writeLanguages.indexOf('ne') > -1) {
      // translate English -> Nepali in KTM
      checkOverpass(27.7441, 27.6900, 85.3718, 85.2948, 'ne');
    } else if (user.writeLanguages.indexOf('zh') > -1) {
      // translate English -> Chinese in Boston
      checkOverpass(42.6244, 42.3235, -70.6840, -71.3912, 'zh');
    }
  } else if (user.readLanguages.indexOf('zh') > -1) {
    if (user.writeLanguages.indexOf('en') > -1) {
      // translate Chinese -> English in Beijing
      checkOverpass(40.1639, 39.7919, 116.7115, 116.1828, 'en');
    }
  } else if (user.readLanguages.indexOf('ja') > -1) {
    if (user.writeLanguages.indexOf('en') > -1) {
      // translate Japanese -> English in Tokyo
      checkOverpass(35.8076129, 35.642343, 139.8821983, 139.6135868, 'en');
    }
  } else if (user.readLanguages.indexOf('ne') > -1) {
    if (user.writeLanguages.indexOf('en') > -1) {
      // translate Nepali -> English in KTM
      checkOverpass(27.7441, 27.6900, 85.3718, 85.2948, 'en');
    }
  }
}

function sendReply(sender, messageData) {
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
            sendReply(sender, {
              text: 'Welcome to OSM City Namer, an unofficial mapping project! I send you names of places and you can translate them.'
            });
            sendLanguageChoiceMessage(sender, ['English', 'Nepali', 'Chinese']);
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
              sendLabelTo(user);
            });
          }
        } else if (event.message && event.message.text) {
          var text = event.message.text;
          if (user.lastPlace) {
            var lastPlace = user.lastPlace.split('___');
            var p = new Suggestion({
              user_id: 'fb:' + user.user_id,
              osm_place_id: user.lastPlace[0],
              originalName: user.lastPlace[2],
              suggested: text.trim(),
              targetLanguage: user.lastPlace[1],
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
    res.sendStatus(200);
  });
}

module.exports = botSetup;
