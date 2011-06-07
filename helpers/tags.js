var redis = require('redis'),
    helpers = require('./helpers'),
    settings = require('../settings');

// Check to see if we've already subscribed (locally check, no API call)
// This could fail, if, for some reason, Instagram close our subscription
// Should probably check occasionally, but not on every page load - don't
// want to hammer the API too hard.

function validateTagSubscription(tagName) {
  var r = redis.createClient(settings.REDIS_PORT, settings.REDIS_HOST);
  r.zscore('subscriptions', tagName, function(error, subscription) {
    // If not subscribed, subscribe
    if(subscription == null) {
      helpers.instagram.tags.subscribe({ 
        object_id: tagName, 
        complete: function(data) {
          // Grab the photo count for this subscription and store in a sorted list
          helpers.instagram.tags.info({
            name: tagName,
            complete: function(data){
              var r = redis.createClient(settings.REDIS_PORT,settings.REDIS_HOST);
              r.zadd('subscriptions', data.media_count, tagName);
              r.quit();
            }
          });
        }
      });
    }
  });
  r.quit();
}
exports.validateTagSubscription = validateTagSubscription;

// Each update that comes from Instagram merely tells us that there's new
// data to go fetch. The update does not include the data. So, we take the
// tag name from the update, and make the call to the API.

function processUpdate(tagName){
  
  channel = 'channel:tags:'+tagName;
  
  helpers.getMinID(channel, function(error, minID){
    if(error != null) minID = 0;
    helpers.instagram.tags.recent({ 
      name: tagName, 
      min_tag_id: minID,
      complete: function(data,pagination) {
        helpers.setMinID(channel, data, pagination.min_tag_id);
        var r = redis.createClient(settings.REDIS_PORT,settings.REDIS_HOST);
        r.publish(channel, JSON.stringify(data));
        r.quit();
      }
    });
  });
  
}
exports.processUpdate = processUpdate;
