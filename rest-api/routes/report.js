/*
 * @(#)report.js
 */

/*
 * Author: Jianmin Liu
 * Created: 2015/07/19
 * Description: The report module
 */

var async = require('async');
var uuid = require('uuid');

var REPORT_DIRECTORY = '/report/';

function getReportUri(id) {
  var uri = REPORT_DIRECTORY + id + '.json';
  return uri;
}

// Retrieves a report
function selectReport(pname, pvalue, data, callback, marklogic, dbconfig) {
  var db = marklogic.createDatabaseClient(dbconfig.connection);
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
      report.department = document.content.department;
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
  var department = req.body.department;

  // This is the key for the report.
  var uri = getReportUri(id);
  var reportDoc = [
    { uri: uri,
      content: {
        id: id,
        name: name,
        description: description,
        department: department
      }
    }
  ];

  var db = marklogic.createDatabaseClient(dbconfig.connection);

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
  var department = req.body.department;
  var widgets = req.body.widgets;

  var reportDoc = [
    { uri: uri,
      content: {
        name: name,
        description: description,
        department: department,
        widgets: widgets
      }
    }
  ];

  var db = marklogic.createDatabaseClient(dbconfig.connection);

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
function performSimpleSearch(params, res, marklogic, dbconfig) {
  var q = params['q'];
  var reports = [];
  var db = marklogic.createDatabaseClient(dbconfig.connection);
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
      report.department = document.content.department;

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

function generateChartData(params, res, marklogic, dbconfig) {
  var directory = params['directory'];
  var xaxis = params['xaxis'];
  var yaxis = params['yaxis'];
  var db = marklogic.createDatabaseClient(dbconfig.connection);
  var qb = marklogic.queryBuilder;

//console.log(params);
//console.log('directory: ' + directory);
//console.log('xaxis: ' + xaxis);
//console.log('yaxis: ' + yaxis);

  db.documents.query(
    qb.where(qb.directory('/' + directory + '/'))
      .calculate(qb.facet(xaxis))
      .withOptions({categories: 'none'})
  ).result(function(results) {
    //console.log(JSON.stringify(results, null, 2));
    res.json({
      success: true,
      message: 'OK',
      results: results
    });
  }, function(error) {
    console.log(JSON.stringify(error, null, 2));
    res.json({
      success: false,
      message: 'Failed to perform faceted search'
    });
  });
/*
  var vb = marklogic.valuesBuilder;
  db.values.read(
    vb.fromIndexes('cost')
      .aggregates('sum')
      .slice(0)
  ).result(function(results) {
    console.log(JSON.stringify(results, null, 2));
  }, function(error) {
    console.log(JSON.stringify(error, null, 2));
  });

  db.values.read(
    vb.fromIndexes('department', 'cost')
  ).result(function(result) {
    console.log(JSON.stringify(result, null, 2));
  }, function(error) {
    console.log(JSON.stringify(error, null, 2));
  });
*/
}

exports.init = function(router, marklogic, dbconfig) {

  router.route('/report').post(function(req, res) {
    var data = {};
    var asyncTasks = [];

    // We don't actually execute the async action here
    // We add functions containing it to an array of "tasks"
    asyncTasks.push(function(callback) {
      selectReport('name', req.body.name, data, callback, marklogic, dbconfig);
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
    var db = marklogic.createDatabaseClient(dbconfig.connection);

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
    performSimpleSearch(req.params, res, marklogic, dbconfig);
  });

  router.route('/reports').post(function(req, res) {
    performSimpleSearch(req.body, res, marklogic, dbconfig);
  });

  router.route('/smartchart').post(function(req, res) {
    generateChartData(req.body, res, marklogic, dbconfig);
  });

  router.route('/metadata/:directory').get(function(req, res) {
    var directory = req.params.directory;;

    if (directory === 'claim') {
      res.json({
        success: true,
        message: 'OK',
        directory: directory,
        transform: 'smart-filter',
        properties: [{
          name: 'DESYNPUF_ID',
          type: 'string',
          classification: 'element',
          ns: ''
        },{
          name: 'CLM_PMT_AMT',
          type: 'number',
          classification: 'element',
          ns: ''
        },{
          name: 'NCH_PRMRY_PYR_CLM_PD_AMT',
          type: 'number',
          classification: 'element',
          ns: ''
        },{
          name: 'NCH_BENE_IP_DDCTBL_AMT',
          type: 'number',
          classification: 'element',
          ns: ''
        },{
          name: 'CLM_UTLZTN_DAY_CNT',
          type: 'number',
          classification: 'element',
          ns: ''
        }]
      });
    } else if (directory === 'report') {
      res.json({
        success: true,
        message: 'OK',
        directory: directory,
        transform: 'smart-filter',
        properties: [{
          name: 'name',
          type: 'string',
          classification: 'json-property'
        },{
          name: 'description',
          type: 'string',
          classification: 'json-property'
        },{
          name: 'department',
          type: 'string',
          classification: 'json-property'
        }]
      });
    } else {
        res.json({
        success: true,
        message: 'OK',
        directory: directory,
        properties: []
      });
    }
  });

};
