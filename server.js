var express = require("express");
var app = express();
var PORT = process.env.PORT || 8080; // default port 8080

//Tinder Client
var tinder = require('./tinder');
var client = new tinder.TinderClient();

//Facebook Auth
var fbInfo = require('./fb_auth.js');
var fbUserId  = fbInfo.userId;
var fbToken = fbInfo.token;

// // Mock data
// var tinderData = require('./data');
// var userProfile = tinderData.userProfile;
// var tinderProfile =tinderData.recommendations;


//Tinder Call
var userProfile = [];
var recommendations = [];
var list = [];
var alreadySwipedRight = [];

client.authorize(
  fbToken,
  fbUserId,
  function() {

    //calls tinder API 3 times for profiles
    for (var i = 0; i < 3; i++) {
      client.getRecommendations(10, function(err, data) {
        var tinderResults = data.results;
        for (var j = 0; j < tinderResults.length; j++) {
          list.push({
            name : tinderResults[j].name,
            age: getAge(tinderResults[j].birth_date),
            bio: tinderResults[j].bio,
            photos: tinderResults[j].photos,
            ping_time: tinderResults[j].ping_time,
            distance_mi: tinderResults[j].distance_mi,
            id: tinderResults[j]._id,
          });

          //Checks to see if profile id already exists before pushing
          var found = recommendations.some(function (el) {
            return el.id === tinderResults[j]._id;
          });

          if (!found) {
            recommendations.push({
              name : tinderResults[j].name,
              age: getAge(tinderResults[j].birth_date),
              bio: tinderResults[j].bio,
              photos: tinderResults[j].photos,
              ping_time: tinderResults[j].ping_time,
              distance_mi: tinderResults[j].distance_mi,
              id: tinderResults[j]._id,
            });
          }
        }
      });
    };

    // client.getRecommendations(10, function(err, data) {
    //   recommendations = data.results;
    // });

    client.getAccount(function(err, data) {
      userProfile = data.user;
    });
  }
);

function getAge(dob){
  let todaysDate = new Date();
  let profileDate = new Date(dob);
  var timeDiff = Math.abs(todaysDate.getTime() - profileDate.getTime());
  var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
  var diffYears = Math.floor(diffDays/365)
  return diffYears
}

app.set("view engine", "ejs");

app.use(express.static(__dirname + '/public'));

app.get("/", (req, res) => {
  console.log('number of profiles:',recommendations.length);
  let templateVars = {
    user: userProfile,
    profiles: recommendations
  };

  res.render("index", templateVars);
});

app.get("/show/:id", (req, res) => {
  let templateVars = {
    pos: req.params.id,
    test: recommendations
  };
  res.render("show", templateVars);
});

app.get("/already", (req, res) => {

  if (alreadySwipedRight.length === 0) {
    /// Checks for matches
    var counts = [];
    list.forEach(function(x) {
      counts[x.name] = (counts[x.name] || 0)+1;
    });

    var sortable = [];
    for (var x in counts) {
      sortable.push({
        'name' : x,
        'count' : counts[x]
      })
    };

    var alreadyMatched = sortable.filter(function(val) {
      return val.count >= 3;
    });

    for (var i = 0; i < alreadyMatched.length; i++) {
      recommendations.forEach(function(x){
        if (alreadyMatched[i].name === x.name) {
          alreadySwipedRight.push(x);
        };
      })
    }
  }

    let templateVars = {
      user: userProfile,
      matches: alreadySwipedRight
    };
    res.render("already", templateVars);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
