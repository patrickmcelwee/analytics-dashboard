'use strict';

function getDirTemplate(mode, dirname) {
  var dmt = 'widgets/template/' + dirname + '/design-mode.html';
  var vmt = 'widgets/template/' + dirname + '/view-mode.html';
  var template = '';

  if (mode) {
    if (mode === 'Design') {
      template = dmt;
    } else if (mode === 'View') {
      template = vmt;
    }
  } else {
    template = vmt;
  }
  return template;
}

angular.module('marklogic.widgets', []);

angular.module('marklogic.widgets').run(['$templateCache', function($templateCache) {

  $templateCache.put('template/widgets/time.html',
    '<div>\n' +
    '  Current Time\n' +
    '  <div class="alert alert-success">{{time}}</div>\n' +
    '</div>'
  );

}]);

angular.module('marklogic.widgets').factory('SmartChartDataModel', 
  function(WidgetDataModel, $http) {

  function SmartChartDataModel() {
  }

  SmartChartDataModel.prototype = Object.create(WidgetDataModel.prototype);

  SmartChartDataModel.prototype.init = function() {
    WidgetDataModel.prototype.init.call(this);
    this.load();
  };

  SmartChartDataModel.prototype.load = function() {
    /*$http.get('/topn', {
      params: {
        limit: this.dataModelOptions.limit,
        dimension: this.dataModelOptions.dimension
      }
    }).success(function (data) {
      this.updateScope(data);
    }.bind(this));*/
console.log(this);
    /*$http.get('/api/report/c5e1aff8-a336-4b2d-a363-6185bbb09bca', {
      params: {
        limit: this.dataModelOptions.limit,
        dimension: this.dataModelOptions.dimension
      }
    }).success(function(data) {
      this.updateScope(data);
    }.bind(this));*/
  };

  return SmartChartDataModel;
});

angular.module('marklogic.widgets').directive('mlSmartChart', ['$compile', 'MLRest', 
  function($compile, mlRest) {

  return {
    restrict: 'A',
    replace: false,
    template: '<div ng-include="contentUrl"></div>',
    controller: function($scope, $http) {
      $scope.showModeButton = true;
      $scope.widget.mode = 'View';
      $scope.highchart = null;

      $scope.dmo = {};
      $scope.dmo.directories = [{
        id: 'claim',
        name: 'claim'
      },{
        id: 'person', 
        name: 'person'
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

var deptCostSearch = 
{
  'search' : {
    'options' : {
      'tuples' : [ {
        'name' : 'dept-cost',
        'style' : 'consistent',
        'aggregate' : [{'apply' : "count"}],
        'indexes' : [ {
          'range' : {
            'json-property' : 'department'
          }
        }, {
          'range' : {
            'json-property' : 'cost'
          }
        } ]
      } ]
    }
  }
};

// Combined query
var deptSearch = {
  'search' : {
    'options' : {
      'page-length': 25,
      'values' : [
        {
          'name' : "deptValueDef", // the name of range specification
          //'style' : "consistent",
          'range' : {
            "type": "xs:string",
            "element": { "ns": "", "name": "department" }
            //'json-property' : "department"
          },
          'aggregate' : [{'apply' : "count"}]
        }
      ]
    }
  }
};

var costSearch = {
  'search' : {
    'query': {
      'queries': [{
        'directory-query': {
          uri: ['/reports/']
        }
      }]
    },
    'options' : {
      'values' : [{
        'name' : "costValueDef",
        'style' : "consistent",
        'range' : {
          'json-property' : "cost"
        },
        'aggregate' : [{
          'apply' : "sum"
        }]
      }]
    }
  }
};

        /*mlRest.values('dept-cost', {
          'directory': '/reports/',
          'pageLength': 20,
          'format': 'json'
        }, deptCostSearch).then(function(response) {
          console.log(response);
        });*/

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
      $scope.contentUrl = getDirTemplate($scope.widget.mode, 'ml-smart-chart');

      $scope.$watch('widget.mode', function(mode) {
        console.log('widget.mode: ' + mode);
        //console.log($scope);

        $scope.cleanup();
        $scope.contentUrl = getDirTemplate(mode, 'ml-smart-chart');

        if (mode === 'View') {
          // auto run in the view mode
          $scope.execute();
        }
      });
    }
  };
}]);

angular.module('marklogic.widgets').directive('mlTime', function($interval) {
  return {
    restrict: 'A',
    replace: true,
    templateUrl: 'template/widgets/time.html',
    link: function(scope) {
      function update() {
        var d = new Date();
        if (scope.widget.format && scope.widget.format === 'year')
          scope.time = d.toLocaleTimeString() + ' ' + d.toLocaleDateString();
        else
          scope.time = d.toLocaleTimeString();
      }
      var promise = $interval(update, 500);
      scope.$on('$destroy', function() {
        $interval.cancel(promise);
      });
    }
  };
});

angular.module('marklogic.widgets').directive('mlPieChart', function($interval) {
  return {
    restrict: 'A',
    replace: true,
    template: '<div style="min-width:310px;height:400px;max-width:600px;margin:0 auto"></div>',
    link: function(scope, element, attrs) {
      $(element).highcharts({
        chart: {
          plotBackgroundColor: null,
          plotBorderWidth: null,
          plotShadow: false,
          type: 'pie'
        },
        title: {
          text: 'Browser market shares January, 2015 to May, 2015'
        },
        tooltip: {
          pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
        },
        plotOptions: {
          pie: {
            allowPointSelect: true,
            cursor: 'pointer',
            dataLabels: {
              enabled: true,
              format: '<b>{point.name}</b>: {point.percentage:.1f} %',
              style: {
                color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
              }
            }
          }
        },
        series: [{
          name: "Brands",
          colorByPoint: true,
          data: [{
            name: "Microsoft Internet Explorer",
            y: 56.33
          }, {
            name: "Chrome",
            y: 24.03,
            sliced: true,
            selected: true
          }, {
            name: "Firefox",
            y: 10.38
          }, {
            name: "Safari",
            y: 4.77
          }, {
            name: "Opera",
            y: 0.91
          }, {
            name: "Proprietary or Undetectable",
            y: 0.2
          }]
        }]
      });
    }
    // End of link
  };
});

angular.module('marklogic.widgets').directive('mlCanvasChart', function() {
  return {
    restrict: 'A',
    replace: true,
    template: '<canvas style="height:300px;min-width:300px;max-width:100%;width:auto;"></canvas>',
    controller: function($scope) {
      $scope.showModeButton = false;
    },
    link: function(scope, element, attrs) {
      var data = {
        labels: ["January", "February", "March", "April", "May", "June"],
        datasets: [{
          label: "2014 claims #",
          fillColor: "rgba(220,220,220,0.5)",
          strokeColor: "rgba(220,220,220,0.8)",
          highlightFill: "rgba(220,220,220,0.75)",
          highlightStroke: "rgba(220,220,220,1)",
          data: [456,479,324,569,702,60]
        },{
          label: "2015 claims #",
          fillColor: "rgba(151,187,205,0.5)",
          strokeColor: "rgba(151,187,205,0.8)",
          highlightFill: "rgba(151,187,205,0.75)",
          highlightStroke: "rgba(151,187,205,1)",
          data: [364,504,605,400,345,320]
        }]
      };

      var ctx = $(element).get(0).getContext('2d');
      var myBarChart = new Chart(ctx).Bar(data);
    }
  };
});
