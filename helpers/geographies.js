var redis = require('redis'),
    helpers = require('./helpers'),
    settings = require('../settings');

// Each update that comes from Instagram merely tells us that there's new
// data to go fetch. The update does not include the data. So, we take the
// tag name from the update, and make the call to the API.

function processUpdate(geographyID){
    helpers.instagram.geographies.recent({ 
      geography_id: geographyID,
      count: 1,
      complete: function(data,pagination) {
        var r = redis.createClient(settings.REDIS_PORT,settings.REDIS_HOST);
        r.publish('channel:geographies:' + geographyID, JSON.stringify(data));
        r.quit();
      }
    });
}
exports.processUpdate = processUpdate;
