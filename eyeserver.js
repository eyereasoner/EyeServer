#!/usr/bin/env node

var express = require('express'),
    eye = require('./eye');

var app = exports.server = express.createServer();

app.start = function(port, host) {
  port = port || 8000;
  host = host || '127.0.0.1';
  this.listen(port);
  console.log('EYE server running on http://' + host + ':' + port);
}

app.get(/^\/$/, function (req, res, next) {
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

app.start(process.env.PORT, process.env.HOST);
