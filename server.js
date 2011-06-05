var url = require('url'),
    settings = require('./settings'),
    helpers = require('./helpers/helpers'),
    crypto = require('crypto'),
    redis = require('redis'),
    subscriptions = require('./subscriptions'),
    app = settings.app;

// Handshake to verify any new subscription requests.

app.get('/callbacks', function(request, response){
  helpers.instagram.subscriptions.handshake(request, response); 
});

// Receive authentication callbacks from Instagram

app.get('/callbacks/oauth', function(request, response){
  Instagram.oauth.ask_for_access_token({
    request: request,
    response: response,
    redirect: '/channel/users/',
    complete: function(params){
      console.log(params);
      // add full token to redis for use on the homepage and user specific pages
      
      // params['access_token']
      // params['user']
    }
  });
});

// The POST callback for Instagram to call every time there's an update
// to one of our subscriptions.

app.post('/callbacks', function(request, response){

  // Verify the payload's integrity by making sure it's coming from a trusted source.
  var hmac = crypto.createHmac('sha1', settings.CLIENT_SECRET);
  hmac.update(request.rawBody);
  var providedSignature = request.headers['x-hub-signature'];
  var calculatedSignature = hmac.digest(encoding='hex');
  if((providedSignature != calculatedSignature) || !request.body) response.send('FAIL');
      
  // Go through and process each update. Note that every update doesn't
  // include the updated data - we use the data in the update to query
  // the Instagram API to get the data we want.
  var updates = request.body;  
  
  for(index in updates) {
    
    // Instagram seems to issue the update notification before the
    // media is actually available to the non-realtime API, so
    // we have a timeout before sending updates to the users
    
    var update = updates[index];
  	
    if(update['object'] == "tag") function process() { helpers.tags.processUpdate(update['object_id']); }
    if(update['object'] == "geography") function process() { helpers.geographies.processUpdate(update['object_id']); }
    if(update['object'] == "location") function process() { helpers.locations.processUpdate(update['object_id']); }
    if(update['object'] == "user") function process() { helpers.users.processUpdate(update['object_id']); }
    
    setTimeout(process,2000);
    
  }
  
});

// Render user http requests

app.get('/', function(request, response) {
  
  // List of authenticated users
  authorization_url = Instagram.oauth.authorization_url();
  // pull list of authenticated users from redis
  
  response.render('home');
});

// This follows the same format as socket requests
// but assumes :method to be 'subscribe'

app.get('/channel/:channel/:value', function(request, response){
  
  var channel = request.params.channel;
  var value = request.params.value;
  
  if(channel=='tags') {
    
    // Ensure we're subscribed to this tag then
    // load the latest photos from the static API
    helpers.tags.validateTagSubscription(value);
    helpers.instagram.tags.recent({ 
      name: value, 
      complete: function(data,pagination) {
        helpers.tags.setMaxTagID(value, pagination);
      	response.render('channels/tags', { locals: { media: data, tag: value } });
      },
      error: function(errorMessage, errorObject, caller) {
        response.render('error', { locals: { error: errorMessage } });
      }
    });
    
  } else if(channel=='users') {
    
   // pull access token for this user from redis and then:
   //Instagram.users.recent({ user_id: INT, access_token: TOKEN });
   // future updates will be handled by the generic subscription handler 
   // as user real-time subscriptions are not user specific
            
  } else if(channel=='locations') {
      
  } else if(channel=='geographies') {
  
  } else {
    
    // Unrecognised channel
    response.render('error', { 
      locals: { error: 'Pardon?' } 
    });
    
  }
  
});

/* 
  
  Demo/homepage utilities
  
*/

// Clear all subscriptions from redis and Instagram

app.get('/subscriptions/delete', function(request, response) {
  helpers.instagram.subscriptions.unsubscribe_all('all');
  var r = redis.createClient(settings.REDIS_PORT,settings.REDIS_HOST);
  r.flushdb();
  r.quit();
  response.send('OK');
});

// Remove a user from our authenticated list

app.get('/user/delete', function(request,reponse){
  //remove from redis, can't un-oauth at this time
});

app.listen(settings.appPort);