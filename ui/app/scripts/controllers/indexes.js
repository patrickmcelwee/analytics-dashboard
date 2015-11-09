'use strict';

angular.module('app').controller('IndexesCtrl', ['$scope', '$http', 'User', 'MLRest', 
  function($scope, $http, user, mlRest) {

  var indexDialogId = '#index-dialog';
  var deleteIndexDialogId = '#delete-index-dialog';

  var index_types = [
    'path-namespace',
    'range-path-index',
    'range-element-attribute-index',
    'range-element-index',
    'range-field-index'
  ];

  $scope.scalar_types = [
    'int', 
    'unsignedInt',
    'long',
    'unsignedLong',
    'float',
    'double',
    'decimal',
    'dateTime',
    'time',
    'date',
    'gYearMonth',
    'gYear',
    'gMonth',
    'gDay',
    'yearMonthDuration',
    'dayTimeDuration',
    'string',
    'anyURI'
  ];

  $scope.user = user;
  $scope.database = {};
  $scope.current_index = {};

  // Retrieve the database's properties when the user logs in
  $scope.$watch('user.authenticated', function() {
    if ($scope.user.authenticated) {
      $scope.retrieveDatabaseProperties();
    } else {
      $scope.database = {};
    }
  });

  $scope.setCurrentIndex = function(index) {
    $scope.current_index = {};
    angular.extend($scope.current_index, index);
  };

  // Retrieve the database's properties
  $scope.retrieveDatabaseProperties = function() {
    MarkLogic.Util.showLoader();
    $http.get('/api/database/properties').then(function(response) {
      MarkLogic.Util.hideLoader();
      $scope.database = response.data.database;
    });
  };

  $scope.showIndexRemover = function(type, position) {
    $scope.index_type = type;
    $scope.index_text = type.replace(/-/g, ' ');
    $scope.position = position;

    MarkLogic.Util.showModal(deleteIndexDialogId);
  };

  $scope.showIndexEditor = function(type, position, index) {
    if (type === 'path-namespace')
      $scope.scalarTypeNeeded = false;
    else
      $scope.scalarTypeNeeded = true;

    $scope.index_type = type;
    $scope.index_text = type.replace(/-/g, ' ');
    $scope.index_template_url = 'template/indexes/' + type + '.html';

    if (position !== undefined) {
      $scope.operation = 'Edit';
      $scope.position = position;
      $scope.setCurrentIndex(index);
    } else {
      $scope.operation = 'Add';
      $scope.position = -1;
      $scope.current_index = {};

      if (type !== 'path-namespace') {
        $scope.current_index['invalid-values'] = 'ignore';
        $scope.current_index['range-value-positions'] = false;
      }
    }

    MarkLogic.Util.showModal(indexDialogId);
  };

  $scope.updateIndex = function() {
    MarkLogic.Util.hideModal(indexDialogId);
    MarkLogic.Util.showLoader();

    var indexes = {};

    index_types.forEach(function(type) {
      indexes[type] = [];
      if ($scope.database[type]) {
        angular.copy($scope.database[type], indexes[type]);
      }
    });

    var scalarType = $scope.current_index['scalar-type'];
    if (scalarType === 'string') {
      $scope.current_index['collation'] = 'http://marklogic.com/collation/codepoint';
    }

    if ($scope.operation === 'Edit') {
      var index = indexes[$scope.index_type][$scope.position];
      angular.copy($scope.current_index, index);
    } else {
      indexes[$scope.index_type].push($scope.current_index);
    }

    var data = {
      'indexes': indexes
    };

    $http.post('/api/database/properties', data).then(function(response) {
      MarkLogic.Util.hideLoader();
      if ($scope.operation === 'Edit') {
        var index = $scope.database[$scope.index_type][$scope.position];
        angular.copy($scope.current_index, index);
      } else {
        $scope.database[$scope.index_type].push($scope.current_index);
      }
    });
  };

  $scope.deleteIndex = function() {
    MarkLogic.Util.hideModal(deleteIndexDialogId);
    MarkLogic.Util.showLoader();

    var indexes = {};

    index_types.forEach(function(type) {
      indexes[type] = [];
      if ($scope.database[type]) {
        angular.copy($scope.database[type], indexes[type]);
      }
    });

    indexes[$scope.index_type].splice($scope.position, 1);

    var data = {
      'indexes': indexes
    };

    $http.post('/api/database/properties', data).then(function(response) {
      MarkLogic.Util.hideLoader();
      $scope.database[$scope.index_type].splice($scope.position, 1);
    });
  };

}]);
