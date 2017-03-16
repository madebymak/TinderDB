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
var matches = [];

client.authorize(
  fbToken,
  fbUserId,
  function() {

    //calls tinder API 3 times for profiles
    for (var i = 0; i < 3; i++) {
      client.getRecommendations(10, function(err, data) {
        recommendations = data.results;
        var f = data.results;
        for (var j = 0; j < f.length; j++) {
          list.push(f[j]);
        }
      });
    }

    // client.getRecommendations(10, function(err, data) {
    //   recommendations = data.results;
    // });

    client.getAccount(function(err, data) {
      userProfile = data.user;
    });
  }
);

app.set("view engine", "ejs");

app.use(express.static(__dirname + '/public'));

app.get("/", (req, res) => {
  console.log('rec length:',list.length);
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

app.get("/matches", (req, res) => {

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
        matches.push(x);
      };
    })
  }

    let templateVars = {
      user: userProfile,
      matches: matches
    };
    res.render("matches", templateVars);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
