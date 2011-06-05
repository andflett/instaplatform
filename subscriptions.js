var redis = require('redis'),
    io = require('socket.io'),
    settings = require('./settings'),
    helpers = require('./helpers/helpers'),
    app = settings.app,
    subscriptionPattern = 'channel:*:*',
    socket = io.listen(app);

socket.on('connection', function(client){
  
  // Container for this user's subscriptions
  client.subscriptions = new Array();
  
  client.on('message', function(data) {
    
    // Make sure this is a valid request, if so, parse it
    // We expect it to look a little something like subscribe:tags:nofilter
    
    if(data.split(':').length==3) {

      // Parse message
      message = data.split(':');
      channel = message[0];
      method = message[1];
      value = message[2];
    
      if(method=='subscribe') {
        
        client.subscriptions['channel:'+channel+':'+value] = true;
        
      } else if(method=='search') {
        
        var update = { 'type': 'searchResults' };
        helpers.instagram.tags.search({q:value,
          complete: function(data) {
            update.results = data;
            client.send(JSON.stringify(update));
          },
          error: function(errorMessage) {
            update.message = errorMessage
            client.send(JSON.stringify(update));
          }
        });
        
      }
      
    } else {
      client.send('Pardon?');
    }

  });
});

// We use Redis's pattern subscribe command to listen for signals
// notifying us of new updates.
var r = redis.createClient(settings.REDIS_PORT,settings.REDIS_HOST);
r.psubscribe(subscriptionPattern);

r.on('pmessage', function(pattern, channel, message){

  // Every time we receive a message, we check to see if it matches
  // the subscription pattern. If it does, then go ahead and parse it.
  if(pattern == subscriptionPattern){

    var data = JSON.parse(message);
    console.log('New pictars: '+channel);

    // Send out update to subscribers
    var update = { 'type': 'newMedia', 'media': data, 'channel': channel };
    for(sessionId in socket.clients) {
      if(socket.clients[sessionId].subscriptions[channel]) {
        socket.clients[sessionId].send(JSON.stringify(update));
      }
    }

  }

});