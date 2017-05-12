$(function() {
  var map = L.map('pick-map').setView([0, 0], 4);
  map.attributionControl.setPrefix('');
  L.tileLayer('//tile-{s}.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
    maxZoom: 14,
  }).addTo(map);
  
  function lngCorrection(lng) {
    while (lng > 180) {
      lng -= 360;
    }
    while (lng < -180) {
      lng += 360;
    }
    return lng;
  }

  map.on('moveend', function() {
    var center = map.getCenter();
    var bounds = map.getBounds();
    $('#lat').val(center.lat.toFixed(6));
    $('#lng').val(lngCorrection(center.lng).toFixed(6));
    $('#north').val(bounds.getNorthEast().lat.toFixed(6));
    $('#south').val(bounds.getSouthWest().lat.toFixed(6));
    $('#east').val(lngCorrection(bounds.getNorthEast().lng).toFixed(6));
    $('#west').val(lngCorrection(bounds.getSouthWest().lng).toFixed(6));    
    $('#zoom').val(Math.round(map.getZoom()));
  });
});
