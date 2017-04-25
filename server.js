var express = require("express");
var app = express();
var PORT = process.env.PORT || 8080; // default port 8080
var bodyParser = require('body-parser');

//Tinder Client
var tinder = require('./tinder');
var client = new tinder.TinderClient();

//Helpers
var helper = require('./helpers.js')

//Facebook Auth
var fbInfo = require('./fb_auth.js');
var fbUserId  = fbInfo.userId;
var fbToken = fbInfo.token;

//google map geocode
var geoKey = fbInfo.geoKey;
var googleMapsClient = require('@google/maps').createClient({
  key: geoKey
});

//Tinder Call
var userProfile;
var recommendations = [];
var list = [];
var sortedList = [];

function getProfiles() {
  return new Promise(function(resolve, reject) {
    let tempList = [];

    for (var i = 0; i < 5; i++) {
      client.authorize( fbToken, fbUserId, function() {
        client.getRecommendations(10, function(error, data){

          while (data.results === null) {
            console.log('data is null');
            continue;
          }

          let tinderProfiles = data.results;

          tinderProfiles.forEach(function(profile) {

            list.push({
              id: profile._id
            })

            var found = recommendations.some(function (el) {
              return el.id === profile._id;
            });

            if (!found) {
              tempList.push({
                name : profile.name,
                age: helper.getAge(profile.birth_date),
                bio: profile.bio,
                photos: profile.photos,
                ping_time: helper.getLastOnline(profile.ping_time),
                distance_mi: profile.distance_mi,
                id: profile._id,
                likes_you: ''
              });
            }

          })

        })
      })
    }
    resolve(tempList)
  })
};

function sortList(a,b) {
  if (a.likes_you < b.likes_you)
    return 1;
  if (a.likes_you > b.likes_you)
    return -1;
  return 0;
}

//loads inital profiles on log in
if (recommendations.length === 0) {
  getProfiles()
    .then(function(x) {
      recommendations = x;
      console.log('inital getProfiles running');
    })
}

//Loads user info for header
client.authorize( fbToken, fbUserId, function() {
  client.getAccount(function(err, data) {
    userProfile = data.user;
  });
});

app.set("view engine", "ejs");

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({
  extended: true
}));

app.get("/", (req, res) => {

  console.log('number of profiles:',recommendations.length);

  if (recommendations.length !== 0) {

    //counts how many times each id shows up in list array
    var counts = [];
    list.forEach(function(x) {
      counts[x.id] = (counts[x.id] || 0)+1;
    });

    //stores the id and count in a new array
    var sortable = [];
    for (var x in counts) {
      sortable.push({
        'id' : x,
        'count' : counts[x]
      })
    };

    //stores ids that show up 5 times
    var topRec = sortable.filter(function(val) {
      return val.count === 5;
    });

    console.log(topRec);

    recommendations.forEach(function(recProfile) {
      for (var n = 0; n < topRec.length; n++) {

        if (topRec[n].id === recProfile.id) {
          recProfile.likes_you = "*"
        }
      }
    })

  }

  let templateVars = {
    user: userProfile,
    profiles: recommendations.sort(sortList)
  };

  res.render("index", templateVars);
});

app.post('/pass', (req, res) => {
  var profileId = req.body.id;

  client.authorize( fbToken, fbUserId, function() {
    client.pass(profileId, function(err, data) {
      console.log(data.status);
      if (data.status === 200) {
        helper.swipeAndRemove(recommendations, 'id', profileId);
        console.log('passed:', profileId);
        res.redirect('/');
      }
    })
  });
});

app.post('/like', (req, res) => {
  var profileId = req.body.id;

  client.authorize( fbToken, fbUserId, function() {
    client.like(profileId, function(err, data) {
      // console.log(data);
      if (data) {
        helper.swipeAndRemove(recommendations, 'id', profileId);
        console.log('liked:', profileId);
        res.redirect('/');
      };
    });
  });
});

app.get("/show/:id", (req, res) => {
  let templateVars = {
    user: userProfile,
    pos: req.params.id,
    test: recommendations
  };
  res.render("show", templateVars);
});

app.get("/settings", (req, res) => {
  let templateVars = {
    user: userProfile
  };
  res.render("settings", templateVars);
});

app.post("/location", (req, res) => {
  //hook up to google maps geocoding API
  var city = req.body.city;

 helper.geoCoord(city)
 .then(function(val) {
   console.log(val.lat, val.lng);
   client.authorize( fbToken, fbUserId, function() {
     client.updatePosition(val.lng, val.lat, function(err, data) {
       if (data !== null) {
         console.log(data);
         getProfiles()
           .then(function(x) {
             recommendations = x;
             console.log('ran again');
           });
        setTimeout(function() {
          res.redirect('/');
        }, 3000)
       } else {
         console.log('ERROR:', err.status);
       }
     });
   });
 });
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
