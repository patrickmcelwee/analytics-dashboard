/*
 * @(#)database.js
 */

/*
 * Author: Jianmin Liu
 * Created: 2015/12/02
 * Description: The database module
 */

var Util = require('./utils.js');
var fs = require('fs');
var path = require('path');
var http = require('http');
var digestClient = require('http-digest-client');

// Gets the database's properties.
function getProperties(req, res, options, jobj) {
  var digest = digestClient(req.session.user.name, req.session.user.password);
  var apipath = '/manage/v2/databases/' + options.database + '/properties?format=json';
  digest.request({
    host: options.mlHost,
    path: apipath,
    port: 8002, // 8002
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  }, null, function(finalRes) {
    var body = '';

    finalRes.on('data', function(data) {
      body += data;
    });

    finalRes.on('end', function() {
      // Data reception is done, do whatever with it!
      var obj = JSON.parse(body);

      jobj.success = true;
      jobj.database = obj;

      res.json(jobj);
    });

    finalRes.on('error', function(err) {
      jobj.success = false;
      jobj.message = error.code;
      jobj.database = {};

      res.json(jobj);
    });
  });
}

var uploader = {

  getProperties: function(req, res, current_dir, options) {
      var jobj = {};
      getProperties(req, res, options, jobj);
  },

  updateProperties: function(req, res, current_dir, options) {
    var indexes = req.body['indexes'];
    var digest = digestClient(req.session.user.name, req.session.user.password);
    var apipath = '/manage/v2/databases/' + options.database + '/properties?format=json';

    digest.request({
      host: options.mlHost,
      path: apipath,
      port: 8002,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify(indexes), function(finalRes) {
      var body = '';
      finalRes.on('data', function(data) {
        body += data;
      });
      finalRes.on('end', function() {
        res.json({
          success: true,
          message: body
        });
      });

      finalRes.on('error', function(err) {
        res.json({
          success: false,
          message: err.code
        });
      });
    });
  }
}

module.exports = uploader;
