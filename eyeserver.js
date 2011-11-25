var express = require('express'),
    Eye = require('./eye');

var eyeFlagNames = {};
Eye.flagNames.forEach(function (option) {
  eyeFlagNames[option.toLowerCase()] = option;
});

function EyeServer(options) {
  // dummy constructor to enable EyeServer construction without new
  function F() {};
  F.prototype = EyeServer.prototype;
  
  // create new EyeServer, inheriting from express.HTTPServer
  eyeServer = new F();
  eyeServer.constructor = EyeServer;
  express.HTTPServer.call(eyeServer, []);
  
  // apply settings and defaults
  eyeServer.settings = options || {};
  eyeServer.settings.eye = eyeServer.settings.eye || new Eye();
  
  // initialize server
  eyeServer.use(express.bodyParser());
  eyeServer.get (/^\/$/, proxy(eyeServer, eyeServer.handleEyeRequest));
  eyeServer.post(/^\/$/, proxy(eyeServer, eyeServer.handleEyeRequest));
  eyeServer.options(/^\/$/, proxy(eyeServer, eyeServer.handleEyeOptionsRequest));
  
  return eyeServer;
}

EyeServer.prototype = {
  constructor: EyeServer,
  
  // inherit from express.HTTPServer
  __proto__: express.HTTPServer.prototype,
  
  handleEyeRequest: function (req, res, next) {
    var self = this,
        reqParams = req.query,
        body = req.body || {},
        data = reqParams.data || [],
        query = reqParams.query || body.query,
        jsonpCallback = reqParams.callback,
        eyeParams = {};
    
    // make sure data is an array
    if(typeof(data) === 'string')
      data = data.split(',');
    
    // add body data
    if(typeof(body.data) === 'string')
      data.push(body.data);
    else if(body.data instanceof Array)
      data.push.apply(data, body.data);
    
    // collect data and data URIs
    eyeParams.data = [];
    // inspect all data parameters in request parameters
    data.forEach(function (item) {
      if(!item.match(/^https?:\/\//))
        // item is N3 data – push it
        eyeParams.data.push(item);
      else
        // item is list of URIs – push each of them
        eyeParams.data.push.apply(eyeParams.data, item.split(','));
    });
    
    // do a reasoner pass by default
    eyeParams.pass = true;
    
    // add query if present
    if(query) {
      eyeParams.query = query;
      delete eyeParams.pass;
    }
    
    // add boolean flags
    for(var param in reqParams) {
      var eyeFlagName = eyeFlagNames[param.replace(/-/g, '').toLowerCase()];
      if(eyeFlagName)
        eyeParams[eyeFlagName] = !reqParams[param].match(/^0|false$/i);
    }

    // add debug information if requested
    if(this.settings.debug)
      eyeParams.originalUrl = req.originalUrl;

    // execute the reasoner and return result or error
    this.settings.eye.execute(eyeParams, function (error, result) {
      if(!jsonpCallback) {
        self.setDefaultHeaders(req, res);
        if(!error) {
          res.header('Content-Type', 'text/n3');
          res.send(result + '\n');
        }
        else {
          res.header('Content-Type', 'text/plain');
          res.send(error + '\n', 400);
        }
      }
      else {
        res.header('Content-Type', 'application/javascript');
        if(jsonpCallback.match(/^[\w\d-_]+$/i))
          res.send(jsonpCallback + '(' + JSON.stringify(error || result) + ')');
        else
          res.send('alert("Illegal callback name.")', 400);
      }
    });
  },
  
  handleEyeOptionsRequest: function(req, res, next) {
    this.setDefaultHeaders(req, res);
    res.header('Content-Type', 'text/plain');
    res.send('');
  },
  
  setDefaultHeaders: function(req, res) {
    res.header('X-Powered-By', 'EYE Server');
    res.header('Access-Control-Allow-Origin', '*');
  }
}

function proxy(object, method) {
  return function() { method.apply(object, arguments); };
}

module.exports = EyeServer;
