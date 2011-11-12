var express = require('express'),
    eye = require('./eye');

function EyeServer() {
  eyeServer = express.createServer();
  eyeServer.constructor = EyeServer;
  eyeServer.prototype = EyeServer.prototype;
  
  eyeServer.get(/^\/$/, function (req, res, next) {
    var query = req.query,
        data = req.query.data.split(',');

    eye.pass(data,
      function (result) {
        res.header('Content-Type', 'text/n3');
        res.send(result + '\n');
      },
      function (error) {
        res.header('Content-Type', 'text/plain');
        res.send(error + '\n', 400);
      }
    );
  });
  
  return eyeServer;
}

EyeServer.prototype = express.createServer();

module.exports = EyeServer;
