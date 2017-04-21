var fbInfo = require('./fb_auth.js');


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

//google map geocode
var geoKey = fbInfo.geoKey;
var googleMapsClient = require('@google/maps').createClient({
  key: geoKey
});

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

module.exports = { getAge, getLastOnline, swipeAndRemove, geoCoord};
