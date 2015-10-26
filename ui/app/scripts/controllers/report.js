'use strict';

angular.module('app').controller('ReportCtrl', ['$scope', '$location', '$rootScope', 'User', 'ReportService',
  function($scope, $location, $rootScope, user, ReportService) {

  $scope.user = user;
  $scope.report = {};
  $scope.report.privacy = 'public';

  $scope.setOption = function(option) {
    $scope.report.privacy = option;
  };

  $scope.isActive = function(option) {
    return option === $scope.report.privacy;
  };

  $scope.createReport = function() {
    if ($scope.newReportForm.$valid) {
      MarkLogic.Util.showLoader();

      ReportService.createReport($scope.report).then(function(response) {
        MarkLogic.Util.hideLoader();
        var uri = response.replace(/(.*\?uri=)/, '');
        $scope.report.uri = uri;

        $rootScope.$broadcast('ReportCreated', $scope.report);
        $location.path('/reportdash/' + encodeURIComponent(uri));
      });
    }
  };

}]);
