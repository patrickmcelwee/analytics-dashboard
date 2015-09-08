'use strict';

angular.module('app').controller('HomeCtrl', ['$scope', '$http', 'MLRest', 
  function($scope, $http, mlRest) {

  $scope.retrieveQueryOptions = function() {
    MarkLogic.Util.showLoader();
    mlRest.queryConfig().then(function(response) {
      MarkLogic.Util.hideLoader();
      $scope.options = response.data;
    });
  };

  $scope.retrieveClaims = function() {
    $http.get('/api/claims').then(function(response) {
      $scope.claims = response.data.claims;
    });
  };

  $scope.createChart = function() {
    var barData = { 
      labels : ['January', 'February', 'March', 'April', 'May', 'June'],
      datasets: [
        {
          label: '2014 claims #',
          fillColor: '#382765',
          data: [456,479,324,569,702,60]
        },
        {
          label: '2015 claims #',
          fillColor: '#7BC225',
          strokeColor : "#48A497",
          data: [364,504,605,400,345,320]
        }
      ]
    };

    var context = document.getElementById('claims').getContext('2d');
    var claimsChart = new Chart(context).Bar(barData);
  };

  $scope.createChart();

}]);
