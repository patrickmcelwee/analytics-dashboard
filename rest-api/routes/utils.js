/*
 * @(#)utils.js
 */

/*
 * Author: Jianmin Liu
 * Created: 2015/07/30
 * Description: The utils module
 */

var utils = {

  getConnection: function(dbconfig, req) {
    var connection = {
      host: dbconfig.connection.host,
      port: dbconfig.connection.port,
      user: req.session.user.name,
      password: req.session.user.password
    };

    return connection;
  }
}

module.exports = utils;
