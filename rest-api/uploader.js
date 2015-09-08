/*
 * @(#)uploader.js
 */

/*
 * Author: Jianmin Liu
 * Created: 2015/08/28
 * Description: The uploader module
 */

var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;
var csv = require('csv');
var xml2js = require('xml2js');

var UPLOADER_DIRECTORY = '/uploader/';

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

var uploader = {

  removeAll: function(req, res, marklogic, dbconfig) {
    var directory = req.body['directory'];
    var db = marklogic.createDatabaseClient(dbconfig.connection);

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

    var fileName = req.file.originalname;
    var filePath = path.join(current_dir, req.file.path);
    var mlcp = (process.platform === 'win32') ? 'mlcp.bat' : 'mlcp.sh';
    var cmd = mlcp + 
                  ' import -mode local -host ' + options.mlHost + 
                  ' -port ' + options.mlPort +
                  ' -username ' + req.session.user.name +
                  ' -password ' + req.session.user.password +
                  ' -input_file_path ' + filePath;
    var keys = Object.keys(req.body);
    keys.forEach(function(key) {
      cmd += ' -' + key + ' ' + req.body[key];
    });

    console.log(cmd);

    if (endsWith(fileName, '.csv')) {
      var parser = csv.parse({delimiter: ','}, function(err, data){
        console.log(data);
      });
      fs.createReadStream(filePath).pipe(parser);
    } else if (endsWith(fileName, '.xml')) {
      // You can create one xml2js.Parser per file.
      var parser = new xml2js.Parser();
      fs.readFile(filePath, function(err, data) {
        parser.parseString(data, function(err, result) {
          console.dir(result);
          console.log(JSON.stringify(result));
          console.log(result.persons.person[0]);
          console.log(result.persons.person[1]);
          console.log('Done');
        });
      });
    }

    res.json({
      success: true,
      message: message
    });

    var child = exec(cmd, function(error, stdout, stderr) {
      // Remove new line characters in stderr
      var message = stderr.replace(/\r?\n|\r/g, '<br/>');

      // On success, error will be null. On error, error will be 
      // an instance of Error and error.code will be the exit 
      // code of the child process.
      if (error !== null) {
        message += 'Error Code: ' + error.code;
      }

      // Delete the uploaded file.
      fs.unlink(filePath, function(err) {
        res.json({
          success: true,
          message: message
        });
      });

    });
  },

  load: function(req, res, current_dir, options) {
    console.log(req.body);

    var fileName = req.body['input_file_name'];
    var filePath = req.body['input_file_path'];
    var mlcp = (process.platform === 'win32') ? 'mlcp.bat' : 'mlcp.sh';
    var cmd = mlcp + 
                  ' import -mode local -host ' + options.mlHost + 
                  ' -port ' + options.mlPort +
                  ' -username ' + req.session.user.name +
                  ' -password ' + req.session.user.password +
                  ' -input_file_path ' + req.body['input_file_path'] + 
                  ' -output_uri_prefix ' + req.body['output_uri_prefix'];

    if (endsWith(fileName, '.csv')) {
      cmd += ' -delimited_root_name ' + req.body['delimited_root_name'] +
             ' -delimited_uri_id ' + req.body['delimited_uri_id'];
    } else if (endsWith(fileName, '.xml')) {
      cmd += ' -aggregate_record_element ' + req.body['aggregate_record_element'] +
             ' -aggregate_uri_id ' + req.body['aggregate_uri_id'];
    } else {
      // error
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

      // Delete the uploaded file.
      fs.unlink(filePath, function(err) {
        res.json({
          success: true,
          message: message
        });
      });

    });
  }
}

module.exports = uploader;
