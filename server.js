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

// Mock data
// var tinderData = require('./data');
// var userProfile = tinderData.userProfile;
// var recommendations = tinderData.recommendations;

var userProfile = [];
var recommendations = [];
var alreadyMatched = [];

client.authorize(
  fbToken,
  fbUserId,
  function() {
    client.getRecommendations(10, function(err, data) {
      recommendations = data.results;
    });

    client.getAccount(function(err, data) {
      userProfile = data.user;
    });

    client.getHistory(function(err, data) {
       alreadyMatched = data.matches;
    });

  }
);

app.set("view engine", "ejs");

app.use(express.static(__dirname + '/public'));

app.get("/", (req, res) => {
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
    let templateVars = {
      user: userProfile,
      matches: alreadyMatched
    };
    res.render("matches", templateVars);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
