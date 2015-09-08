/*
 * Copyright (c) 2015 MarkLogic Corporation. ALL Rights Reserved.
 */

'use strict';

angular.module('app', [
    'app.service',
    'ngCookies',
    'ngRoute',
    'ngResource',
    'ngSanitize',
    'ui.bootstrap',
    'ui.dashboard',
    'ngTable',
    'ngJsonExplorer',
    'marklogic.widgets',
    'ml.common',
    'ml.search',
    'ml.search.tpls',
    'ml.utils',
    'app.common',
    'ml.report',
    'ml-index-builder',
    'app.user',
    'app.search',
    'app.detail',
    'compile'
  ])
  .config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {

    $locationProvider.html5Mode(true);

    $routeProvider
      .when('/', {
        templateUrl: 'views/home.html',
        controller: 'HomeCtrl'
      })
      .when('/search', {
        templateUrl: 'views/search.html',
        controller: 'SearchCtrl',
        reloadOnSearch: false
      })
      .when('/query-options', {
        templateUrl: 'views/query-options.html',
        controller: 'QueryOptionsCtrl'
      })
      .when('/reports', {
        templateUrl: 'views/reports.html',
        controller: 'ReportsCtrl'
      })
      .when('/report', {
        templateUrl: 'views/new-report.html',
        controller: 'ReportCtrl'
      })
      .when('/uploader', {
        templateUrl: 'views/uploader.html',
        controller: 'UploaderCtrl'
      })
      .when('/reportdash/:uri', {
        templateUrl: 'views/reportdash.html',
        controller: 'ReportDashCtrl',
        resolve: {
          ReportData: function($route, ReportService) {
            //MarkLogic.Util.showLoader();
            var uri = decodeURIComponent($route.current.params.uri);
            return ReportService.getReport(uri).then(function(response) {
              //MarkLogic.Util.hideLoader();
              return response;
            });
          }
        }
      })
      .when('/detail', {
        templateUrl: 'detail/detail.html',
        controller: 'DetailCtrl'
      })
      .when('/profile', {
        templateUrl: 'user/profile.html',
        controller: 'ProfileCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
}]);
