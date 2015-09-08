'use strict';

angular.module('app').controller('SidebarCtrl', ['$scope', '$location', 'User', 'ReportService', 'WidgetDefinitions',
  function($scope, $location, user, ReportService, WidgetDefinitions) {

  setupWizard();

  $scope.user = user;
  $scope.search = {};
  $scope.showLoading = false;
  $scope.widgetDefs = WidgetDefinitions;
  $scope.reports = [];

  // Retrieve reports when the user logs in
  $scope.$watch('user.authenticated', function() {
    if ($scope.user.authenticated) {
      $scope.getReports();
    } else {
      $scope.reports = [];
    }
  });

  $scope.getReports = function() {
    $scope.showLoading = true;
    ReportService.getReports().then(function(response) {
      var contentType = response.headers('content-type');
      $scope.reports = MarkLogic.Util.parseMultiPart(response.data, contentType);
      $scope.showLoading = false;
    }, function() {
      $scope.showLoading = false;
    });
  };

  $scope.addWidget = function(widgetDef) {
    ReportService.getDashboardOptions($scope.reportDashboardOptions).addWidget({
      name: widgetDef.name
    });
  };

  $scope.gotoDashboard = function(uri) {
    $location.path('/reportdash/' + encodeURIComponent(uri));
  };

  $scope.createReport = function() {
    $location.path('/report');
  };

  $scope.$on('ReportCreated', function(event, report) { 
    $scope.reports.push(report);
  });

  $scope.$on('ReportDeleted', function(event, reportUri) {
    for (var i = 0; i < $scope.reports.length; i++) {
      if (reportUri === $scope.reports[i].uri) {
        // The first parameter is the index, the second 
        // parameter is the number of elements to remove.
        $scope.reports.splice(i, 1);
        break;
      }
    }
  });
}]);
