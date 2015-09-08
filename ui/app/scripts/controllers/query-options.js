'use strict';

angular.module('app').controller('QueryOptionsCtrl', ['$scope', '$http', 'User', 'MLRest', 
  function($scope, $http, user, mlRest) {

  $scope.user = user;

  // Retrieve query options when the user logs in
  $scope.$watch('user.authenticated', function() {
    if ($scope.user.authenticated) {
      $scope.retrieveQueryOptions();
      $scope.retrieveTransforms();
      //$scope.retrieveClaims();
    } else {
      $scope.options = [];
      $scope.transforms = [];
    }
  });

  // Retrieve a list of all the named query options
  $scope.retrieveQueryOptions = function() {
    MarkLogic.Util.showLoader();
    mlRest.queryConfig().then(function(response) {
      MarkLogic.Util.hideLoader();
      $scope.options = response.data;
    });
  };

  $scope.retrieveTransforms = function() {
    $http.get('/v1/config/transforms?format=json').then(function(response) {
      $scope.transforms = response.data.transforms.transform;
      console.log($scope.transforms);
    });
  };

  $scope.retrieveClaims = function() {
    $http.get('/api/claims').then(function(response) {
      $scope.claims = response.data.claims;
    });
  };

  $scope.deleteClaims = function() {
    $http.delete('/api/claim').then(function(response) {
      console.log(response);
    });
  };

}]);
