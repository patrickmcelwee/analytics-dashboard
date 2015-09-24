/*
 * @(#)claim.js
 */

/*
 * Author: Jianmin Liu
 * Created: 2015/07/30
 * Description: The claim module
 */

var Util = require('./utils.js');

var CLAIM_DIRECTORY = '/claim/';

function performSimpleSearch(params, req, res, marklogic, dbconfig) {
  var q = params['q'];
  var claims = [];
  var db = marklogic.createDatabaseClient(Util.getConnection(dbconfig, req));
  var qb = marklogic.queryBuilder;
  var query = null;

  if (q) {
    query = db.documents.query(
      qb.where(
        qb.directory(CLAIM_DIRECTORY), 
        qb.parsedFrom(q)
      ).slice(qb.transform('claim-json')));
  } else {
    query = db.documents.query(
      qb.where(
        qb.directory(CLAIM_DIRECTORY)
      ).slice(qb.transform('claim-json')));
  }

  query.result(function(documents) {
    documents.forEach(function(document) {
      var claim = {};

      claim.uri = document.uri;
      claim.content = JSON.parse(document.content);

      claims.push(claim);
    });

    res.json({
      success: true,
      message: 'OK',
      claims: claims
    });
  }, function(error) {
    res.json({
      success: false,
      message: 'ERROR',
      claims: claims
    });
  });
}

exports.init = function(router, marklogic, dbconfig) {

  router.route('/claim').delete(function(req, res) {
    var uri = req.body['uri'];
    var db = marklogic.createDatabaseClient(Util.getConnection(dbconfig, req));

    if (uri) {
      // Removes a claim document by uri
      db.documents.remove(uri).result(function(response) {
        // remove always returns success
        res.json({
          success: true,
          message: 'The claim has been removed',
          claim: uri
        });
      });
    } else {
      // Removes all claims
      db.documents.removeAll({directory: CLAIM_DIRECTORY}).result(function(response) {
        // remove always returns success
        res.json({
          success: true,
          message: 'All claims have been removed'
        });
      });
    }
  });

  router.route('/claims').get(function(req, res) {
    performSimpleSearch(req.params, req, res, marklogic, dbconfig);
  });

  router.route('/claims').post(function(req, res) {
    performSimpleSearch(req.body, req, res, marklogic, dbconfig);
  });

};
