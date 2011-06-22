var url = require('url'),
    settings = require('./settings'),
    helpers = require('./helpers/helpers'),
    crypto = require('crypto'),
    redis = require('redis'),
    subscriptions = require('./subscriptions'),
    app = settings.app,
    geo = require('geo');

// Handshake to verify any new subscription requests.

app.get('/callbacks', function(request, response){
  helpers.instagram.subscriptions.handshake(request, response); 
});

// Receive authentication callbacks from Instagram

app.get('/callbacks/oauth', function(request, response){
  helpers.instagram.oauth.ask_for_access_token({
    request: request,
    response: response,
    redirect: '/callbacks/confirmed',
    complete: function(params){
      // Add this user to our local cache.
      // As this happens asyncronously, and instagram-node-lib has already
      // sent an empty 200 header, the homepage may not display this user
      // on first load, so we'll head over to a fake confirmation page instead
      var r = redis.createClient(settings.REDIS_PORT,settings.REDIS_HOST);
      r.hexists('authenticated_users', params['user'].username,function(error,code) {
        if(code=="0") {
          // Bit messy, but we need to access users by username and id
          // throughout the app, must be a better way to do this...
          r.hset('authenticated_users', params['user'].username, JSON.stringify(params));
          r.hset('authenticated_users_ids', params['user'].id, JSON.stringify(params));
        }
        r.quit();
      });
    }
  });
});

// Annoying, but required for now, will attempt to fork
// Instagram-node-lib to get around this

app.get('/callbacks/confirmed',function(request,response){
  response.render('confirmation');
})

// The POST callback for Instagram to call every time there's an update
// to one of our subscriptions.

app.post('/callbacks', function(request, response){

  // Verify the payload's integrity by making sure it's coming from a trusted source.
  var hmac = crypto.createHmac('sha1', settings.CLIENT_SECRET);
  hmac.update(request.rawBody);
  var providedSignature = request.headers['x-hub-signature'];
  var calculatedSignature = hmac.digest(encoding='hex');
  if((providedSignature != calculatedSignature) || !request.body) response.send('FAIL');
  
  // May need a timeout on this, the update can occasionally
  // come before the image is available to the static API
  helpers.processUpdates(request.body);
  
});

// Render user http requests

app.get('/', function(request, response) {
  
  channel = 'home'
  
  // URL to allow users to authenticate and add themselves to the app
  authorization_url = helpers.instagram.oauth.authorization_url({});
  
  // Pull a list of authenticated users from redis, render the homepage
  var r = redis.createClient(settings.REDIS_PORT,settings.REDIS_HOST);
  user_hash = r.hgetall('authenticated_users', function(error, user_hash){
    response.render('home', {locals: {authenticated_users:user_hash}});
  });
  r.quit();

});

// This follows the same format as socket requests
// but assumes :method to be 'subscribe'

app.get('/channel/:channel/:value', function(request, response){
  
  channel = request.params.channel;
  value = request.params.value;
  
  if(channel=='tags') {
    
    // Ensure we're subscribed to this tag then
    // load the latest photos from the static API
    helpers.verifySubscription('tags',value);
    helpers.instagram.tags.recent({ 
      name: value, 
      complete: function(data,pagination) {
        helpers.setMinID('channel:'+channel+':'+value, data, pagination.min_tag_id);
      	response.render('channels/tags', { locals: { media: data, tag: value } });
      },
      error: function(errorMessage, errorObject, caller) {
        console.log(errorMessage);
        response.render('channels/tags', { locals: { media: new Array(), tag: value } });
      }
    });
    
  } else if(channel=='users') {
    
    username = request.params.value
    
    // Display a list of this user's recent media, real-time updates will 
    // be handled by the generic subscription handler as these subscriptions
    // are not user specific
    var r = redis.createClient(settings.REDIS_PORT,settings.REDIS_HOST);
    r.hget('authenticated_users', username,function(error,user){
      if(error==null) {
        user_data = JSON.parse(user);
        helpers.instagram.users.recent({ 
          user_id: user_data.user.id, 
          access_token: user_data.access_token,
          complete: function(data,pagination) {
          	response.render('channels/users', { locals: { media: data, user: user_data.user } });
          },
          error: function(errorMessage, errorObject, caller) {
            console.log(errorMessage);
            response.render('channels/users', { locals: { media: new Array(), user: user_data.user } });        
          }
        });
      }
    });
    r.quit();
          
  } else if(channel=='locations') {
    
    location = request.params.value
    
    // Ensure we're subscribed to this location then
    // load the latest photos from the static API
    helpers.verifySubscription('locations',value);
    
    var r = redis.createClient(settings.REDIS_PORT,settings.REDIS_HOST);
    r.get('channel:locations:'+location+':subscriptions',function(error,location_data){
      loc_data = JSON.parse(location_data)
      helpers.instagram.locations.recent({ 
        location_id: location, 
        complete: function(data,pagination) {
          helpers.setMinID('channel:'+channel+':'+location, data, false);
        	response.render('channels/locations', { locals: { media: data, location: loc_data } });
        },
        error: function(errorMessage, errorObject, caller) {
          console.log(errorMessage);
          response.render('channels/locations', { locals: { media: new Array(), location: loc_data } });
        }
      });
    });
 
  } else if(channel=='geographies') {
    
    // This should be an instagram location id
    geography = request.params.value
    
    // Grab recent photos for this geography
    var r = redis.createClient(settings.REDIS_PORT,settings.REDIS_HOST);
    r.get('channel:geographies:'+geography+':subscriptions',function(error,geography_data){
      geography_data = JSON.parse(geography_data);
      helpers.instagram.geographies.recent({ 
        geography_id: geography,
        complete: function(data,pagination) {
          helpers.setMinID('channel:'+channel+':'+geography, data, false);
        	response.render('channels/geographies', { locals: { media: data, geography: geography_data } });
        },
        error: function(errorMessage, errorObject, caller) {
          response.render('channels/geographies', { locals: { media: new Array(), geography: geography_data } });
        }
      });
    });
    r.quit();

  } else {
    
    // Unrecognised channel
    response.render('error', { 
      locals: { error: 'Pardon?' } 
    });

  }
  
});

/*
  Very experimental, mashing streams
*/

app.get('/weather/:geography', function(request, response){
  
    // This should be an instagram location id
    geography = request.params.geography
    tag = request.params.tag
    channel = 'geography';
    
    // Grab recent photos for this geography
    var r = redis.createClient(settings.REDIS_PORT,settings.REDIS_HOST);
    r.get('channel:geographies:'+geography+':subscriptions',function(error,geography_data){
      geography_data = JSON.parse(geography_data);
      
      helpers.instagram.media.search({ 
        lat: geography_data.lat,
        lng: geography_data.lng,
        distance: geography_data.radius,
        count: 1000,
        complete: function(data,pagination) {
          helpers.setMinID('channel:'+channel+':'+geography, data, false);
        	response.render('channels/weather', { locals: { media: data, geography: geography_data } });
        },
        error: function(errorMessage, errorObject, caller) {
          response.render('channels/weather', { locals: { media: new Array(), geography: geography_data } });
        }
      });
      
    });
    r.quit();
    
});

// Location based requests are a little more complicated
// and generally need lat-lngs or search terms translated
// into either instagram 'locations' (based on 4sq) or 
// instagram 'geographies' (arbitrary areas) defined by lat-lng

app.post('/channel/:channel/', function(request,response) {
  
  channel = request.params.channel;
  
  if(channel=="geographies") {

    if(request.body.address) {
      geo.geocoder(geo.google, request.body.address, false, function(formattedAddress, lat, lng) {
        helpers.verifySubscription('geographies', {
          lat: lat,
          lng: lng,
          radius: request.body.radius,
          name: formattedAddress
        },
        function(error,data) {
          response.redirect('/channel/geographies/'+data.object_id)
        });
      });
    } else if (request.body.lat && request.body.lng && request.body.radius) {
      helpers.verifySubscription('geographies', {
        lat: request.body.lat,
        lng: request.body.lng,
        radius: request.body.radius,
        name: 'nearby',
      },
      function(error,data) {
        response.redirect('/channel/geographies/'+data.object_id)
      });
    } else {
      response.render('error', { 
        locals: { error: 'Pardon?' } 
      });
    }
    
  } else if (channel=="weather") {
    
    geo.geocoder(geo.google, request.body.address, false, function(formattedAddress, lat, lng) {
      helpers.verifySubscription('geographies', {
        lat: lat,
        lng: lng,
        radius: request.body.radius,
        name: formattedAddress
      },
      function(error,data) {
        response.redirect('/weather/'+data.object_id)
      });
    });
    
  } else {
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
  response.render('confirmation');
});

// Remove a user from our authenticated list

app.get('/user/delete/:username', function(request,response){
  var r = redis.createClient(settings.REDIS_PORT,settings.REDIS_HOST);
  r.hdel('authenticated_users', request.params.username);
  r.quit();
  response.render('confirmation');
});

app.listen(settings.appPort);