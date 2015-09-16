(function () {
  'use strict';

  angular.module('app.detail')
    .controller('DetailCtrl', ['$scope', 'MLRest', '$routeParams', function ($scope, mlRest, $routeParams) {
      var uri = $routeParams.uri;
      var model = {
        detail: {}
      };

      var options = { format: 'json' };

      if (uri.indexOf('/claim/') === 0 || uri.indexOf('/claims/') === 0) {
        options.transform = 'claim-json';
      } else if (uri.indexOf('/person/') === 0 || uri.indexOf('/persons/') === 0) {
        options.transform = 'person-json';
      }

      mlRest.getDocument(uri, options).then(function(response) {
        model.detail = response.data;
      });

      angular.extend($scope, {
        model: model
      });
    }]);
}());
