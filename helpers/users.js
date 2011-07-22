var redis = require('redis'),
    helpers = require('./helpers'),
    settings = require('../settings');

// Each update that comes from Instagram merely tells us that there's new
// data to go fetch. The update does not include the data. So, we take the
// tag name from the update, and make the call to the API.

function processUpdate(userId){
  
  // Only render the most recent image, assuming that the
  // user hasn't managed to post more than one in the time
  // it's taken us to process the update
  
  var r = redis.createClient(settings.REDIS_PORT,settings.REDIS_HOST);
  r.hget('authenticated_users_ids', userId, function(error,user){
    if(error == null) { 
      user_data = JSON.parse(user);
      helpers.instagram.users.recent({ 
        user_id: user_data.user.id, 
        access_token: user_data.access_token,
        count: 1,
        complete: function(data,pagination) {
          for(i in settings.groups) {
            if(settings.groups[i][user_data.user.username]!=undefined){
              r.publish('channel:groups:' + settings.groups[i], JSON.stringify(data));
            }
          }
          r.publish('channel:users:' + user_data.user.username, JSON.stringify(data));
        },
        error: function(errorMessage, errorObject, caller) {
          response.render('error', { locals: { error: errorMessage } });
        }
      });
    }
  });
  r.quit();
  
}
exports.processUpdate = processUpdate;