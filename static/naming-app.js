$(function() {
  // list of currently active map-points
  var markers = [];
  var placeIndex = 0;

  // list of already-solved OSM ids
  var solved = [];

  // order of importance for a place=___ tag (translate a country before a state before a city)
  var placeRelevance = ['hamlet', 'village', 'town', 'plot', 'city_block', 'neighborhood',
    'neighbourhood', 'quarter', 'island', 'suburb', 'borough', 'city', 'municipality', 'county',
    'district', 'province', 'region', 'state', 'country'];

  // language where labels are being added
  var altLangs = $.map(fromLanguages, function (altLang) {
    return 'tag[k="name:' + altLang + '"]';
  }).join(', ');

  // set up Leaflet map
  var map = L.map('map').setView(view.slice(0, 2), view[2]);
  map.attributionControl.setPrefix('');
  L.tileLayer('//tile-{s}.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
    maxZoom: 14,
  }).addTo(map);

  // Leaflet-Hash plugin
  if (L.Hash) {
    new L.Hash(map);
  }

  // reload place data after the map is moved by user
  /*
  var moveTimeout = null;
  map.on('dragend', function() {
    if (moveTimeout) {
      clearTimeout(moveTimeout);
    }
    moveTimeout = setTimeout(makeQuery, 1000);
  });
  */

  function makeQuery() {
    // makeQuery runs on startup and map dragend

    // prevent data entry during this map update
    $('input, button').not('.keep-on').prop('disabled', true);

    // remove markers from any previous queries
    $.map(markers, function(marker) {
      if (marker.circle) {
        map.removeLayer(marker.circle);
      }
    });
    markers = [];

    // read the boundary into the Overpass API template
    var bbox = map.getBounds();
    var customQuery = {
      north: bbox.getNorthEast().lat.toFixed(6),
      south: bbox.getSouthWest().lat.toFixed(6),
      east: bbox.getNorthEast().lng.toFixed(6),
      west: bbox.getSouthWest().lng.toFixed(6),
      fromLanguages: fromLanguages,
      targetLang: targetLang,
      _csrf: $('#csrf').val()
    };

    // POST to server, which makes actual API call
    $.post('/overpass', customQuery, function(data) {
      // response contains OSM XML place nodes
      var pts = $(data).find('node');

      // sort points by importance of place=___ tag
      pts.sort(function (a, b) {
        var aplace = $(a).find('tag[k="place"]').attr("v");
        var bplace = $(b).find('tag[k="place"]').attr("v");
        return placeRelevance.indexOf(bplace) - placeRelevance.indexOf(aplace);
      });

      $.each(pts, function (p, pt) {
        var pt = $(pt);

        var osm_place_id = pt.attr('id');
        if (solved.indexOf(osm_place_id) > -1) {
          // user already named this point
          return;
        }

        // return all tag key-value pairs for this point as a string
        var tags = $.map(pt.find('tag'), function(tag) {
          return $(tag);
        });
        var tagtext = $.map(tags, function(tag) {
          return tag.attr('k') + ': ' + tag.attr('v');
        }).join('<br/>');

        // add a circleMarker to represent the point
        pt.circle = L.circleMarker([ pt.attr('lat'), pt.attr('lon') ])
          .bindPopup(tagtext);
        pt.circle.addTo(map);
        markers.push(pt);
      });

      // initially focus on the most important place
      translatePlace(0);

      // forms are inactive until data finishes loading
      $('input, button').prop('disabled', false);
    });
  }

  setTimeout(makeQuery, 250);

  function translatePlace(i) {
    // called to populate the form with the i-th most important place

    // loop around if you have viewed all places
    if (i >= markers.length) {
      return translatePlace(0);
    }

    $.each(markers, function(p, pt) {
      if (!markers[p].circle) {
        return;
      }
      if (p === i) {
        // the target location
        markers[p].circle.setStyle({ fillOpacity: 0.7, fillColor: '#00f' });
      } else {
        markers[p].circle.setStyle({ fillOpacity: 0.7, fillColor: '#ccc' });
      }
    });

    var place = $(markers[i]);
    placeIndex = i;

    // load OSM id and label
    var osm_place_id = place.attr('id');
    var cityname = place.find('tag[k="name"]').attr('v');

    // search for names in alternate languages
    var altname = place.find(altLangs);
    if (altname.length) {
      altname = $(altname.get(0)).attr('v');
    } else {
      altname = '';
    }

    $('#osm_place_id').val(osm_place_id);
    $('#cityname').text(cityname)
    $('#altname').text(altname);
  }

  // advance to next place node (cycles at end)
  $('#skip').click(function() {
    translatePlace(placeIndex + 1);
  });

  // store proposed name and mark on map
  $('#suggest').click(function() {
    solved.push($('#osm_place_id').val());
    $('input, button').not('.keep-on').prop('disabled', true);
    $.post('/name', {
      _csrf: $('#csrf').val(),
      suggested: $('#usersname').val(),
      name: $('#cityname').text(),
      language: targetLang,
      osm_place_id: $('#osm_place_id').val()
    }, function (response) {
      console.log(response);
      markers[placeIndex].circle.setStyle({ fillOpacity: 1, fillColor: '#0f0' });
      markers[placeIndex].circle = null;
      $('input, button').prop('disabled', false);
      $('#usersname').val('');
      translatePlace(placeIndex + 1);
    });
  });

  // remove title bar
  $('#hider').click(function() {
    $('h3.centered, #hider').hide();
  });
});
