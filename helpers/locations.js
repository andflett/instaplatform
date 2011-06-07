var redis = require('redis'),
    helpers = require('./helpers'),
    settings = require('../settings');

// Check to see if we've already subscribed (locally check, no API call)
// This could fail, if, for some reason, Instagram close our subscription
// Should probably check occasionally, but not on every page load - don't
// want to hammer the API too hard.

function validateSubscription(location) {
  var r = redis.createClient(settings.REDIS_PORT, settings.REDIS_HOST);
  r.zscore('subscriptions', location, function(error, subscription) {
    // If not subscribed, subscribe
    if(subscription == null) {
      helpers.instagram.locations.subscribe({ 
        object_id: location, 
        complete: function(data) {
          var r = redis.createClient(settings.REDIS_PORT,settings.REDIS_HOST);
          r.zadd('subscriptions', 0, data);
          r.quit();
        }
      });
    }
  });
  r.quit();
}
exports.validateSubscription = validateSubscription;

// Each update that comes from Instagram merely tells us that there's new
// data to go fetch. The update does not include the data. So, we take the
// tag name from the update, and make the call to the API.

function processUpdate(location){
  
  channel = 'channel:locations:'+location;
  
  helpers.getMinID(channel, function(error, minID){
    if(error != null) minID = 0;
    helpers.instagram.locations.recent({ 
      location_id: location, 
      min_id: minID,
      complete: function(data,pagination) {
        helpers.setMinID(channel, data, false);
        var r = redis.createClient(settings.REDIS_PORT,settings.REDIS_HOST);
        r.publish(channel, JSON.stringify(data));
        r.quit();
      }
    });
  });
  
}
exports.processUpdate = processUpdate;
