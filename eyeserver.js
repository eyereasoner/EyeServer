var express = require('express'),
    eye = require('./eye');

function EyeServer(options) {
  options = options || {};
  
  eyeServer = express.createServer();
  eyeServer.constructor = EyeServer;
  eyeServer.prototype = EyeServer.prototype;
  
  eyeServer.get(/^\/$/, function (req, res, next) {
    var reqParams = req.query,
        data = reqParams.data || [],
        query = reqParams.query,
        settings = {};
    
    // collect data and data URIs
    if(typeof(data) === 'string')
      settings.data = data.split(',');
    else {
      settings.data = [];
      // inspect all data parameters in request parameters
      data.forEach(function(item){
        if(!item.match(/^https?:\/\//))
          // item is N3 data – push it
          settings.data.push(item);
        else
          // item is list of URIs – push each of them
          settings.data.push.apply(settings.data, item.split(','));
      });
    }
    
    // do a reasoner pass by default
    settings.pass = true;
    
    // add query if present
    if(typeof(query) === 'string') {
      settings.query = query;
      delete settings.pass;
    }

    // add debug information if requested
    if(options.debug)
      settings.originalUrl = req.originalUrl;

    // execute the reasoner and return result or error
    (options.eye || eye).execute(settings, function (error, result) {
      if(!error) {
        res.header('Content-Type', 'text/n3');
        res.send(result + '\n');
      }
      else {
        res.header('Content-Type', 'text/plain');
        res.send(error + '\n', 400);
      }
    });
  });
  
  return eyeServer;
}

module.exports = EyeServer;
