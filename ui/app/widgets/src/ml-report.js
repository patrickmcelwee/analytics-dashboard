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
      mode = mode.toLowerCase();
      if (mode === 'design') {
        template = dmt;
      } else if (mode === 'view') {
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
    controller: function($scope, $http, $q) {
      // Set the initial mode for this widget to View.
      $scope.showModeButton = true;
      $scope.widget.mode = 'View';

/*
      $scope.data.fields = {
        'state': {type: 'string', classification: 'json-property'},
        'city': {type: 'string', classification: 'element', ns: 'claim-ns'},
        'payor': {type: 'string', classification: 'field', collation: 'claim-collation'},
        'payment': {type: 'number', classification: 'element', ns: '', minimum: 10, maximum: 900},
        'paid': {type: 'boolean', classification: 'json-property', ns: '', }
      };
*/
      $scope.model = {
        queryConfig: null,
        queryError: null,
        config: null,
        configError: null,
        results: null,
        includeFrequency: false,
        loadingConfig: false,
        loadingResults: false,
        groupingStrategy: 'root',
        showBuilder: false
      };

      if ($scope.widget.dataModelOptions.groupingStrategy) {
        $scope.model.groupingStrategy = $scope.widget.dataModelOptions.groupingStrategy;
      }

      $scope.deferredAbort = null;

      $scope.data = {};
      $scope.data.docs = [];
      $scope.data.fields = {};
      $scope.data.operation = 'and-query';
      $scope.data.query = [];
      $scope.data.dimensions = [];
      $scope.data.needsUpdate = true;
      $scope.data.needsRefresh = true;
      $scope.data.directory = $scope.widget.dataModelOptions.directory;
      $scope.data.directory_model = null;

      $scope.executor = {};
      $scope.executor.transform = 'smart-filter';

      $scope.highchart = null;

      $scope.showDimensions = function() {
        var dimensions = {
          dimensions: $scope.data.dimensions
        };
        return JSON.stringify(dimensions, null, 2);
      };

      $scope.showQuery = function() {
        var query = $scope.getStructuredQuery();
        return JSON.stringify(query, null, 2);
      };

      $scope.getStructuredQuery = function() {
        var query = {
          'query': {
            "queries": []
          }
        };
        var rootQuery = {};
        rootQuery[$scope.data.operation] = {'queries': $scope.data.query};

        query['query']['queries'].push(rootQuery);

        return query;
      };

      $scope.clearResults = function() {
        $scope.model.results = null;
        $scope.executor.dimensions = [];
        $scope.executor.results = [];

        if ($scope.highchart) {
          $scope.highchart.highcharts().destroy();
          $scope.highchart = null;
        }
      };

      $scope.getDbConfig = function() {
        var params = {
          'rs:strategy': $scope.model.groupingStrategy
        };

        $scope.model.showBuilder = false;
        $scope.model.loadingConfig = true;

        if ($scope.model.config) {
          params['rs:database'] = $scope.model.config['current-database'];
        } else if ($scope.widget.dataModelOptions.database) {
          params['rs:database'] = $scope.widget.dataModelOptions.database;
        }

        $scope.clearResults();
        $scope.model.includeFrequency = false;
        // $scope.model.config = null;
        $scope.model.queryConfig = {
          'result-type': 'group-by',
          rows: [],
          columns: [],
          computes: [],
          options: ['headers=true']
        };

        $scope.data.docs = [];
        $scope.data.fields = {};

        $http.get('/v1/resources/index-discovery', {
          params: params
        }).then(function(response) {
          $scope.model.loadingConfig = false;

          if (response.data.errorResponse) {
            $scope.model.configError = response.data.errorResponse.message;
            return;
          }

          $scope.model.config = response.data;

          var docsExist = !angular.equals($scope.model.config.docs, {});
          if (docsExist) {
            $scope.model.configError = null;

            var docs = $scope.model.config.docs;
            var keys = Object.keys(docs);

            // For each configured doc
            keys.forEach(function(key) {
              var doc = {
                id: key, 
                name: key,
                fields: {}
              };
              var indexes = docs[key];

              indexes.forEach(function(index) {
                var field = {
                  type: index['scalar-type'],
                  classification: 'element',
                  ns: index['namespace-uri']
                };
                var collation = index['collation'];

                if (collation) {
                  field.collation = collation;
                }
                doc.fields[index['localname']] = field;
              });

              $scope.data.docs.push(doc);
            });

            for (var i = 0; i < $scope.data.docs.length; i++) {
              var model = $scope.data.docs[i];
              if (model.id === $scope.data.directory) {
                $scope.data.directory_model = model;
                $scope.setDocument();
                break;
              }
            }
          } else {
            $scope.model.configError = 'No documents with range indices in the database';
          }
        }, function(response) {
          $scope.model.loadingConfig = false;
          $scope.model.configError = response.data;
        });
      };

      $scope.setDocument = function() {
        if ($scope.data.directory_model) {
          var directory = $scope.data.directory_model.id;
          $scope.data.directory = directory;
          $scope.executor.dimensions = [];
          $scope.executor.results = [];

          for (var i = 0; i < $scope.data.docs.length; i++) {
            var doc = $scope.data.docs[i];
            if (doc.id === directory) {
              $scope.data.fields = doc.fields;
              break;
            }
          }
          $scope.data.operation = 'and-query';
          $scope.data.query = [];
          $scope.data.dimensions = [];

          if (directory === $scope.widget.dataModelOptions.directory) {
            if ($scope.widget.dataModelOptions.query && 
                $scope.widget.dataModelOptions.query.query &&
                $scope.widget.dataModelOptions.query.query.queries) {
              var query = $scope.widget.dataModelOptions.query.query.queries[0];
              var operation = Object.keys(query)[0];
              $scope.data.operation = operation;
              $scope.data.query = query[operation]['queries'];
            } else {
              $scope.data.operation = 'and-query';
              $scope.data.query = [];
            }

            if ($scope.widget.dataModelOptions.dimensions) {
              angular.copy($scope.widget.dataModelOptions.dimensions, $scope.data.dimensions);
            } else {
              $scope.data.dimensions = [];
            }
          } else {
            $scope.data.operation = 'and-query';
            $scope.data.query = [];
            $scope.data.dimensions = [];
          }

          $scope.data.needsUpdate = true;
          $scope.data.needsRefresh = true;

          $scope.model.showBuilder = true;
        } else {
          $scope.model.showBuilder = false;
        }
      };

      $scope.save = function() {
        $scope.widget.dataModelOptions.database = $scope.model.config['current-database'];
        $scope.widget.dataModelOptions.groupingStrategy = $scope.model.groupingStrategy;
        $scope.widget.dataModelOptions.directory = $scope.data.directory_model.id;

//console.log($scope.model.config['current-database']);
//console.log($scope.model.groupingStrategy);

        $scope.widget.dataModelOptions.query = {};
        $scope.widget.dataModelOptions.dimensions = [];

        angular.copy($scope.getStructuredQuery(), $scope.widget.dataModelOptions.query);
        angular.copy($scope.data.dimensions, $scope.widget.dataModelOptions.dimensions);

        $scope.options.saveDashboard();
      };

      $scope.execute = function() {

var search2 = {
  'search' : {
    'query': {
      'queries': [{
        'directory-query': {
          uri: ['/claims/']
        }
      }]
    },
    'options' : {
      'values' : [{
        'name' : 'search2',
        'aggregate': [{'apply' : 'count'}],
        'range' : {
          'type': 'xs:decimal',
          'element' : {'ns': '', 'name': 'CLM_UTLZTN_DAY_CNT'}
        }
      }]
    }
  }
};

        /*mlRest.values('search2', {
          'directory': '/claim/',
          'pageLength': 400,
          'format': 'json'
        }, search2).then(function(response) {
          console.log(response);
        });*/

        $scope.executeQuery();
      };

      $scope.executeQuery = function() {
        var dimensions = $scope.widget.dataModelOptions.dimensions;
        var count = 0;

        dimensions.forEach(function(dimension) {
          if (dimension.groupby) count++;
        });

        // If there is no groupby dimension, we will do simple 
        // search, otherwise we will do aggregate computations.
        $scope.model.loadingResults = true;
        if (count)
          $scope.executeComplexQuery(count);
        else
          $scope.executeSimpleQuery();
      };

      $scope.getColumn = function(name) {
        var directory = $scope.widget.dataModelOptions.directory;
        var fields = $scope.model.config.docs[directory];
        for (var i = 0; i < fields.length; i++) {
          var field = fields[i];
          if (name === field.localname)
            return field;
        }
        return null;
      };

      $scope.executeComplexQuery = function(count) {
        var params = {};
        var queryConfig = angular.copy($scope.model.queryConfig);

        if ($scope.model.config) {
          params['rs:database'] = $scope.model.config['current-database'];
        }

        if ($scope.model.includeFrequency) {
          queryConfig.computes.push({fn: 'frequency'});
        }

        var dimensions = $scope.widget.dataModelOptions.dimensions;
        dimensions.forEach(function(dimension) {
          var key = Object.keys(dimension)[0];

          if (key !== 'atomic') {
            var name = dimension[key].field;
            var column = $scope.getColumn(name);

            if (key === 'groupby') {
              queryConfig.columns.push(column);
            } else {
              queryConfig.computes.push({
                fn: key,
                ref: column
              });
            }
          }
        });

        $scope.model.loadingResults = true;
        $scope.clearResults();

        $scope.deferredAbort = $q.defer();
        $http({
          method: 'POST',
          url: '/v1/resources/group-by',
          params: params,
          data: queryConfig,
          timeout: $scope.deferredAbort.promise
        }).then(function(response) {
          $scope.model.results = response.data;
          $scope.model.queryError = null;
          $scope.model.loadingResults = false;

          $scope.createHighcharts(count, $scope.model.results.headers, $scope.model.results.results);
        }, function(response) {
          $scope.model.loadingResults = false;

          if (response.status !== 0) {
            $scope.model.queryError = {
              title: response.statusText,
              description: response.data
            };
          }
        });
      };

      $scope.executeSimpleQuery = function() {
        var directory = '/' + $scope.widget.dataModelOptions.directory + '/';
        var queries = $scope.widget.dataModelOptions.query.query.queries;
        var search = {
          'search': {
            'options': {
              'search-option': ['unfiltered']
            },
            'query': {
              'queries': queries
            }
          }
        };

        var params = {
          'directory': directory,
          'pageLength': 400,
          'category': 'content',
          'format': 'json'
        };

        $scope.clearResults();

        var dimensions = $scope.widget.dataModelOptions.dimensions;
        dimensions.forEach(function(dimension) {
          var key = Object.keys(dimension)[0];
          var name = dimension[key].field;
          var type = $scope.data.fields[name]['type'];
          var item = {name: name, type: type};
          $scope.executor.dimensions.push(item);
        });

        if ($scope.executor.transform) {
          // We need two transforms: one for JSON, one for XML.
          // These transforms filter the document. The XML
          // transform also converts am XML document to JSON.
          params.transform = $scope.executor.transform;

          $scope.executor.dimensions.forEach(function(dimension) {
            params['trans:' + dimension.name] = dimension.type;
          });
        }

        mlRest.search(params, search).then(function(response) {
          $scope.model.loadingResults = false;

          var contentType = response.headers('content-type');
          var results = MarkLogic.Util.parseMultiPart(response.data, contentType);

          results.forEach(function(result) {
            var item = [];
            $scope.executor.dimensions.forEach(function(dimension) {
              var name = dimension.name;
              item.push(result[name]);
            });

            $scope.executor.results.push(item);
          });
        });
      };

      $scope.createHighcharts = function(count, headers, results) {
        var categories = [];
        var series = [];

        for (var i = count; i < headers.length; i++) {
          series.push({
            name: headers[i],
            data: []
          });
        }

        results.forEach(function(row) {
          var groups = [];
          for (var i = 0; i < count; i++) {
            groups.push(row[i]);
          }
          categories.push(groups.join(','));

          for (var i = count; i < row.length; i++) {
            series[i-count].data.push(row[i]);
          }
        });

        $scope.highchart = $scope.element.find('div.hcontainer').highcharts({
          chart: {
            type: 'column'
          },
          title: {
            text: ''
          },
          xAxis: {
            categories: categories,
            crosshair: true
          },
          yAxis: {
            min: 0,
            title: {
              text: ''
            }
          },
          tooltip: {
            headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
            pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
                '<td style="padding:0"><b>{point.y:.1f}</b></td></tr>',
            footerFormat: '</table>',
            shared: true,
            useHTML: true
          },
          plotOptions: {
            column: {
              pointPadding: 0.2,
              borderWidth: 0
            }
          },
          series: series
        });
      };

      $scope.cleanup = function() {
        if ($scope.highchart) {
          $scope.highchart.highcharts().destroy();
          $scope.highchart = null;
        }
      };

      // Kick off
      $scope.getDbConfig();
    },

    link: function($scope, element, attrs) {
      $scope.element = element;
      $scope.contentUrl = mlReportService.getDirectiveTemplate($scope.widget.mode, 'ml-smart-grid');

      $scope.$watch('widget.mode', function(mode) {
        console.log('widget.mode: ' + mode);
        //console.log($scope);

        $scope.cleanup();

        $scope.contentUrl = mlReportService.getDirectiveTemplate(mode, 'ml-smart-grid');

        $scope.data.needsUpdate = true;
        $scope.data.needsRefresh = true;

        if (mode === 'View') {
          //$scope.execute();
        }
      });
    }
  };
}]);
