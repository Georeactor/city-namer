$(function() {
  // list of currently active map-points
  var pts = [];
  var placeIndex = 0;

  // order of importance for a place=___ tag (translate a country before a state before a city)
  var placeRelevance = ['hamlet', 'village', 'town', 'plot', 'city_block', 'neighborhood',
    'neighbourhood', 'quarter', 'island', 'suburb', 'borough', 'city', 'municipality', 'county',
    'district', 'province', 'region', 'state', 'country'];

  // language where labels are being added
  var targetLang = 'en';
  var altLangs = $.map(['es', 'fr', 'ar'], function (altLang) {
    return 'tag[k="name:' + altLang + '"]';
  }).join(', ');

  // set up Leaflet map
  var map = L.map('map').setView([25.238, 55.275], 12);
  map.attributionControl.setPrefix('');
  L.tileLayer('//tile-{s}.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
    maxZoom: 14,
  }).addTo(map);

  // reload place data after the map is moved by user
  var moveTimeout = null;
  map.on('dragend', function() {
    if (moveTimeout) {
      clearTimeout(moveTimeout);
    }
    moveTimeout = setTimeout(makeQuery, 1000);
  });

  // template for OSM Overpass query
  var query =
    "node \
      [place] \
      [name] \
      ['name:TARGETLANG'!~'.'] \
      (SOUTH,WEST,NORTH,EAST); \
    (._;>;); \
    out;";

  function makeQuery() {
    // makeQuery runs on startup and map dragend

    // prevent data entry during this map update
    $('input, button').prop('disabled', true);

    // remove markers from any previous queries
    $.map(pts, function(pt) {
      if (pt.marker) {
        pt.marker.setMap(null);
      }
    });
    pts = [];

    // read the boundary into the Overpass API template
    var bbox = map.getBounds();
    var customQuery = query.replace('NORTH', bbox.getNorthEast().lat.toFixed(6))
      .replace('SOUTH', bbox.getSouthWest().lat.toFixed(6))
      .replace('EAST', bbox.getNorthEast().lng.toFixed(6))
      .replace('WEST', bbox.getSouthWest().lng.toFixed(6))
      .replace('TARGETLANG', targetLang);

    // POST to server, which makes actual API call
    $.post('/overpass', {
      _csrf: $('#csrf').val(),
      query: customQuery
    }, function(data) {
      // response contains OSM XML place nodes
      pts = $(data).find('node');

      // sort points by importance of place=___ tag
      pts.sort(function (a, b) {
        var aplace = $(a).find('tag[k="place"]').attr("v");
        var bplace = $(b).find('tag[k="place"]').attr("v");
        return placeRelevance.indexOf(bplace) - placeRelevance.indexOf(aplace);
      });

      $.each(pts, function (p, pt) {
        var pt = $(pt);

        // return all tag key-value pairs for this point as a string
        var tags = $.map(pt.find('tag'), function(tag) {
          return $(tag);
        });
        var tagtext = $.map(tags, function(tag) {
          return tag.attr('k') + ': ' + tag.attr('v');
        }).join('<br/>');

        // add a circleMarker to represent the point
        pts[p].marker = L.circleMarker([ pt.attr('lat'), pt.attr('lon') ])
          .bindPopup(tagtext);
        pts[p].marker.addTo(map);
      });

      // initially focus on the most important place
      translatePlace(0);

      // forms are inactive until data finishes loading
      $('input, button').prop('disabled', false);
    });
  }
  makeQuery();

  function translatePlace(i) {
    // called to populate the form with the i-th most important place

    // loop around if you have viewed all places
    if (i >= pts.length) {
      return loadPlace(0);
    }

    $.each(pts, function(p, pt) {
      if (p === i) {
        // the target location
        pts[p].marker.setStyle({ fill: '#00f' });
      } else {
        pts[p].marker.setStyle({ fill: '#ccc' });
      }
    });

    var place = $(pts[i]);
    placeIndex = i;
    var cityname = place.find('tag[k="name"]').attr('v');

    // search for names in alternate languages
    var altname = place.find(altLangs);
    if (altname.length) {
      altname = altname.get(0).attr('v');
    } else {
      altname = '';
    }

    $('#cityname').text(cityname)
    $('#altname').text(altname);
  }

  // advance to next place node (cycles at end)
  $('#skip').click(function(e) {
    e.preventDefault();
    translatePlace(placeIndex + 1);
    return false;
  });

  // remove title bar
  $('#hider').click(function() {
    $('h3.centered, #hider').hide();
  });
});
