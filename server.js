/*jshint node: true */

/*
 * @author Dave Cassel - https://github.com/dmcassel
 *
 * This file configures the publicly visible server-side endpoints of your application. Work in this file to allow
 * access to parts of the MarkLogic REST API or to configure your own application-specific endpoints.
 * This file also handles session authentication, with authentication checks done by attempting to access MarkLogic.
 */

var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var http = require('http');
var querystring = require('querystring');

function getAuth(options, session) {
  'use strict';

  if (session.user !== undefined && session.user.name !== undefined) {
    return session.user.name + ':' + session.user.password;
  } else {
    return options.defaultUser + ':' + options.defaultPass;
  }
}

exports.buildExpress = function(options) {
  'use strict';

  var express = require('express');
  var multer  = require('multer');
  var upload = multer({dest: 'uploads/'})
  var app = express();

  app.use(cookieParser());
  // Change this secret to something unique to your application
  app.use(expressSession({
    secret: '1234567890QWERTY',
    saveUninitialized: true,
    resave: true
  }));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({
    extended: true
  }));

  var current_dir = __dirname;

  // Generic proxy function used by multiple HTTP verbs
  function proxy(req, res) {
    var queryString = req.originalUrl.split('?')[1];

    console.log(req.method + ' ' + req.path + ' proxied to ' + options.mlHost + ':' + options.mlPort + req.path + (queryString ? '?' + queryString : ''));

    if (queryString) {
      var params = querystring.parse(queryString);
      var category = params['category'];
      // Can use the 'category' parameter only with multipart/mixed accept.
      if (category) {
        var multipartHeader = 'multipart/mixed';
        if (req.headers['accept']) {
          req.headers['accept'] = multipartHeader;
        } else if (req.headers['Accept']) {
          req.headers['Accept'] = multipartHeader;
        }
      }
    }

    var mlReq = http.request({
      hostname: options.mlHost,
      port: options.mlPort,
      method: req.method,
      path: req.path + (queryString ? '?' + queryString : ''),
      headers: req.headers,
      auth: getAuth(options, req.session)
    }, function(response) {
      // some requests (POST /v1/documents) return a location header. Make sure
      // that gets back to the client.
      if (response.headers.location) {
        res.header('location', response.headers.location);
      }

      if (response.headers['content-type']) {
        res.header('content-type', response.headers['content-type']);
      }

      response.on('data', function(chunk) {
        res.write(chunk);
      });
      response.on('end', function() {
        res.end();
      });
    });

    if (req.body !== undefined) {
      mlReq.write(JSON.stringify(req.body));
      mlReq.end();
    }

    mlReq.on('error', function(e) {
      console.log('Problem with request: ' + e.message);
    });
  }

  app.get('/user/status', function(req, res) {
    if (req.session.user === undefined) {
      res.send('{"authenticated": false}');
    } else {
      res.send({
        authenticated: true,
        username: req.session.user.name,
        profile: req.session.user.profile
      });
    }
  });

  app.get('/user/login', function(req, res) {
    // Attempt to read the user's profile, then check the response code.
    // 404 - valid credentials, but no profile yet
    // 401 - bad credentials
    var login = http.get({
      hostname: options.mlHost,
      port: options.mlPort,
      path: '/v1/documents?uri=/users/' + req.query.username + '.json',
      headers: req.headers,
      auth: req.query.username + ':' + req.query.password
    }, function(response) {
      if (response.statusCode === 401) {
        res.statusCode = 401;
        res.send('Unauthenticated');
      } else if (response.statusCode === 404) {
        // authentication successful, but no profile defined
        req.session.user = {
          name: req.query.username,
          password: req.query.password
        };
        res.send(200, {
          authenticated: true,
          username: req.query.username
        });
      } else {
        if (response.statusCode === 200) {
          // authentication successful, remember the username
          req.session.user = {
            name: req.query.username,
            password: req.query.password
          };
          response.on('data', function(chunk) {
            var json = JSON.parse(chunk);
            if (json.user !== undefined) {
              req.session.user.profile = {
                fullname: json.user.fullname,
                emails: json.user.emails
              };
              res.status(200).send({
                authenticated: true,
                username: req.query.username,
                profile: req.session.user.profile
              });
            } else {
              console.log('did not find chunk.user');
            }
          });
        }
      }
    });

    login.on('error', function(e) {
      console.log('login failed: ' + e.statusCode);
    });
  });

  app.get('/user/logout', function(req, res) {
    delete req.session.user;
    res.send();
  });

  // ==================================
  // MarkLogic REST API endpoints
  // ==================================
  // For any other GET request, proxy it on to MarkLogic.
  app.get('/v1*', function(req, res) {
    proxy(req, res);

    // To require authentication before getting to see data, use this:
    // if (req.session.user === undefined) {
    //   res.send(401, 'Unauthorized');
    // } else {
    //   proxy(req, res);
    // }
    // -- end of requiring authentication

  });

  app.put('/v1*', function(req, res) {
    // For PUT requests, require authentication
    if (req.session.user === undefined) {
      res.send(401, 'Unauthorized');
    } else if (req.path === '/v1/documents' &&
      req.query.uri.match('/users/') &&
      req.query.uri.match(new RegExp('/users/[^(' + req.session.user.name + ')]+.json'))) {
      // The user is try to PUT to a profile document other than his/her own. Not allowed.
      res.send(403, 'Forbidden');
    } else {
      if (req.path === '/v1/documents' && req.query.uri.match('/users/')) {
        // TODO: The user is updating the profile. Update the session info.
      }
      proxy(req, res);
    }
  });

  // Require authentication for POST requests
  app.post('/v1*', function(req, res) {
    if (req.session.user === undefined) {
      res.send(401, 'Unauthorized');
    } else {
      proxy(req, res);
    }
  });

  // Require authentication for POST requests
  app.delete('/v1*', function(req, res) {
    if (req.session.user === undefined) {
      res.send(401, 'Unauthorized');
    } else {
      proxy(req, res);
    }
  });

  // Load the report module
  var router = express.Router();
  var marklogic = require('marklogic');
  var dbconfig = {
    connection: {
      host: options.mlHost,
      port: options.mlPort,
      user: null,
      password: null
    }
  };
  var report = require('./rest-api/routes/report.js');
  report.init(router, marklogic, dbconfig);

  var claim = require('./rest-api/routes/claim.js');
  claim.init(router, marklogic, dbconfig);

  var uploader = require('./rest-api/routes/uploader.js');
  app.post('/api/mlcp/upload', upload.single('data'), function(req, res, next) {
    uploader.upload(req, res, current_dir, options);
  });

  app.post('/api/mlcp/load', function(req, res, next) {
    uploader.load(req, res, current_dir, options);
  });

  app.post('/api/mlcp/remove', function(req, res, next) {
    uploader.removeAll(req, res, marklogic, dbconfig);
  });

  function handleApiAuth(req, res, next) {
    if (req.session.user === undefined) {
      res.send('{"authenticated": false}');
    } else {
      next();
    }
  }

  app.route('/api/*').all(handleApiAuth);
  app.use('/api', router);

  // Redirect all other traffic to Angular
  app.use(express.static(__dirname + '/ui/app'));
  app.use('/*', express.static(__dirname + '/ui/app'));

  return app;
};
