var settings = require('../settings'),
    redis = require('redis'),
    settings = require('../settings'),
    tags = require('./tags'),
    geographies = require('./geographies'),
    locations = require('./locations'),
    users = require('./users');

// Channel helpers
exports.tags = tags;
exports.geographies = geographies;
exports.locations = locations;
exports.users = users;

// Updates router
function processUpdates(updates) {
  
  // Go through and process each update. Note that every update doesn't
  // include the updated data - we use the data in the update to query
  // the Instagram API to get the data we want.  
  for(index in updates) {
    
    var update = updates[index];

    // Two at the same time gets messy, channels are being mixed
    // Probably best to pass the entire update to the handler then
    // verify at the process level
    
    // or perhaps pass the 'updates' object and iterate through it
    // from a different function to avoid arrays being combined

    if(update['object'] == "tag") tags.processUpdate(update['object_id']);
    if(update['object'] == "geography") geographies.processUpdate(update['object_id']);
    if(update['object'] == "location") locations.processUpdate(update['object_id']);
    if(update['object'] == "user") users.processUpdate(update['object_id']);

  }
  
}
exports.processUpdates = processUpdates;

// Instagram node library
var instagram = require('instagram-node-lib');
instagram.set('client_id', settings.CLIENT_ID);
instagram.set('client_secret', settings.CLIENT_SECRET);
instagram.set('callback_url', settings.CALLBACK_URL);
instagram.set('redirect_uri', settings.REDIRECT_URL);
exports.instagram = instagram


/*
    In order to only ask for the most recent media, we store the MAXIMUM ID
    of the media for every channel we've fetched. This way, when we get an
    update, we simply provide a min_id parameter to the Instagram API that
    fetches all media that have been posted *since* the min_id.
    
    For some end points min_id is being depreciated, so we'll can optionally
    pass in the min_[channel]_id from the pagination data to be used instead
    of the last item in a sorted array.
    
*/

function getMinID(channel, callback){
	var r = redis.createClient(settings.REDIS_PORT, settings.REDIS_HOST);
	r.get(channel+':min-id', callback);
	r.quit();
}
exports.getMinID = getMinID;

function setMinID(channel, data, min_channel_id){
    
    var nextMinID;
    if (min_channel_id) {
      nextMinID = min_channel_id
    } else if(data.length!=0) { 
      var sorted = data.sort(function(a, b){
          return parseInt(b.id) - parseInt(a.id);
      });
      nextMinID = parseInt(sorted[0].id);
    } else {
      nextMinID = 0;
    }
    
    var r = redis.createClient(settings.REDIS_PORT, settings.REDIS_HOST);
    r.set(channel+':min-id', nextMinID);
    r.quit();
    
}
exports.setMinID = setMinID;