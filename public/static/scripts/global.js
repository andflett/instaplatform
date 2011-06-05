// All rather messy at the moment - needs some form of sensible
// front-end library...

// Open a socket
var socket = new io.Socket();
socket.connect();

// Init event listeners for any newMedia messages across the socket
var Media = {
  onNewMedia: function(ev) {
    $(ev.media).each(function(index, media){
      $('.append-live-data[data-subscription="'+ev.channel+'"]').prepend('<li><img src="'+media.images.standard_resolution.url+'" /></li>');
      $('.replace-live-data[data-subscription="'+ev.channel+'"]').html('<img src="'+media.images.thumbnail.url+'" />');
    });
  }
};
$(document).bind("newMedia", Media.onNewMedia)

// Parse new messages, fire events
socket.on('message', function(update){
	var data = $.parseJSON(update);
	$(document).trigger(data);
});

// If this is a specific cause page, subscribe user to requested channel
socket.on('connect', function(){
  path = window.location.pathname.split('/');
  if(path[1]=='channel') {
    socket.send(path[2]+':subscribe:'+path[3]);
  } 
});

// Init event listeners for any searchResults messages across the socket
var Search = {
  onSearchResults: function(ev) {
    
    if(ev.results != undefined && ev.results.length > 0) {
      $('#search').append('<ul id="results"></ul>');
      $(ev.results).each(function(index, tag){
        $('#results').append('<li><a href="/channel/tags/'+tag.name+'">#'+tag.name+' ('+tag.media_count+' contributions)</a></li>');
      });
    }
    
    if(ev.message != undefined || ev.results.length == 0) {
      $('#search').append('<p class="error">Could not find any causes matching that term on Instagr.am</p>')
    }
    
  }
};
$(document).bind("searchResults", Search.onSearchResults);

$(document).ready(function(){
  
  // Subscribe to any other channels requested in the mark-up
  $('.replace-live-data').each(function() {
    socket.send('tags:subscribe:'+$(this).attr('data-subscription'));
  })

  // Socketify the tag search
  $('#tag_search').submit(function(event) {
    $('#search .error').remove();
    $('#results').remove();
    socket.send('tags:search:'+$('#cause').val());
    return false;
  });

});

