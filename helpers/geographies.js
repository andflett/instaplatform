var redis = require('redis'),
    helpers = require('./helpers'),
    settings = require('../settings');

// Each update that comes from Instagram merely tells us that there's new
// data to go fetch. The update does not include the data. So, we take the
// tag name from the update, and make the call to the API.

function processUpdate(geographyID){
  
  channel = 'channel:geographies:'+geographyID;
  
  helpers.getMinID(channel, function(error, minID){
    if(error != null) minID = 0;
    helpers.instagram.geographies.recent({ 
      geography_id: geographyID,
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


