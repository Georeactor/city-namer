$(function() {
  // get initial read and write language filters
  var readLanguages = $('#readLanguageVals').val();
  var writeLanguages = $('#writeLanguageVals').val();

  // if only one language is set, display that on the <select>
  if (readLanguages.length && readLanguages !== 'all' && readLanguages.indexOf(',') === -1) {
    console.log()
    $('#readLanguage').val(readLanguages);
  }
  if (writeLanguages.length && writeLanguages !== 'all' && writeLanguages.indexOf(',') === -1) {
    $('#writeLanguage').val(writeLanguages);
  }

  // reload page with any new filters
  $('#readLanguage').change(function() {
    window.location.href = '/projects?readLanguages=' + $('#readLanguage').val() + '&writeLanguages=' + writeLanguages;
  });
  $('#writeLanguage').change(function() {
    window.location.href = '/projects?readLanguages=' + readLanguages + '&writeLanguages=' + $('#writeLanguage').val();
  });
});
