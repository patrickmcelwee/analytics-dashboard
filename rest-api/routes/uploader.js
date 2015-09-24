/*
 * @(#)uploader.js
 */

/*
 * Author: Jianmin Liu
 * Created: 2015/08/28
 * Description: The uploader module
 */

var Util = require('./utils.js');
var fs = require('fs');
var path = require('path');
var http = require('http');
var digestClient = require('http-digest-client');
var exec = require('child_process').exec;
var csv = require('csv');
var xml2js = require('xml2js');

var UPLOADER_DIRECTORY = '/uploader/';

function makeIndexes(fields) {
  var indexes = [];

  fields.forEach(function(field) {
    var index = {
      'scalar-type': 'string',
      'namespace-uri': '',
      'localname': field,
      'collation': 'http://marklogic.com/collation/codepoint',
      'range-value-positions': false,
      'invalid-values': 'ignore'
    };

    indexes.push(index);
  });

  var obj = {
   'range-element-index': indexes
  };

  return obj;
}

function saveFields(fields) {
  var obj = makeIndexes(fields);

  fs.writeFile("index.json", JSON.stringify(obj, null, 2), function(err) {
    console.log("The file was saved!");
  }); 
}

function isValidFileType(type) {
  if (type === 'csv' || type === 'xml' || type === 'json') {
    return true;
  } else {
    return false;
  }
}

function startsWith(str, prefix) {
  return str.slice(0, prefix.length) == prefix;
}
 
function endsWith(str, suffix) {
  return str.slice(-suffix.length) == suffix;
}

function cleanup(res, filepath, message) {
  fs.unlink(filepath, function(err) {
    res.json({
      success: true,
      message: message
    });
  });
}

// Authorization: 
// Digest username="admin", 
// realm="public", 
// nonce="12c2f5945e5dfbfe0eb07cab5d31f96b", 
// uri="/manage/v2/databases/analytics-dashboard-content/properties", 
// response="4394f6634650a37635190b564a6d242d", 
// opaque="51a1a2547c74dea8", 
// qop=auth, nc=00000001, cnonce="723810329ed73e3b"

// Gets the range indexes in the database properties.
function getIndexes(req, res, options, jobj) {
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
      var indexes = obj['range-element-index'];

      if (!indexes)
        indexes = [];
      jobj.importer.indexes = { 'range-element-index': indexes };

      res.json(jobj);
    });

    finalRes.on('error', function(err) {
      jobj.importer.indexes = { 'range-element-index': [] };

      res.json(jobj);
    });
  });
}

var uploader = {

  removeAll: function(req, res, marklogic, dbconfig) {
    var directory = req.body['directory'];
    var db = marklogic.createDatabaseClient(Util.getConnection(dbconfig, req));

    if (directory) {
      // Removes all documents
      db.documents.removeAll({directory: directory}).result(function(response) {
        res.json({
          success: true,
          message: 'All documents have been removed'
        });
      });
    }
  },

  upload: function(req, res, current_dir, options) {
    // req.body holds the text fields, if there were any
    //console.log(req.body);
    // req.file is the data file
    //console.log(req.file);

    var filename = req.file.originalname;
    var filepath = path.join(current_dir, req.file.path);
    var isCsvFile = endsWith(filename, '.csv');

    if (isCsvFile || endsWith(filename, '.xml')) {
      var jobj = {
        success: true,
        importer: {
          filename: filename,
          filepath: filepath
        }
      };

      if (isCsvFile) {
        var parser = csv.parse({delimiter: ','}, function(err, data) {
          //console.log(data);

          jobj.importer.filetype = 'csv';
          jobj.importer.directory = '';
          jobj.importer.element = '';

          var fields = data[0];
          jobj.importer.fields = fields;
          jobj.importer.uri_id = fields[0];

          //saveFields(fields);

          getIndexes(req, res, options, jobj);
        });
        fs.createReadStream(filepath).pipe(parser);
      } else {
        // You can create one xml2js.Parser per file.
        var parser = new xml2js.Parser();
        fs.readFile(filepath, function(err, data) {
          parser.parseString(data, function(err, result) {
            //console.dir(result);
            //console.log(JSON.stringify(result));
            //console.log(result.persons.person[0]);
            //console.log(result.persons.person[1]);

            jobj.importer.filetype = 'xml';

            var directory = Object.keys(result)[0];
            jobj.importer.directory = '/' + directory + '/';

            var value = result[directory];
            jobj.importer.element = Object.keys(value)[0];

            var fields = Object.keys(value[jobj.importer.element][0]);
            jobj.importer.fields = fields;
            jobj.importer.uri_id = fields[0];

            getIndexes(req, res, options, jobj);
          });
        });
      }
    } else {
      res.json({
        success: false,
        message: 'file not supported'
      });
    }
  },

  load: function(req, res, current_dir, options) {
    var filename = req.body['filename'];
    var filepath = req.body['filepath'];
    var mlcp = (process.platform === 'win32') ? 'mlcp.bat' : 'mlcp.sh';
    var cmd = mlcp + 
                  ' import -mode local -host ' + options.mlHost + 
                  ' -port ' + options.mlPort +
                  ' -username ' + req.session.user.name +
                  ' -password ' + req.session.user.password +
                  ' -input_file_path ' + filepath + 
                  ' -output_uri_prefix ' + req.body['directory'] + 
                  ' -output_uri_suffix .xml';

    var isCsvFile = endsWith(filename, '.csv');
    if (isCsvFile || endsWith(filename, '.xml')) {
      if (isCsvFile) {
        cmd += ' -input_file_type delimited_text ' + 
               ' -delimited_root_name ' + req.body['element'] +
               ' -delimited_uri_id ' + req.body['uri_id'];
      } else {
        cmd += ' -input_file_type aggregates ' + 
               ' -aggregate_record_element ' + req.body['element'] +
               ' -aggregate_uri_id ' + req.body['uri_id'];
      }
    } else {
      res.json({
        success: false,
        message: 'file not supported'
      });
    }

    console.log(cmd);

    var child = exec(cmd, function(error, stdout, stderr) {
      // Replace new line characters in stderr with <br/>
      var message = stderr.replace(/\r?\n|\r/g, '<br/>');

      // On success, error will be null. On error, error will be 
      // an instance of Error and error.code will be the exit 
      // code of the child process.
      if (error !== null) {
        message += 'Error Code: ' + error.code;
      }

      // Sets the range indexes in the database properties.
      var indexes = req.body['indexes'];

      // Uncomment this to create indexes for all fields.
      //var indexes = makeIndexes(req.body['fields']);

      // Uncomment this to remove all indexes.
      //var indexes = {
      //  'range-element-index': []
      //};

      if (indexes) {
        var digest = digestClient(req.session.user.name, req.session.user.password);
        var apipath = '/manage/v2/databases/' + options.database + '/properties?format=json';
        digest.request({
          host: options.mlHost,
          path: apipath,
          port: 8002, // 8002
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' }
        }, JSON.stringify(indexes), function(finalRes) {
          var body = '';
          // The status code is 204 upon success
          // In order to be as supportive of the client as 
          // possible, a REST API should not return 
          // 204 (No Content) responses.
          //console.log(finalRes.headers);
          //console.log(finalRes.statusCode);
          //console.log(finalRes.statusMessage);
          finalRes.on('data', function(data) {
            body += data;
          });

          finalRes.on('end', function() {
            console.log('manage: ' + body);
            cleanup(res, filepath, message);
          });

          finalRes.on('error', function(err) {
            cleanup(res, filepath, message);
          });
        });
      } else {
        cleanup(res, filepath, message);
      }
    });
  }
}

module.exports = uploader;
