'use strict';

angular.module('app').controller('ReportsCtrl', ['$scope', '$filter', '$location', '$rootScope', '$modal', 'User', 'NgTableParams', 'ReportService',
  function($scope, $filter, $location, $rootScope, $modal, user, NgTableParams, ReportService) {

  $scope.user = user;
  $scope.showLoading = false;
  $scope.tableParams = null;

  // The report selected for update or delete.
  $scope.report = {};

  var editReportDialogId = '#edit-report-dialog';
  var deleteReportDialogId = '#delete-report-dialog';

  // Retrieve reports when the user logs in
  $scope.$watch('user.authenticated', function() {
    if ($scope.user.authenticated) {
      $scope.getReports();
    } else {
      $scope.reports = [];
    }
  });

  $scope.setOption = function(option) {
    $scope.report.privacy = option;
  };

  $scope.isActive = function(option) {
    return option === $scope.report.privacy;
  };

  $scope.getReports = function() {
    $scope.showLoading = true;
    ReportService.getReports().then(function(response) {
      var contentType = response.headers('content-type');
      var page = MarkLogic.Util.parseMultiPart(response.data, contentType);
      var reports = page.results; 

      if ($scope.tableParams) {
        $scope.reports.length = 0;
        angular.extend($scope.reports, reports);
        $scope.tableParams.total($scope.reports.length);
        $scope.tableParams.reload();
      } else {
        $scope.reports = reports;
        $scope.createTable();
      }

      $scope.showLoading = false;
    }, function() {
      $scope.showLoading = false;
    });
  };

  $scope.deleteReport = function() {
    MarkLogic.Util.showLoader();

    ReportService.deleteReport($scope.report.uri).then(function(response) {
      MarkLogic.Util.hideLoader();
      MarkLogic.Util.hideModal(deleteReportDialogId);

      $rootScope.$broadcast('ReportDeleted', $scope.report.uri);

      $scope.getReports();
    });
  };

  $scope.updateReport = function() {
    if ($scope.editReportForm.$valid) {
      MarkLogic.Util.showLoader();

      ReportService.updateReport($scope.report).then(function(response) {
        MarkLogic.Util.hideLoader();
        MarkLogic.Util.hideModal(editReportDialogId);

        if (response.data.success) {
          $scope.updateTableRow();
        }
      });
    }
  };

  $scope.showReportRemover = function(report) {
    $scope.report.uri = report.uri;
    MarkLogic.Util.showModal(deleteReportDialogId);
  };

  $scope.showReportEditor = function(report) {
    $scope.report.uri = report.uri;

    MarkLogic.Util.showLoader();

    ReportService.getReport($scope.report.uri).then(function(response) {
      MarkLogic.Util.hideLoader();

      if (response.status === 200) {
        $scope.setReport(response.data);
        MarkLogic.Util.showModal(editReportDialogId);
      } else {
        MessageCenter.showMessage(response.data.message);
      }
    });
  };

  $scope.setReport = function(report) {
    angular.extend($scope.report, report);
  };

  $scope.createTable = function() {
    $scope.tableParams = new NgTableParams({
      page: 1, // show first page
      count: 10, // count per page
      sorting: {
        name: 'asc' // desc - initial sorting
      }
    }, {
      total: $scope.reports.length, // Defines the total number of items for the table
      getData: function($defer, params) {
        var orderedData = params.sorting() ? 
            $filter('orderBy')($scope.reports, $scope.tableParams.orderBy()) : $scope.reports;

        orderedData = params.filter() ? 
            $filter('filter')(orderedData, params.filter()) : orderedData;

        // Set total for recalc pagination
        params.total(orderedData.length);

        $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
      }
    });
  };

  $scope.updateTableRow = function() {
    for (var i = 0; i < $scope.reports.length; i++) {
      var report = $scope.reports[i];
      if (report.uri === $scope.report.uri) {
        report.name = $scope.report.name;
        report.description = $scope.report.description;
        break;
      }
    }
  };

  $scope.gotoDashboard = function(uri) {
    $location.path('/reportdash/' + encodeURIComponent(uri));
  };
}]);