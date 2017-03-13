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

// var urlDatabase = require('./data'); //mock json data
var urlDatabase = [];

client.authorize(
  fbToken,
  fbUserId,
  function() {
    client.getRecommendations(10, function(error, data) {
      urlDatabase = data.results;
    });
  }
);

app.set("view engine", "ejs");

app.use(express.static(__dirname + '/public'));

app.get("/", (req, res) => {
    let templateVars = { urls: urlDatabase };
    res.render("index", templateVars);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
