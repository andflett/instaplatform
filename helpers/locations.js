var redis = require('redis'),
    helpers = require('./helpers'),
    settings = require('../settings');

// Check to see if we've already subscribed (locally check, no API call)
// This could fail, if, for some reason, Instagram close our subscription
// Should probably check occasionally, but not on every page load - don't
// want to hammer the API too hard.

function validateLocationSubscription(location) {
  var r = redis.createClient(settings.REDIS_PORT, settings.REDIS_HOST);
  r.zscore('subscriptions', location, function(error, subscription) {
    // If not subscribed, subscribe
    if(subscription == null) {
      helpers.instagram.locations.subscribe({ 
        object_id: location, 
        complete: function(data) {
          // Grab the photo count for this subscription and store in a sorted list
          helpers.instagram.locations.info({
            name: location,
            complete: function(data){
              var r = redis.createClient(settings.REDIS_PORT,settings.REDIS_HOST);
              r.zadd('subscriptions', data.media_count, location);
              r.quit();
            }
          });
        }
      });
    }
  });
  r.quit();
}
exports.validateLocationSubscription = validateLocationSubscription;

// Each update that comes from Instagram merely tells us that there's new
// data to go fetch. The update does not include the data. So, we take the
// tag name from the update, and make the call to the API.

function processUpdate(location){
  getMaxLocationID(location, function(error, maxLocationID){
    helpers.instagram.locations.recent({ 
      name: location, 
      max_tag_id: maxLocationID,
      complete: function(data,pagination) {
        setMaxLocationID(location, pagination);
        var r = redis.createClient(settings.REDIS_PORT,settings.REDIS_HOST);
        r.publish('channel:locations:' + location, JSON.stringify(data));
        r.quit();
      }
    });
  });
}
exports.processUpdate = processUpdate;

// Setting and Getting for API-call pagination
// This is Location specific, the pagination objects
// seem to be inconsitant across subsciption channels

function getMaxLocationID(location, callback){
  var r = redis.createClient(settings.REDIS_PORT, settings.REDIS_HOST);
  r.get('max-tag-id:channel:' + location, callback);
  r.quit();
}
exports.getMaxLocationID = getMaxLocationID;

function setMaxLocationID(location, pagination){
  var r = redis.createClient(settings.REDIS_PORT, settings.REDIS_HOST);
  r.set('max-tag-id:channel:' + location, pagination.next_max_id);
  r.quit();
}
exports.setMaxLocationID = setMaxLocationID;