var redis = require('redis'),
    settings = require('./settings'),
    helpers = require('./helpers/helpers'),
    app = settings.app,
    subscriptionPattern = 'channel:*:*';

var io = require('socket.io').listen(app);
 
io.sockets.on('connection', function(socket){
 
  // Container for this user's subscriptions
  socket.subscriptions = new Array();

  socket.on('message', function(data) {

    // Make sure this is a valid request, if so, parse it
    // We expect it to look a little something like subscribe:tags:nofilter

    if(data.split(':').length==3) {

      // Parse message
      message = data.split(':');
      channel = message[0];
      method = message[1];
      value = message[2];

      if(method=='subscribe') {

        // Subscribe to a channel
        socket.subscriptions['channel:'+channel+':'+value] = true;

      } else if(method=='search') {

        // Tag Search
        var update = { 'type': 'searchResults' };
        helpers.instagram.tags.search({q:value,
          complete: function(data) {
            update.results = data;
            socket.send(JSON.stringify(update));
          },
          error: function(errorMessage) {
            update.message = errorMessage
            socket.send(JSON.stringify(update));
          }
        });

      }

    } else {
      socket.send('Pardon?');
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

    // Send out update to subscribers. Client is expected to listen for 'newMedia' event
    var update = { 'type': 'newMedia', 'media': data, 'channel': channel };
    for(id in io.sockets.sockets) {
      if(io.sockets.sockets[id].subscriptions[channel]) {
        io.sockets.sockets[id].send(JSON.stringify(update));
      }
    }

  }

});
