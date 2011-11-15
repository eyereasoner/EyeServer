var vows = require('vows'),
    should = require('should'),
    request = require('request');
var eyeserver = require('../eyeserver.js');

vows.describe('EyeServer').addBatch({
  'The eyeserver module': {
    topic: function() { return eyeserver; },
    
    'should be a function': function (eyeserver) {
      eyeserver.should.be.a('function');
    },
    
    'should make EyeServer objects': function (eyeserver) {
      eyeserver().constructor.should.eql(eyeserver);
    },
    
    'should be an EyeServer constructor': function (eyeserver) {
      new eyeserver().constructor.should.eql(eyeserver);
    }
  },
  
  'An EyeServer instance': {
    topic: function() {
      server = new eyeserver({ eye: eyeDummy, debug: true });
      server.listen(3000);
      return server;
    },
    
    'receiving a request to /':
      respondsWith(200, 'text/n3', 'without data', { data: [], pass: true }),
    
    'receiving a request to /?data=http%3A%2F%2Fex.org%2Ferror':
      respondsWith(400, 'text/plain', 'and receive an error', { data: ['http://ex.org/error'], pass: true }),
    
    'receiving a request to /?data=http%3A%2F%2Fex.org%2F1':
      respondsWith(200, 'text/n3', 'with one URI', { data: ['http://ex.org/1'], pass: true }),
    
    'receiving a request to /?data=http%3A%2F%2Fex.org%2F1,http%3A%2F%2Fex.org%2F2':
      respondsWith(200, 'text/n3', 'with two URIs', { data: ['http://ex.org/1', 'http://ex.org/2'], pass: true }),
    
    'receiving a request to /?data=http%3A%2F%2Fex.org%2F1&data=http%3A%2F%2Fex.org%2F2':
      respondsWith(200, 'text/n3', 'with two URIs', { data: ['http://ex.org/1', 'http://ex.org/2'], pass: true }),
    
    'receiving a request to /?data=http%3A%2F%2Fex.org%2F1&data=http%3A%2F%2Fex.org%2F2,http%3A%2F%2Fex.org%2F3':
      respondsWith(200, 'text/n3', 'with three URIs', { data: ['http://ex.org/1', 'http://ex.org/2', 'http://ex.org/3'], pass: true }),
    
    'receiving a request to /?data=%3Aa%20%3Ab%20%3Ac.':
      respondsWith(200, 'text/n3', 'with N3 data', { data: [':a :b :c.'], pass: true }),
    
    'receiving a request to /?query=http%3A%2F%2Fex.org%2F1':
      respondsWith(200, 'text/n3', 'with a query', { data: [], query: 'http://ex.org/1' }),
  }
}).export(module);

var eyeDummy = {
  execute: function (options, callback) {
    var path = options.originalUrl;
    delete options.originalUrl;
    this.options[path] = options;
    
    if(this.shouldSucceed[path])
      callback(null, 'output');
    else
      callback('error', null);
  },
  options: {},
  shouldSucceed: {}
}

function respondsWith(status, contentType, description, executeArguments, method) {
  if(!method) {
    return {
      'using GET' : respondsWith(status, contentType, description, executeArguments, "GET"),
      'using POST': respondsWith(status, contentType, description, executeArguments, "POST")
    };
  }
  
  var path, shouldSucceed = (status >= 200 && status <= 299);
  var context = {
    topic: function () {
      path = this.context.title.match(/\/[^ ]*/)[0];
      eyeDummy.shouldSucceed[path] = shouldSucceed;
      request({ url: 'http://localhost:3000' + path, method: method }, this.callback);
    }
  };
  
  context['should respond with status ' + status] = function(error, response, body) {
    response.statusCode.should.eql(status);
  }
  
  context['should respond with Content-Type ' + contentType] = function(error, response, body) {
    response.headers.should.have.property('content-type', contentType)
  }
  
  if(shouldSucceed)
    context['should return the Eye output'] = function(error, response, body) {
      body.should.eql('output\n');
    }
  else
    context['should return the Eye error'] = function(error, response, body) {
      body.should.eql('error\n');
    }
  
  context['should execute Eye ' + description] = function (error, response, body) {
    eyeDummy.options[path].should.eql(executeArguments);
  }
  
  return context;
}
