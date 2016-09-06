$(function() {
  var map = L.map('pick-map').setView([0, 0], 4);
  map.attributionControl.setPrefix('');
  L.tileLayer('//tile-{s}.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
    maxZoom: 14,
  }).addTo(map);

  map.on('moveend', function() {
    $('#lat').val(map.getCenter().lat);
    $('#lng').val(map.getCenter().lng);
    $('#zoom').val(map.getZoom());
  });
});
