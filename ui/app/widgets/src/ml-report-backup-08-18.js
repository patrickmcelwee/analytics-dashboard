/*
 * Copyright (c) 2015 MarkLogic Corporation. ALL Rights Reserved.
 */

(function(angular) {
  'use strict';

  angular.module('ml.report', ['ml-dimension-builder', 'ml-sq-builder']);

})(window.angular);

(function(angular) {
  'use strict';

  angular.module('ml.report')
    .factory('mlReportService', [
      function() {
        return {
          getDirectiveTemplate: getDirectiveTemplate
        };
      }
    ]);

  function getDirectiveTemplate(mode, name) {
    var dmt = 'widgets/template/' + name + '/design-mode.html';
    var vmt = 'widgets/template/' + name + '/view-mode.html';
    var template = '';

    if (mode) {
      var m = mode.toLowerCase();

      if (m === 'design') {
        template = dmt;
      } else if (m === 'view') {
        template = vmt;
      }
    } else {
      template = vmt;
    }

    return template;
  }

})(window.angular);

(function(angular) {
  'use strict';

  angular.module('ml.report')
    .factory('SmartGridDataModel', ['WidgetDataModel', '$http',
      function(WidgetDataModel, $http) {
        function SmartGridDataModel() {
        }

        SmartGridDataModel.prototype = Object.create(WidgetDataModel.prototype);

        SmartGridDataModel.prototype.init = function() {
          WidgetDataModel.prototype.init.call(this);
          this.load();
        };

        SmartGridDataModel.prototype.load = function() {
          console.log(this);
        };

        return SmartGridDataModel;
      }
    ]);

})(window.angular);

angular.module('ml.report').directive('mlSmartGrid', ['$compile', 'MLRest', 'mlReportService',
  function($compile, mlRest, mlReportService) {

  return {
    restrict: 'A',
    replace: false,
    template: '<div ng-include="contentUrl"></div>',
    controller: function($scope, $http) {

    var data = $scope.data = {};

    data.dimensions = [
      {
        'sum': {
          'field': 'payment'
        }
      },
      {
        'groupby': {
          'field': 'paid'
        }
      },
      {
        'groupby': {
          'field': 'state'
        }
      },
      {
        'standard': {
          'field': 'payor'
        }
      }
    ];

    data.query = [
      {
        'value-query': {
          'json-property': 'state',
          'text': 'ON'
        }
      },
      {
        'value-query': {
          'element': {'name': 'city', 'ns': 'claim'},
          'text': 'ON'
        }
      },
      {
        'word-query': {
          'field': {'name': 'payor', 'collation': 'claim'},
          'text': 'AjaxWeaver'
        }
      },
      {
        'value-query': {
          'type': 'boolean',
          'json-property': 'paid',
          'text': 'false'
        }
      },
      {
        'and-query': {
          "queries": [
            {
              'range-query': {
                'type': 'xs:decimal',
                'element': {
                  'name': 'payment',
                  'ns': ''
                },
                'range-operator': 'GE',
                'value': 650
              }
            },
            {
              'range-query': {
                'type': 'xs:decimal',
                'element': {
                  'name': 'payment',
                  'ns': ''
                },
                'range-operator': 'LT',
                'value': 850
              }
            }
          ]
        }
      }
    ];

    data.fields = {
      'state': {type: 'string', classification: 'json-property'},
      'city': {type: 'string', classification: 'element', ns: 'claim-ns'},
      'payor': {type: 'string', classification: 'field', collation: 'claim-collation'},
      'payment': {type: 'number', classification: 'element', ns: '', minimum: 10, maximum: 900},
      'paid': {type: 'boolean', classification: 'json-property', ns: '', }
    };

    data.operation = 'and-query';
    data.needsRefresh = true;
    data.needsUpdate = true;

    $scope.showFacets = function() {
      var dimensions = {
        dimensions: $scope.data.dimensions
      };

      return JSON.stringify(dimensions, null, 2);
    };

    $scope.showQuery = function() {
      var query = {
        'query': {
          "queries": []
        }
      };
      var rootQuery = {};
      rootQuery[$scope.data.operation] = {'queries': $scope.data.query};

      query['query']['queries'].push(rootQuery);

      return JSON.stringify(query, null, 2);
    };




      $scope.widget.mode = 'View';
      $scope.highchart = null;

      $scope.dmo = {};
      $scope.dmo.directories = [{
        id: 'claims',
        name: 'claims'
      },{
        id: 'reports',
        name: 'reports'
      }];

      $scope.dmo.charts = [{
        id: 'pie',
        name: 'Pie Chart'
      },{
        id: 'column',
        name: 'Column Chart'
      }];

      $scope.dmo.properties = [];

      $scope.dmo.directory = $scope.widget.dataModelOptions.directory;
      $scope.dmo.xaxis = $scope.widget.dataModelOptions.xaxis;
      $scope.dmo.yaxis = $scope.widget.dataModelOptions.yaxis;
      $scope.dmo.chart = $scope.widget.dataModelOptions.chart;

      $scope.dmo.directory_model = null;
      $scope.dmo.xaxis_model = null;
      $scope.dmo.yaxis_model = null;
      $scope.dmo.chart_model = null;

      for (var i = 0; i < $scope.dmo.directories.length; i++) {
        var model = $scope.dmo.directories[i];
        if (model.id === $scope.dmo.directory) {
          $scope.dmo.directory_model = model;
          break;
        }
      }

      for (var i = 0; i < $scope.dmo.charts.length; i++) {
        var model = $scope.dmo.charts[i];
        if (model.id === $scope.dmo.chart) {
          $scope.dmo.chart_model = model;
          break;
        }
      }

      $scope.loadMetadata = function() {
        if ($scope.dmo.directory_model) {
          var directory = $scope.dmo.directory_model.id;
          $http.get('/api/metadata/' + directory).then(function(response) {
            $scope.dmo.properties = response.data.properties;
            $scope.setupDropdowns();

            data.fields = {};
            data.query = [];
            data.dimensions = [];
            $scope.dmo.properties.forEach(function(item) {
              data.fields[item.name] = {
                type: item.type, 
                classification: item.classification, 
                ns: item.ns
              };
            });
            data.needsRefresh = true;
            data.needsUpdate = true;
          });
        } else {
          $scope.dmo.properties = [];
          $scope.dmo.xaxis_model = null;
          $scope.dmo.yaxis_model = null;
        }
      };

      $scope.setupDropdowns = function() {
        for (var i = 0; i < $scope.dmo.properties.length; i++) {
          var model = $scope.dmo.properties[i];
          if (model.name === $scope.dmo.xaxis) {
            $scope.dmo.xaxis_model = model;
          }
          if (model.name === $scope.dmo.yaxis) {
            $scope.dmo.yaxis_model = model;
          }
        }
      };

      $scope.save = function() {
        $scope.widget.dataModelOptions.directory = $scope.dmo.directory_model.id;
        $scope.widget.dataModelOptions.xaxis = $scope.dmo.xaxis_model.name;
        $scope.widget.dataModelOptions.yaxis = $scope.dmo.yaxis_model.name;
        $scope.widget.dataModelOptions.chart = $scope.dmo.chart_model.id;

        $scope.options.saveDashboard();
      };

      $scope.preview = function() {
        $scope.execute();
      };

      $scope.executeQuery = function() {
      };

      $scope.execute = function() {
        $scope.executeQuery();

        var directory = $scope.widget.dataModelOptions.directory;
        var xaxis = $scope.widget.dataModelOptions.xaxis;
        var yaxis = $scope.widget.dataModelOptions.yaxis;
        var chart = $scope.widget.dataModelOptions.chart;

        if (directory && xaxis && yaxis && chart) {
          var facet = xaxis;

          $http.post('/api/smartchart', {
            directory: directory,
            xaxis: xaxis,
            yaxis: yaxis
          }).then(function(response) {
            var facetValues = response.data.results[0].facets[facet].facetValues;
            var data = [];

            facetValues.forEach(function(facetValue) {
              data.push({
                name: facetValue.name,
                y: facetValue.count
              });
            });

            $scope.createHighcharts('Faceted search by ' + facet, data);
          });
        }
      };

      $scope.createHighcharts = function(title, data) {
        $scope.highchart = $scope.element.find('div.hcontainer').highcharts({
          chart: {
            type: $scope.widget.dataModelOptions.chart
          },
          title: {
            text: title
          },
          xAxis: {
            type: 'category'
          },
          yAxis: {
            title: {
              text: ''
            }
          },
          legend: {
            enabled: false
          },
          tooltip: {
            //headerFormat: '<span style="font-size:11px">{series.name}</span><br>',
            headerFormat: '',
            pointFormat: '<span style="color:{point.color}">{point.name}</span>: <b>{point.y}</b>'
          },
          series: [{
            colorByPoint: true,
            data: data
          }]
        });
      };

      $scope.cleanup = function() {
        if ($scope.highchart) {
          $scope.highchart.highcharts().destroy();
          $scope.highchart = null;
        }
      }

      $scope.loadMetadata();
    },

    link: function($scope, element, attrs) {
      $scope.element = element;
      $scope.contentUrl = mlReportService.getDirectiveTemplate($scope.widget.mode, 'ml-smart-grid');

      $scope.$watch('widget.mode', function(mode) {
        console.log('widget.mode: ' + mode);
        //console.log($scope);

        $scope.cleanup();
        $scope.contentUrl = mlReportService.getDirectiveTemplate(mode, 'ml-smart-grid');

        if (mode === 'View') {
          // auto run in the view mode
          $scope.execute();
        }
      });
    }
  };
}]);
