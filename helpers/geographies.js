var redis = require('redis'),
    helpers = require('./helpers'),
    settings = require('../settings');

// Check to see if we've already subscribed (locally check, no API call)
// This could fail, if, for some reason, Instagram close our subscription
// Should probably check occasionally, but not on every page load - don't
// want to hammer the API too hard.

function validateGeographySubscription(tagName) {
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
exports.validateGeographySubscription = validateGeographySubscription;

// Each update that comes from Instagram merely tells us that there's new
// data to go fetch. The update does not include the data. So, we take the
// tag name from the update, and make the call to the API.

function processUpdate(tagName){
  getMaxGeographyID(tagName, function(error, maxGeographyID){
    helpers.instagram.tags.recent({ 
      name: tagName, 
      max_tag_id: maxGeographyID,
      complete: function(data,pagination) {
        setMaxGeographyID(tagName, pagination);
        var r = redis.createClient(settings.REDIS_PORT,settings.REDIS_HOST);
        r.publish('channel:geographies:' + tagName, JSON.stringify(data));
        r.quit();
      }
    });
  });
}
exports.processUpdate = processUpdate;

// Setting and Getting for API-call pagination
// This is Geography specific, the pagination objects
// seem to be inconsitant across subsciption channels

function getMaxGeographyID(tagName, callback){
  var r = redis.createClient(settings.REDIS_PORT, settings.REDIS_HOST);
  r.get('max-tag-id:channel:' + tagName, callback);
  r.quit();
}
exports.getMaxGeographyID = getMaxGeographyID;

function setMaxGeographyID(tagName, pagination){
  var r = redis.createClient(settings.REDIS_PORT, settings.REDIS_HOST);
  r.set('max-tag-id:channel:' + tagName, pagination.next_max_id);
  r.quit();
}
exports.setMaxGeographyID = setMaxGeographyID;