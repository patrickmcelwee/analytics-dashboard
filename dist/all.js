
angular.module('sample', [
  'ngRoute',
  'ngCkeditor',
  'ui.bootstrap',
  'ngJsonExplorer',
  'ml.common',
  'ml.search',
  'ml.search.tpls',
  'ml.utils',
  'sample.user',
  'sample.search',
  'sample.common',
  'sample.detail',
  'sample.create'
])
  .config(['$routeProvider', '$locationProvider', 'mlMapsProvider', function ($routeProvider, $locationProvider, mlMapsProvider) {

    'use strict';

    // to use google maps, version 3, with the drawing and visualization libraries
    // mlMapsProvider.useVersion(3);
    // mlMapsProvider.addLibrary('drawing');
    // mlMapsProvider.addLibrary('visualization');

    $locationProvider.html5Mode(true);

    $routeProvider
      .when('/', {
        templateUrl: '/search/search.html',
        controller: 'SearchCtrl',
        reloadOnSearch: false
      })
      .when('/create', {
        templateUrl: '/create/create.html',
        controller: 'CreateCtrl'
      })
      .when('/detail', {
        templateUrl: '/detail/detail.html',
        controller: 'DetailCtrl'
      })
      .when('/profile', {
        templateUrl: '/user/profile.html',
        controller: 'ProfileCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  }]);


angular.module('sample.common', [])
  .filter('object2Array', function() {
    'use strict';

    return function(input) {
      var out = [];
      for (var name in input) {
        input[name].__key = name;
        out.push(input[name]);
      }
      return out;
    };
});

(function () {
  'use strict';

  angular.module('sample.detail')
    .controller('DetailCtrl', ['$scope', 'MLRest', '$routeParams', function ($scope, mlRest, $routeParams) {
      var uri = $routeParams.uri;
      var model = {
        // your model stuff here
        detail: {}
      };

      mlRest.getDocument(uri, { format: 'json' }).then(function(response) {
        model.detail = response.data;
      });

      angular.extend($scope, {
        model: model

      });
    }]);
}());


angular.module('sample.detail', []);

// Copied from https://docs.angularjs.org/api/ng/service/$compile
angular.module('sample.create')
  .directive('compile', function($compile) {
    'use strict';

    // directive factory creates a link function
    return function(scope, element, attrs) {
      scope.$watch(
        function(scope) {
           // watch the 'compile' expression for changes
          return scope.$eval(attrs.compile);
        },
        function(value) {
          // when the 'compile' expression changes
          // assign it into the current DOM
          element.html(value);

          // compile the new DOM and link it to the current
          // scope.
          // NOTE: we only compile .childNodes so that
          // we don't get into infinite loop compiling ourselves
          $compile(element.contents())(scope);
        }
      );
    };
  });

(function () {
  'use strict';

  angular.module('sample.create')
    .controller('CreateCtrl', ['$scope', 'MLRest', '$window', 'User', function ($scope, mlRest, win, user) {
      var model = {
        person: {
          isActive: true,
          balance: 0,
          picture: 'http://placehold.it/32x32',
          age: 0,
          eyeColor: '',
          name: '',
          gender: '',
          company: '',
          email: '',
          phone: '',
          address: '',
          about: '',
          registered: '',
          latitude: 0,
          longitude: 0,
          tags: [],
          friends: [],
          greeting: '',
          favoriteFruit: ''
        },
        newTag: '',
        user: user
      };

      angular.extend($scope, {
        model: model,
        editorOptions: {
          height: '100px',
          toolbarGroups: [
            { name: 'clipboard',   groups: [ 'clipboard', 'undo' ] },
            { name: 'basicstyles', groups: [ 'basicstyles', 'cleanup' ] },
            { name: 'paragraph', groups: [ 'list', 'indent', 'blocks', 'align', 'bidi' ] },
            { name: 'links' }
          ],
          //override default options
          toolbar: '',
          /* jshint camelcase: false */
          toolbar_full: ''
        },
        submit: function() {
          mlRest.createDocument($scope.model.person, {
            format: 'json',
            directory: '/content/',
            extension: '.json'
            // TODO: add read/update permissions here like this:
            // 'perm:sample-role': 'read',
            // 'perm:sample-role': 'update'
          }).then(function(response) {
            win.location.href = '/detail?uri=' + response.replace(/(.*\?uri=)/, '');
          });
        },
        addTag: function() {
          model.person.tags.push(model.newTag);
          model.newTag = '';
        }
      });
    }]);
}());


angular.module('sample.create', []);

(function () {
  'use strict';

  angular.module('sample.search')
    .controller('SearchCtrl', ['$scope', '$location', 'User', 'MLSearchFactory', 'MLRemoteInputService', function ($scope, $location, user, searchFactory, remoteInput) {
      var mlSearch = searchFactory.newContext(),
          model = {
            page: 1,
            qtext: '',
            search: {},
            user: user
          };

      (function init() {
        // wire up remote input subscription
        remoteInput.initCtrl($scope, model, mlSearch, search);

        // run a search when the user logs in
        $scope.$watch('model.user.authenticated', function() {
          search();
        });

        // capture initial URL params in mlSearch and ctrl model
        mlSearch.fromParams().then(function() {
          // if there was remote input, capture it instead of param
          mlSearch.setText(model.qtext);
          updateSearchResults({});
        });

        // capture URL params (forward/back, etc.)
        $scope.$on('$locationChangeSuccess', function(e, newUrl, oldUrl){
          mlSearch.locationChange( newUrl, oldUrl ).then(function() {
            search();
          });
        });
      })();

      function updateSearchResults(data) {
        model.search = data;
        model.qtext = mlSearch.getText();
        model.page = mlSearch.getPage();

        remoteInput.setInput( model.qtext );
        $location.search( mlSearch.getParams() );
      }

      function search(qtext) {
        if ( !model.user.authenticated ) {
          model.search = {};
          return;
        }

        if ( arguments.length ) {
          model.qtext = qtext;
        }

        mlSearch
          .setText(model.qtext)
          .setPage(model.page)
          .search()
          .then(updateSearchResults);
      }

      angular.extend($scope, {
        model: model,
        search: search,
        toggleFacet: function toggleFacet(facetName, value) {
          mlSearch
            .toggleFacet( facetName, value )
            .search()
            .then(updateSearchResults);
        }
      });

    }]);
}());


angular.module('sample.search', []);

(function () {
  'use strict';

  angular.module('sample.user')
    .controller('ProfileCtrl', ['$scope', 'MLRest', 'User', '$location', function ($scope, mlRest, user, $location) {
      var model = {
        user: user, // GJo: a bit blunt way to insert the User service, but seems to work
        newEmail: ''
      };

      angular.extend($scope, {
        model: model,
        addEmail: function() {
          if ($scope.profileForm.newEmail.$error.email) {
            return;
          }
          if (!$scope.model.user.emails) {
            $scope.model.user.emails = [];
          }
          $scope.model.user.emails.push(model.newEmail);
          model.newEmail = '';
        },
        removeEmail: function(index) {
          $scope.model.user.emails.splice(index, 1);
        },
        submit: function() {
          mlRest.updateDocument({
            user: {
              'fullname': $scope.model.user.fullname,
              'emails': $scope.model.user.emails
            }
          }, {
            format: 'json',
            uri: '/users/' + $scope.model.user.name + '.json'
            // TODO: add read/update permissions here like this:
            // 'perm:sample-role': 'read',
            // 'perm:sample-role': 'update'
          }).then(function(data) {
            $location.path('/');
          });
        }
      });
    }]);
}());

(function () {

  'use strict';

  angular.module('sample.user')
    .directive('mlUser', [function () {
      return {
        restrict: 'EA',
        controller: 'UserController',
        replace: true,
        scope: {},
        templateUrl: '/user/user-dir.html'
      };
    }])
    .controller('UserController', ['$scope', 'User', function ($scope, user) {
      angular.extend($scope, {
        user: user,
        login: user.login,
        logout: function() {
          user.logout();
          $scope.password = '';
        }
      });
    }]);

}());

(function () {
  'use strict';

  angular.module('sample.user')
    .factory('User', ['$http', function($http) {
      var user = {};

      init();

      $http.get('/user/status', {}).then(updateUser);

      function init() {
        user.name = '';
        user.password = '';
        user.loginError = false;
        user.authenticated = false;
        user.hasProfile = false;
        user.fullname = '';
        user.emails = [];
        return user;
      }

      function updateUser(response) {
        var data = response.data;

        user.authenticated = data.authenticated;

        if ( user.authenticated ) {
          user.name = data.username;

          if ( data.profile ) {
            user.hasProfile = true;
            user.fullname = data.profile.fullname;

            if ( _.isArray(data.profile.emails) ) {
              user.emails = data.profile.emails;
            } else {
              // wrap single value in array, needed for repeater
              user.emails = [data.profile.emails];
            }
          }
        }
      }

      angular.extend(user, {
        login: function(username, password) {
          $http.get('/user/login', {
            params: {
              'username': username,
              'password': password
            }
          }).then(function(reponse) {
            updateUser(reponse);
            user.loginError = !user.authenticated;
          });
        },
        logout: function() {
          $http.get('/user/logout').then(init);
        }
      });

      return user;
    }]);
}());


angular.module('sample.user', ['sample.common']);


/*
  Library to use (close to) fluent-style notation to build structured MarkLogic queries..

  This:

    {
      'or-query': {
        'queries': [
          {
            'range-constraint-query': {
              'constraint-name': 'PublishedDate',
              'range-operator': 'LE',
              'value': new Date().toISOString(),
              'range-option': ['score-function=reciprocal','slope-factor=50']
            }
          },
          {
            'and-query': {
              'queries': []
            }
          }
        ]
      }
    }

  Becomes:

    qb.orQuery(
      qb.rangeConstraintQuery(
        'PublishedDate', 'LE', new Date().toISOString(),
        ['score-function=reciprocal','slope-factor=50']
      ),
      qb.andQuery()
    )

  This:

    {
      'or-query': {
        'queries': [{
          'geospatial-constraint-query': {
            'constraint-name': 'meridian-geo',
            'box': [
              bounds
            ]
          }
        },{
          'geospatial-constraint-query': {
            'constraint-name': 'connect-geo',
            'box': [
              bounds
            ]
          }
        }]
      }
    }

  Becomes:

    qb.orQuery(
      qb.geospatialConstraintQuery('meridian-geo', [bounds]),
      qb.geospatialConstraintQuery('connect-geo', [bounds]),
    )

*/

(function() {
  'use strict';

  angular.module('sample.common')
    .factory('MLSampleQueryBuilder', [function() {
      var andQuery = function () {
        if (arguments.length === 1 && angular.isArray(arguments[0])) {
          return {
            'and-query': {
              'queries': arguments[0]
            }
          };
        } else {
          return {
            'and-query': {
              'queries': Array.prototype.slice.call(arguments)
            }
          };
        }
      };
      return {
        andQuery: andQuery,
        boostQuery: function (matchingQuery, boostingQuery) {
          if (matchingQuery) {
            return {
              'boost-query': {
                'matching-query': matchingQuery,
                'boosting-query': boostingQuery
              }
            };
          } else {
            return {
              'boost-query': {
                'matching-query': andQuery(),
                'boosting-query': boostingQuery
              }
            };
          }
        },
        collectionConstraintQuery: function (constraintName, uris) {
          return {
            'collection-constraint-query': {
              'constraint-name': constraintName,
              'uri': Array.isArray(uris) ? uris : [ uris ]
            }
          };
        },
        customConstraintQuery: function (constraintName, terms) {
          return {
            'custom-constraint-query': {
              'constraint-name': constraintName,
              'text': terms
            }
          };
        },
        customGeospatialConstraintQuery: function (constraintName, annotation, box) {
          return {
            'custom-constraint-query': {
              'constraint-name': constraintName,
              'annotation': annotation,
              'box': box
            }
          };
        },
        documentQuery: function (uris) {
          return {
            'document-query': {
              'uri': Array.isArray(uris) ? uris : [ uris ]
            }
          };
        },
        geospatialConstraintQuery: function (constraintName, boxes) {
          return {
            'geospatial-constraint-query': {
              'constraint-name': constraintName,
              'box': boxes
            }
          };
        },
        operatorState: function (operatorName, stateName) {
          return {
            'operator-state': {
              'operator-name': operatorName,
              'state-name': stateName
            }
          };
        },
        orQuery: function () {
          if (arguments.length === 1 && angular.isArray(arguments[0])) {
            return {
              'or-query': {
                'queries': arguments[0]
              }
            };
          } else {
            return {
              'or-query': {
                'queries': Array.prototype.slice.call(arguments)
              }
            };
          }
        },
        propertiesQuery: function (query) {
          return {
            'properties-query': query
          };
        },
        rangeConstraintQuery: function (constraintName, rangeOperator, value, rangeOptions) {
          if (!rangeOptions) {
            rangeOptions = [];
          }
          if (!rangeOperator) {
            rangeOperator = 'EQ';
          }
          return {
            'range-constraint-query': {
              'constraint-name': constraintName,
              'range-operator': rangeOperator,
              'value': value,
              'range-option': rangeOptions
            }
          };
        },
        structuredQuery: function() {
          if (arguments.length === 1 && angular.isArray(arguments[0])) {
            return {
              'query': {
                'queries': arguments[0]
              }
            };
          } else {
            return {
              'query': {
                'queries': Array.prototype.slice.call(arguments)
              }
            };
          }
        },
        termQuery: function (terms, weight) {
          if (weight) {
            return {
              'term-query': {
                'text': terms,
                'weight': weight
              }
            };
          } else {
            return {
              'term-query': {
                'text': terms
              }
            };
          }
        },
        textQuery: function (text) {
          return {
            'qtext': text
          };
        }
      };
    }]);
}());
