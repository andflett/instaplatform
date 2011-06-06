/* 

  A fairly simple library to deal with location and 'place' 
  based user interfaces. Intended to be used with Insta.Platform.
  
*/

function locationUI(panel,latitude,longitude,place_id) {
    
    // Private
    var locationInterface = this
    
    // Public
    this.panel = panel;
    this.uid = 'event';
    this.latitude = latitude;
    this.longitude = longitude;
    this.address = false;
    this.accuracy = false;
    this.place_name = false;
    this.place_address = false;
    this.place_id = place_id;
    this.placeInterface = false;
    this.map = false;
    this.places = false;
    this.marker = false;
    this.zoom = 14;
    
    // Build interface
    this.panel.append('<div class="place-interface"></div>');
    this.placeInterface = this.panel.find('.place-interface');
    
    this.placeInterface.append('<div class="post_location_map" id="map-'+this.uid+'" style="height: 345px; width: 280px;"><p class="loading">Loading map...</p></div>');
    this.map = this.placeInterface.find('.post_location_map');
    
    this.placeInterface.append('<div class="post_location_place"></div>');
    this.places = this.placeInterface.find('.post_location_place');
    
    // Interface type
    if(!longitude || !latitude) {
        this.geolocate();
    } else {
        this.createMap(); 
    }
    
}

locationUI.prototype.geolocate = function() {
   
    // Private
    var locationInterface = this
    var errorNotice = '<p class="notice">Drop the marker near your event and we\'ll suggest some places.</p>';
    
    // User's location
    navigator.geolocation.getCurrentPosition(function(position) {
        
        // Geolocate
        locationInterface.latitude = position.coords.latitude;
        locationInterface.longitude = position.coords.longitude;
        locationInterface.accuracy = position.coords.accuracy;

        // Probably needs tweaked - only show places if geolocation accuracy is high enough
        if(locationInterface.accuracy>1000) {
            locationInterface.places.append(errorNotice);
        } else {
            locationInterface.getPlaces(errorNotice);
        }
        
        // Show the map
        locationInterface.mapLocation(true);
        
    },function(e){
		locationInterface.zoom = 4;
		locationInterface.latitude = 51.5;
        locationInterface.longitude = -0.116667;
		locationInterface.mapLocation(true);
        locationInterface.places.append(errorNotice);
    });
    
}

locationUI.prototype.createMap = function () {
    this.mapLocation(true);
	this.getPlaces(false);
}

locationUI.prototype.getPlaces = function(errorNotice) {
    
    // Private
    var locationInterface = this

    // Load places
    $.ajax({
		url: '/events/location/', 
		type: 'GET', 
		data: 'latitude='+this.latitude+'&longitude='+this.longitude,
		dataType: 'json',
		beforeSend: function(xhr, settings) {
		    locationInterface.places.find('.notice').remove();
		    locationInterface.places.find('.location-places').remove();
			locationInterface.places.append('<p class="loading">Loading nearby places...</p>');
		},
		complete: function(status) {
		    locationInterface.places.find('.loading').remove(); 
		},
		success: function(data, status, xhr) {
		    if(data.response.groups.length>0) {
    		    places = data.response.groups[0].items;
    		    placeSelector = $('<ol class="location-places"></ol>');
                for (var i=0;i<places.length;i++) {
	
					full_address = Array();
                    if(places[i].location.address) full_address.push(places[i].location.address);
					if(places[i].location.crossStreet) full_address.push(places[i].location.crossStreet);
                  	if(places[i].location.city) full_address.push(places[i].location.city);
                    if(places[i].location.state) full_address.push(places[i].location.state);
					address = full_address.join(', ');
    		        
					place = $('<li data-latitude="'+places[i].location.lat+'" data-name="'+places[i].name+'" data-address="'+address+'" data-longitude="'+places[i].location.lng+'" data-id="'+places[i].id+'">'+places[i].name+'</li>');
    		        if(locationInterface.place_id == places[i].id) place.addClass('active');

					place.click(function(){
    		            locationInterface.latitude = $(this).attr('data-latitude');
    	                locationInterface.longitude = $(this).attr('data-longitude');
    	                locationInterface.place_id = $(this).attr('data-id');
    	                locationInterface.place_name = $(this).attr('data-name');
						locationInterface.place_address = $(this).attr('data-address');
						$(this).siblings().removeClass('active');
						$(this).addClass('active');
                        locationInterface.updateLocation(true);
                    }); 

                    placeSelector.append(place);
    	        }
				if(locationInterface.places.find('.places-title').length==0) locationInterface.places.append('<h2 class="places-title">Places nearby</h2>');
    	        locationInterface.places.append(placeSelector);
    	    } else {
    	        locationInterface.places.append(errorNotice);
    	    }
		},
		error: function(status) {
		    if(errorNotice) locationInterface.places.append(errorNotice);
		}
	});
    
}

locationUI.prototype.updateLocation = function(map) {
	$('#post_place_name').parent().addClass('active');
    $('#event_venue').val(this.place_name);
	$('#event_address').val(this.place_address)
    $('#event_lat').val(this.latitude);
    $('#event_long').val(this.longitude);
    $('#event_venue_id').val(this.place_id);
    if(map) {
        this.marker.setPosition(new google.maps.LatLng(this.latitude,this.longitude));
        this.map.setCenter(new google.maps.LatLng(this.latitude,this.longitude));
    }
}

locationUI.prototype.geocode = function() {
    
    // Private
    var locationInterface = this
    
    // Find an address
    geocoder = new google.maps.Geocoder();
    latlng = new google.maps.LatLng(this.latitude,this.longitude);
    geocoder.geocode({'latLng': latlng}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        if (results[1]) {
            locationInterface.place_name = results[1].formatted_address;
            locationInterface.places.find('.location-string').html(results[1].formatted_address);
        }
      } else {
        locationInterface.place_name = '';
        locationInterface.places.find('.location-string').html('Sorry...  no idea where this is: '+locationInterface.latitude+',<br />'+locationInterface.longitude);
      }
      locationInterface.place_id = false;
      locationInterface.updateLocation(false);
    });
      
}

locationUI.prototype.mapLocation = function(editable) {
	
    // Private
    var locationInterface = this
    
    // Set up map options
	latlng = new google.maps.LatLng(this.latitude,this.longitude);
	infowindow = new google.maps.InfoWindow();
	geocoder = new google.maps.Geocoder();
	myOptions = {
			backgroundColor: '#ffffff',
			streetViewControl: true,
			zoom: this.zoom,
			center: latlng,
			disableDefaultUI: true,
			zoomControl: true,
			maxZoom: 14,
			zoomControlOptions: {
			style: google.maps.ZoomControlStyle.SMALL
		},
		mapTypeId: google.maps.MapTypeId.ROADMAP
	};
	
	// Render map
	this.map = new google.maps.Map(document.getElementById("map-"+this.uid), myOptions);
	map = this.map;

	// Pop a marker on current location
	this.marker = new google.maps.Marker({
		position: latlng, 
		map: map,
		draggable: editable
	});
	
	// Set the zoom level based on accuracy
	if(this.accuracy) {
	    deg_offset = (this.accuracy / 1852 / 60);
	    bounds = new google.maps.LatLngBounds(
	        new google.maps.LatLng(this.latitude - deg_offset, this.longitude - deg_offset), 
	        new google.maps.LatLng(this.latitude + deg_offset, this.longitude + deg_offset)
        );
        map.fitBounds(bounds);
    }
    
    // Allow the user to set their location
	if(editable) {
	    google.maps.event.addListener(this.marker, 'dragend', function(ev) {
	        locationInterface.latitude = ev.latLng.lat();
	        locationInterface.longitude = ev.latLng.lng();
	        locationInterface.getPlaces();
        });
	}

}