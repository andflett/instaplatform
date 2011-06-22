/*

  All rather messy at the moment - needs some form of 
  sensible front-end library, or something...
  
*/

// Open a socket
var PUBSUB_SERVER = 'http://instaplatform.mxmdev.com'
var socket = io.connect(PUBSUB_SERVER);

// Init event listeners for any newMedia messages across the socket
var Media = {
  onNewMedia: function(ev) {
    $('.first').removeClass('first');
    $('#primary-content p.help').after('<ul class="append-live-data first" data-subscription="'+ev.channel+'"></ul>');
    $('.first').hide();
    $(ev.media).each(function(index, media){
      if($('#weather').length!=0) {
        show = new Array();
        for(i in media.tags) {
          if(weather_tags.indexOf(media.tags[i].toLowerCase())!=-1) show.push(' #'+media.tags[i])
        }
        
        if(media.caption!=null){
          for(j in weather_terms) {
            caption = media.caption.text.toLowerCase();
            if(caption.indexOf(weather_terms[j])!=-1) show.push(' '+weather_terms[j])
          }
        }
        
        if(show.length>0) {
          t = show.join(', ');
          var date = new Date();
          date.setTime( parseInt(media.created_time)*1000 );
          var formattedTime = date.toUTCString();
          $('.first[data-subscription="'+ev.channel+'"]').prepend('<li class="weather" id="media-'+media.id+'"><h3>'+t+' <span>(taken '+formattedTime+')</span></h3><a href="'+media.link+'"><img src="'+media.images.standard_resolution.url+'" /></a></li>');
        }
      } else {
        $('.first[data-subscription="'+ev.channel+'"]').prepend('<li id="media-'+media.id+'"><a href="'+media.link+'"><img src="'+media.images.standard_resolution.url+'" /></a></li>');
      }
    });
    $('.first').slideDown('slow');
  }
};
$(document).bind("newMedia", Media.onNewMedia)

// Parse new messages, fire events
socket.on('message', function(update){
	var data = $.parseJSON(update);
	$(document).trigger(data);
});

// If this is a  channel page, subscribe user to requested channel and value
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
      $('#results').append('<ul class="result-list list"></ul>');
      $(ev.results).each(function(index, tag){
        $('#results .result-list').append('<li><a href="/channel/tags/'+tag.name+'">#'+tag.name+' ('+tag.media_count+')</a></li>');
      });
    }
    if(ev.message != undefined || ev.results.length == 0) {
      $('#results').append('<p class="error">Could not find any tags matching that term.</p>')
    }
  }
};
$(document).bind("searchResults", Search.onSearchResults);

$(document).ready(function(){
  
  // Socketify the tag search
  $('#what form').submit(function(event) {
    $('#results').html('');
    socket.send('tags:search:'+$('#what form input[type="text"]').val());
    return false;
  });
  
  navigator.geolocation.getCurrentPosition(function(position) {
    $('#lat').val(position.coords.latitude);
    $('#lng').val(position.coords.longitude);
    $('#radius').val(position.coords.accuracy);
  });

});

