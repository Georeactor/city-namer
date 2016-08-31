$(function() {
  $('#osmcheck').click(function(e) {
    e.preventDefault();
    e.stopPropagation();

    window.location.href = '/auth/openstreetmap';

    return false;
  });
});
