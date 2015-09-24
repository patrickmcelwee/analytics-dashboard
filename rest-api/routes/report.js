/*
 * @(#)report.js
 */

/*
 * Author: Jianmin Liu
 * Created: 2015/07/19
 * Description: The report module
 */

var Util = require('./utils.js');
var async = require('async');
var uuid = require('uuid');
var csv = require('csv');

var REPORT_DIRECTORY = '/report/';

function getReportUri(id) {
  var uri = REPORT_DIRECTORY + id + '.json';
  return uri;
}

// Retrieves a report
function selectReport(pname, pvalue, data, callback, marklogic, dbconfig, req) {
  var db = marklogic.createDatabaseClient(Util.getConnection(dbconfig, req));
  var qb = marklogic.queryBuilder;
  var criteria = {};

  criteria[pname] = pvalue;

  db.documents.query(
    qb.where(qb.byExample(criteria))
  ).result(function(documents) {
    if (documents.length === 1) {
      var document = documents[0];
      var report = {};

      // Returns all fields in the content.
      report.uri = document.uri;
      report.name = document.content.name;
      report.description = document.content.description;
      report.classification = document.content.classification;
      report.widgets = document.content.widgets;

      data.report = report;
      callback(null, data);
    } else {
      // report not found
      data.report = null;
      callback(null, data);
    }
  }, function(error) {
    callback(new Error(JSON.stringify(error)));
  });
}

// Creates a new report
function createReport(req, res, data, callback, marklogic, dbconfig) {
  var id = uuid.v4();
  var name = req.body.name;
  var description = req.body.description;
  var classification = req.body.classification;

  // This is the key for the report.
  var uri = getReportUri(id);
  var reportDoc = [
    { uri: uri,
      content: {
        id: id,
        name: name,
        description: description,
        classification: classification
      }
    }
  ];

  var db = marklogic.createDatabaseClient(Util.getConnection(dbconfig, req));

  db.documents.write(reportDoc).result( 
    function(response) {
      data.report = reportDoc[0].content;
      callback(null, data);
    }, function(error) {
      console.log(JSON.stringify(error));
      callback(error);
    }
  );
}

// Updates a report
function updateReport(req, res, callback, marklogic, dbconfig) {
  var uri = req.body.uri;
  var name = req.body.name;
  var description = req.body.description;
  var classification = req.body.classification;
  var widgets = req.body.widgets;

  var reportDoc = [
    { uri: uri,
      content: {
        name: name,
        description: description,
        classification: classification,
        widgets: widgets
      }
    }
  ];

  var db = marklogic.createDatabaseClient(Util.getConnection(dbconfig, req));

  db.documents.write(reportDoc).result( 
    function(response) {
      callback(null, reportDoc[0].content);
    }, function(error) {
      console.log(JSON.stringify(error));
      callback(error);
    }
  );
}

// Processes search request
function performSimpleSearch(params, req, res, marklogic, dbconfig) {
  var q = params['q'];
  var reports = [];
  var db = marklogic.createDatabaseClient(Util.getConnection(dbconfig, req));
  var qb = marklogic.queryBuilder;
  var query = null;

  if (q) {
    query = db.documents.query(
      qb.where(
        qb.directory(REPORT_DIRECTORY), 
        qb.parsedFrom(q)
      ));
  } else {
    query = db.documents.query(
      qb.where(
        qb.directory(REPORT_DIRECTORY)
      ));
  }

  query.result(function(documents) {
    documents.forEach(function(document) {
      var report = {};

      report.uri = document.uri;
      report.id = document.content.id;
      report.name = document.content.name;
      report.description  = document.content.description;
      report.classification = document.content.classification;

      reports.push(report);
    });

    res.json({
      success: true,
      message: 'OK',
      reports: reports
    });
  }, function(error) {
    console.log(JSON.stringify(error));
    res.json({
      success: false,
      message: 'ERROR',
      reports: reports
    });
  });
}

exports.init = function(router, marklogic, dbconfig) {

  router.route('/report').post(function(req, res) {
    var data = {};
    var asyncTasks = [];

    // We don't actually execute the async action here
    // We add functions containing it to an array of "tasks"
    asyncTasks.push(function(callback) {
      selectReport('name', req.body.name, data, callback, marklogic, dbconfig, req);
    });

    asyncTasks.push(function(data1, callback) {
      if (data1.report) {
        callback(new Error('report exists'));
      } else {
        createReport(req, res, data1, callback, marklogic, dbconfig);
      }
    });

    // Now we have an array of functions doing async tasks
    // Execute all async tasks in the asyncTasks array
    async.waterfall(asyncTasks, function(err, result) {
      // All tasks are done now   
      if (err) {
        res.json({
          success: false,
          message: err.message
        });
      } else {
        res.json({
          success: true,
          message: 'report created',
          report: result.report
        });
      }
    });
  });

  router.route('/report').put(function(req, res) {
    var asyncTasks = [];

    asyncTasks.push(function(callback) {
      updateReport(req, res, callback, marklogic, dbconfig);
    });

    async.waterfall(asyncTasks, function(err, result) {
      // All tasks are done now
      if (err) {
        res.json({
          success: false,
          message: err.message
        });
      } else {
        res.json({
          success: true,
          message: 'report updated',
          report: result
        });
      }
    });
  });

  router.route('/report/:uri').delete(function(req, res) {
    var uri = req.params.uri;
    var db = marklogic.createDatabaseClient(Util.getConnection(dbconfig, req));

    // Removes a report document by uri
    db.documents.remove(uri).result(function(response) {
      // remove always returns success
      res.json({
        success: true,
        message: 'report deleted',
        report: uri
      });
    });
  });

  router.route('/reports').get(function(req, res) {
    performSimpleSearch(req.params, req, res, marklogic, dbconfig);
  });

  router.route('/reports').post(function(req, res) {
    performSimpleSearch(req.body, req, res, marklogic, dbconfig);
  });

  // Prepare a report for download
  router.route('/report/prepare').post(function(req, res) {
    var uri = req.body.uri;
    var name = req.body.name;
    var data = req.body.data;

    // If a CSV file has ID as the first two chars on the header row, when
    // you open this file using Excel, Excel will detect that this file is 
    // a SYLK file, but can still load it.
    // If you surround the characters with double quotes it should work fine.
    csv.stringify(data, {quoted: true}, function(err, output) {
      req.session.report = output;

      res.json({
        success: true,
        message: 'OK'
      });
    });

  });

  router.route('/report/download').get(function(req, res) {
    res.setHeader('Content-Disposition', 'attachment; filename=report.csv');
    res.writeHead(200, {
        'Content-Type': 'text/csv'
    });

    res.write(req.session.report);
    res.end();

    delete req.session.report;
  });

};
