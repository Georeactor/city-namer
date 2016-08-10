$(function() {
  var map = L.map('map').setView([25.238, 55.275], 12);
  map.attributionControl.setPrefix('');

  var pts = [];
  var markers = [];
  var placeIndex = 0;

  L.tileLayer('//tile-{s}.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
    maxZoom: 14,
  }).addTo(map);

  var query =
    "node \
      [place] \
      [name] \
      ['name:en'!~'.'] \
      (SOUTH,WEST,NORTH,EAST); \
    (._;>;); \
    out;";

  var placeRelevance = ['country', 'state', 'region', 'province', 'district', 'county', 'municipality', 'city', 'borough', 'suburb',
    'island', 'quarter', 'neighbourhood', 'city_block', 'plot', 'town', 'village', 'hamlet'];
  placeRelevance.reverse();

  function makeQuery() {
    $.map(markers, function(marker) {
      marker.setMap(null);
    });
    markers = [];

    var bbox = map.getBounds();
    var customQuery = query.replace("NORTH", bbox.getNorthEast().lat)
      .replace("SOUTH", bbox.getSouthWest().lat)
      .replace("EAST", bbox.getNorthEast().lng)
      .replace("WEST", bbox.getSouthWest().lng);
    $.get("/overpass?_csrf=" + $("#csrf").val() + "&query=" + customQuery, function(data) {
      pts = $(data).find('node');
      pts.sort(function (a, b) {
        var aplace = $(a).find('tag[k="place"]').attr("v");
        var bplace = $(b).find('tag[k="place"]').attr("v");
        return placeRelevance.indexOf(bplace) - placeRelevance.indexOf(aplace);
      });
      $.each(pts, function (p, pt) {
        var pt = $(pt);
        var tags = $.map(pt.find('tag'), function(tag) {
          return $(tag);
        });
        tags = $.map(tags, function(tag) {
          return tag.attr('k') + ': ' + tag.attr('v');
        }).join('<br/>');
        var marker = L.circleMarker([ pt.attr('lat'), pt.attr('lon') ])
          .bindPopup(tags);
        markers.push(marker);
        marker.addTo(map);
      });

      loadPlace(0);
    });
  }
  makeQuery();

  $("input, button").prop("disabled", false);

  function loadPlace(i) {
    if (i >= pts.length) {
      return loadPlace(0);
    }

    $.each(markers, function(m, marker) {
      if (m === i) {
        marker.setStyle({ fill: '#00f' });
      } else {
        marker.setStyle({ fill: '#ccc' });
      }
    });

    var place = $(pts[i]);
    placeIndex = i;
    var cityname = place.find('tag[k="name"]').attr("v");
    var altname = place.find('tag[k="name:fr"], tag[k="name:es"], tag[k="name:ar"]');
    if (altname.length) {
      altname = altname.get(0).attr("v");
    } else {
      altname = "";
    }
    $("#cityname").text(cityname)
    $("#altname").text(altname);
  }

  $("#skip").click(function() {
    loadPlace(placeIndex + 1);
  });
});
