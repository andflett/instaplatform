var settings = require('../settings'),
    redis = require('redis'),
    settings = require('../settings');

// Channel helpers
exports.tags = require('./tags'),
exports.geographies = require('./geographies'),
exports.locations = require('./locations'),
exports.users = require('./users');

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