var express = require("express");
var app = express();
var PORT = process.env.PORT || 8080; // default port 8080
var bodyParser = require('body-parser');

//Tinder Client
var tinder = require('./tinder');
var client = new tinder.TinderClient();

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
                age: getAge(profile.birth_date),
                bio: profile.bio,
                photos: profile.photos,
                ping_time: getLastOnline(profile.ping_time),
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


function getAge(dob){
  let todaysDate = new Date();
  let profileDate = new Date(dob);
  var timeDiff = Math.abs(todaysDate.getTime() - profileDate.getTime());
  var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
  var diffYears = Math.floor(diffDays/365)
  return diffYears
}

function getLastOnline(time) {
  let result;
  let currentTime = new Date();
  let lastActivity = new Date(time);
  var timeDiff = Math.abs(currentTime.getTime() - lastActivity.getTime());
  var convertedTime = Math.floor(timeDiff/(1000 * 60 * 60));

  if (convertedTime > 24) {
    result = 'More than 24 hours ago.';
  } else if ( convertedTime <= 1) {
    result = 'Less than an hour ago.';
  } else {
    result = convertedTime + ' hours ago.'
  }
  return result;
}

function swipeAndRemove(array, property, value) {
  array.forEach(function(result, index) {
    if(result[property] === value) {
      //Remove from array
      array.splice(index, 1);
    }
  });
}

client.authorize( fbToken, fbUserId, function() {
  client.getAccount(function(err, data) {
    userProfile = data.user;
  });
});

if (recommendations != null) {
  getProfiles()
    .then(function(x) {
      recommendations = x;
    });
}

app.set("view engine", "ejs");

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({
  extended: true
}));

app.get("/", (req, res) => {

  console.log('number of profiles:',recommendations.length);

  if (sortedList.length === 0) {
    /// Checks for matches
    var counts = [];
    list.forEach(function(x) {
      counts[x.id] = (counts[x.id] || 0)+1;
    });

    var sortable = [];
    for (var x in counts) {
      sortable.push({
        'id' : x,
        'count' : counts[x]
      })
    };

    var topRec = sortable.filter(function(val) {
      return val.count >= 5;
    });

    console.log(topRec);

    var alreadyMatched = sortable.sort(function (a,b) {
      return b.count - a.count;
    });

    // console.log(alreadyMatched);

    for (var i = 0; i < alreadyMatched.length; i++) {
      recommendations.forEach(function(x) {

        if (alreadyMatched[i].id === x.id) {
          sortedList.push(x);
        };

      })
    }

    for (var p = 0; p < topRec.length; p++) {
      sortedList.forEach(function(n) {
        if (topRec[p].id === n.id) {
          n.likes_you = '*';
        }
      })
    }

  }

  let templateVars = {
    user: userProfile,
    profiles: sortedList
  };

  res.render("index", templateVars);
});

app.post('/pass', (req, res) => {
  var profileId = req.body.id;

  client.authorize( fbToken, fbUserId, function() {
    client.pass(profileId, function(err, data) {
      console.log(data.status);
      if (data.status === 200) {
        swipeAndRemove(sortedList, 'id', profileId);
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
        swipeAndRemove(sortedList, 'id', profileId);
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
    test: sortedList
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

  function geoCoord(address) {
    // return a Promise
    return new Promise(function(resolve,reject) {
      googleMapsClient.geocode( { 'address': address}, function(err, res) {
        if (!err) {
          resolve(res.json.results[0].geometry.location);
        } else {
          reject(err);
        }
      });
    });
  }

 geoCoord(city)
 .then(function(val) {
   console.log(val.lat, val.lng);
   client.authorize( fbToken, fbUserId, function() {
     client.updatePosition(val.lng, val.lat, function(err, data) {
       if (data !== null) {
         console.log(data);
         res.redirect('/');
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
